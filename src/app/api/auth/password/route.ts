import { NextResponse } from "next/server";
import { getUserPasswordHash, setUserPasswordHash } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/requireUser";
import { clearFailures, recordFailure, tooManyFailures } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Change your own password: POST { currentPassword?, newPassword } */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const pwError = validatePassword(body?.newPassword);
  if (pwError) return NextResponse.json({ success: false, error: pwError }, { status: 400 });

  const key = `pw-change-fail:${auth.email}`;
  if (tooManyFailures(key, 6)) {
    return NextResponse.json({ success: false, error: "Too many wrong attempts. Please try again later." }, { status: 429 });
  }

  const existing = getUserPasswordHash(auth.email);
  if (existing && !verifyPassword(String(body?.currentPassword || ""), existing)) {
    recordFailure(key, 15 * 60 * 1000);
    return NextResponse.json({ success: false, error: "Your current password is not correct." }, { status: 403 });
  }
  clearFailures(key);
  setUserPasswordHash(auth.email, hashPassword(String(body.newPassword)));
  return NextResponse.json({ success: true });
}
