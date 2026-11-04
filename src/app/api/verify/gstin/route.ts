import { NextResponse } from "next/server";
import { checkGstin } from "@/lib/verification/gstin";
import { lookupGstin, registryConfigured } from "@/lib/verification/registry";
import { cleanEmail, computeLevel, rateLimited, saveVerification } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

/** GET: is the registry check wired up on this server? (lets the UI explain itself honestly) */
export async function GET() {
  return NextResponse.json({ registryConfigured: registryConfigured() });
}

/**
 * POST { email, gstin }
 * 1. Structure + check-digit validation (always).
 * 2. GST registry lookup through the configured provider (when available).
 * "verified" is only ever written when the registry itself confirms an ACTIVE registration.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = cleanEmail(body?.email);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please sign in again, then retry." }, { status: 401 });
  }
  if (rateLimited(`gst-ip:${clientIp(req)}`, 30, 3_600_000) || rateLimited(`gst-em:${email}`, 12, 3_600_000)) {
    return NextResponse.json({ error: "Too many verification attempts. Please try again in a while." }, { status: 429 });
  }

  const format = checkGstin(String(body?.gstin || ""));
  if (!format.valid) {
    return NextResponse.json({ ok: false, stage: "format", reason: format.reason }, { status: 400 });
  }

  const result = await lookupGstin(format.gstin);

  if (result.status === "verified") {
    const active = /^active$/i.test(result.record.status);
    saveVerification(email, "gstin", format.gstin, {
      status: active ? "verified" : "failed",
      evidence: { format, record: result.record, provider: result.provider, checkedAt: new Date().toISOString() },
    });
    if (!active) {
      return NextResponse.json({
        ok: false,
        stage: "registry",
        reason: `This GSTIN is registered but its status is "${result.record.status || "unknown"}", not Active.`,
        record: result.record,
      }, { status: 422 });
    }
    return NextResponse.json({ ok: true, stage: "registry", format, record: result.record, level: computeLevel(email).level });
  }

  if (result.status === "not_found") {
    saveVerification(email, "gstin", format.gstin, { status: "failed", evidence: { format, notFound: true } });
    return NextResponse.json({
      ok: false,
      stage: "registry",
      reason: "The GST registry has no record of this GSTIN. Check the number and try again.",
    }, { status: 404 });
  }

  // Registry not reachable / not configured: the number is well-formed but NOT verified.
  saveVerification(email, "gstin", format.gstin, { status: "unverified", evidence: { format, unavailableReason: result.reason } });
  return NextResponse.json({
    ok: false,
    stage: "registry_unavailable",
    format,
    reason: result.reason,
    registryConfigured: registryConfigured(),
  }, { status: 503 });
}
