import { NextResponse } from "next/server";
import { getRegisteredUser, setUserPasswordHash } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

/** Admin only (the middleware requires the admin session for everything under /api/admin). Sets a new password for a customer. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const pwError = validatePassword(body?.newPassword);
  if (!email) return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
  if (pwError) return NextResponse.json({ success: false, error: pwError }, { status: 400 });
  if (!getRegisteredUser(email)) return NextResponse.json({ success: false, error: "No account with that email." }, { status: 404 });

  setUserPasswordHash(email, hashPassword(String(body.newPassword)));
  return NextResponse.json({ success: true, message: `New password set for ${email}.` });
}
