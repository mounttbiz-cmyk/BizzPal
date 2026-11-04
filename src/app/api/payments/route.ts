import { NextResponse } from "next/server";
import { secretsConfigured } from "@/lib/secrets";
import { ProviderError, syncRazorpay, syncStripe, type Provider } from "@/lib/payments/providers";
import { deletePaymentSource, getPaymentSecret, listPaymentSources, savePaymentSource, totalRevenue, updateSnapshot } from "@/lib/payments/store";
import { cleanEmail, rateLimited } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
const isProvider = (p: any): p is Provider => p === "razorpay" || p === "stripe";
const mask = (s: string) => `${s.slice(0, s.lastIndexOf("_") + 1)}••••${s.slice(-4)}`;

function errorResponse(e: unknown) {
  if (e instanceof ProviderError) {
    const status = e.err.code === "invalid_credentials" ? 401 : e.err.code === "no_permission" ? 403 : e.err.code === "bad_input" ? 400 : 503;
    return NextResponse.json({ ok: false, code: e.err.code, error: e.err.message }, { status });
  }
  return NextResponse.json({ ok: false, code: "unavailable", error: "Something went wrong. Please try again." }, { status: 500 });
}

const emailOf = (v: any) => { const e = cleanEmail(typeof v === "string" ? v : ""); return e.includes("@") ? e : ""; };

/** GET ?email= : connected sources and the combined real revenue. Never returns credentials. */
export async function GET(req: Request) {
  const email = emailOf(new URL(req.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  return NextResponse.json({ sources: listPaymentSources(email), total: totalRevenue(email), secretsConfigured: secretsConfigured() });
}

/** POST { email, provider, keyId?, keySecret?, apiKey? } : verify the key against the provider, pull real revenue, store the key encrypted. */
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = emailOf(b?.email);
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!isProvider(b?.provider)) return NextResponse.json({ error: "Unknown payment provider." }, { status: 400 });
  if (rateLimited(`pay-ip:${clientIp(req)}`, 30, 3_600_000) || rateLimited(`pay-em:${email}`, 12, 3_600_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a while." }, { status: 429 });
  }
  if (!secretsConfigured()) {
    return NextResponse.json({ ok: false, code: "unavailable", error: "Secure storage for payment keys isn't set up on this server yet, so we can't connect it." }, { status: 503 });
  }

  const provider: Provider = b.provider;
  const keyId = String(b.keyId || "").trim();
  const secret = String(provider === "razorpay" ? b.keySecret || "" : b.apiKey || "").trim();
  // The key itself says whether it's a test key. Refuse before calling the provider: test payments aren't real money.
  if ((provider === "razorpay" && keyId.startsWith("rzp_test_")) || (provider === "stripe" && /^(sk|rk)_test_/.test(secret))) {
    return NextResponse.json({
      ok: false, code: "test_mode",
      error: "This is a test-mode key. Test payments aren't real money, so we can't use them. Please use your live key.",
    }, { status: 422 });
  }
  try {
    const snap = provider === "razorpay" ? await syncRazorpay(keyId, secret) : await syncStripe(secret);
    if (snap.mode === "test") {
      return NextResponse.json({
        ok: false, code: "test_mode",
        error: "This is a test-mode key. Test payments aren't real money, so we can't use them. Please use your live key.",
      }, { status: 422 });
    }
    // Razorpay needs both parts to call the API again later, so keep "id:secret" together (encrypted).
    const stored = provider === "razorpay" ? `${keyId}:${secret}` : secret;
    savePaymentSource(email, provider, stored, mask(provider === "razorpay" ? keyId : secret), snap, "connected");
    return NextResponse.json({ ok: true, sources: listPaymentSources(email), total: totalRevenue(email) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** PATCH { email, provider } : re-pull revenue with the stored key. */
export async function PATCH(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = emailOf(b?.email);
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!isProvider(b?.provider)) return NextResponse.json({ error: "Unknown payment provider." }, { status: 400 });
  if (rateLimited(`pay-sync:${email}`, 30, 3_600_000)) return NextResponse.json({ error: "Syncing too often. Try again later." }, { status: 429 });

  const stored = getPaymentSecret(email, b.provider);
  if (!stored) return NextResponse.json({ error: "This source isn't connected." }, { status: 404 });
  try {
    const snap = b.provider === "razorpay"
      ? await syncRazorpay(stored.slice(0, stored.indexOf(":")), stored.slice(stored.indexOf(":") + 1))
      : await syncStripe(stored);
    updateSnapshot(email, b.provider, snap);
    return NextResponse.json({ ok: true, sources: listPaymentSources(email), total: totalRevenue(email) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE { email, provider } : remove the source and its stored key. */
export async function DELETE(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = emailOf(b?.email);
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!isProvider(b?.provider)) return NextResponse.json({ error: "Unknown payment provider." }, { status: 400 });
  deletePaymentSource(email, b.provider);
  return NextResponse.json({ ok: true, sources: listPaymentSources(email), total: totalRevenue(email) });
}
