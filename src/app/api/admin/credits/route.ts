import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addCredits, walletBalance, WalletError } from "@/lib/platform/wallet";

export const dynamic = "force-dynamic";

/**
 * Platform admin only (the /api/admin middleware checks the admin session): add credits to a customer's wallet,
 * for example for a pilot. Customer top-ups by payment come through the payment flow instead.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = String(b?.email || "").trim().toLowerCase();
  const credits = Number(b?.credits);
  const note = String(b?.note || "").trim().slice(0, 200);
  if (!email || !Number.isFinite(credits)) return NextResponse.json({ success: false, error: "Give an email and a number of credits." }, { status: 400 });
  const user = db.prepare("SELECT email FROM registered_users WHERE LOWER(email) = ?").get(email);
  if (!user) return NextResponse.json({ success: false, error: "No account with that email." }, { status: 404 });
  const walletBusinessId = `biz_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  try {
    const r = addCredits(walletBusinessId, credits, { type: "grant", actor: "platform-admin", note: note || "Granted by BizzPal", reference: typeof b?.reference === "string" ? b.reference.slice(0, 100) : undefined });
    return NextResponse.json({ success: true, entry: r.id, wallet: walletBalance(walletBusinessId) });
  } catch (err) {
    if (err instanceof WalletError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    throw err;
  }
}
