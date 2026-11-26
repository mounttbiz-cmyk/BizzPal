import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { InboxError, addSandboxMessage } from "@/lib/leads/inbox";

export const dynamic = "force-dynamic";

/**
 * Tests and local development only: puts an email in the test mailbox of an account connected to the test email server
 * (sandbox.example.test). Refused on a production server.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ success: false, error: "Not available." }, { status: 404 });
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const b = await req.json().catch(() => ({}));
  try {
    const uid = addSandboxMessage(getUserBusinessId(auth.email), String(b.raw || ""));
    return NextResponse.json({ success: true, uid });
  } catch (err) {
    if (err instanceof InboxError) return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    return NextResponse.json({ success: false, error: "Could not add it." }, { status: 500 });
  }
}
