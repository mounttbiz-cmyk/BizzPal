import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/platform/audit";
import {
  EMAIL_PRESETS,
  EmailAccountError,
  connectEmailAccount,
  disconnectEmailAccount,
  getEmailAccount,
} from "@/lib/integrations/emailAccount";

export const dynamic = "force-dynamic";

/** The business's own email account for agent emails: status and the common providers. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ success: true, account: getEmailAccount(getUserBusinessId(auth.email)), presets: EMAIL_PRESETS });
}

/** Connect: { host, port, user, password, fromEmail?, fromName? }. Tested before it is saved. Owner only. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can connect email." }, { status: 403 });
  if (!rateLimit(`email-connect:${auth.email}`, 8, 15 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  const businessId = getUserBusinessId(auth.email);
  try {
    const b = await req.json().catch(() => ({}));
    const account = await connectEmailAccount(businessId, b, auth.email);
    recordAudit({ businessId, actor: auth.email, action: "integration.connected", resource: "email", detail: { host: account.host, fromEmail: account.fromEmail } });
    return NextResponse.json({ success: true, account });
  } catch (err: any) {
    if (err instanceof EmailAccountError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    console.error("[email connect]", err?.message);
    return NextResponse.json({ success: false, error: err?.message?.includes("SECRETS_KEY") ? err.message : "Could not connect the email account." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can disconnect email." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  disconnectEmailAccount(businessId);
  recordAudit({ businessId, actor: auth.email, action: "integration.disconnected", resource: "email", detail: {} });
  return NextResponse.json({ success: true });
}
