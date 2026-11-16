import { NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/userSession";
import { getTeamMembership, isUserRegistered } from "@/lib/db";
import { checkTeamAccess } from "@/lib/team/access";

export interface AuthUser {
  /** The signed-in person (from the signed cookie and nothing else) */
  email: string;
  /** "Owner" for someone working in their own business, otherwise their team role */
  role: string;
  isOwner: boolean;
}

/**
 * Use at the top of every customer API route:
 *
 *   const auth = requireUser(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const tenantId = getUserBusinessId(auth.email);   // the owner's business for teammates
 *
 * Teammates are checked against the owner's permissions table here, so every route is covered.
 */
export function requireUser(req: Request): AuthUser | NextResponse {
  const session = getSessionInfo(req);
  if (!session || !isUserRegistered(session.email)) {
    return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  }
  const email = session.email;

  const membership = getTeamMembership(email);
  if (!membership) return { email, role: "Owner", isOwner: true };

  // A sign-in from before the person accepted the invite cannot open the owner's workspace.
  if (session.issuedAt < membership.verifiedAtSec) {
    return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  }
  const ownerBusinessId = `biz_${membership.ownerEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const denied = checkTeamAccess(req, membership, ownerBusinessId);
  if (denied) return denied;
  return { email, role: membership.role, isOwner: false };
}
