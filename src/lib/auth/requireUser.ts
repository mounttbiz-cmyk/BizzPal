import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/userSession";
import { isUserRegistered } from "@/lib/db";

/**
 * Use at the top of every customer API route:
 *
 *   const auth = requireUser(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.email is the signed-in customer, taken from the signed cookie and nothing else
 */
export function requireUser(req: Request): { email: string } | NextResponse {
  const email = getSessionEmail(req);
  if (!email || !isUserRegistered(email)) {
    return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  }
  return { email };
}
