import { NextResponse } from "next/server";
import { getSessionEmail, sessionClearCookie } from "@/lib/userSession";
import { getGroupBusinessId, getRegisteredUser, getTeamMembership, getUserBusinessId } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Who am I? Used by the app to find out whether the browser still has a valid sign-in. */
export async function GET(req: Request) {
  const email = getSessionEmail(req);
  const user = email ? getRegisteredUser(email) : null;
  if (!email || !user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const membership = getTeamMembership(email);
  const activeId = getUserBusinessId(email);
  return NextResponse.json({
    authenticated: true,
    email,
    name: user.name || email.split("@")[0],
    provider: user.provider || "email",
    // The role comes from the server, never from the browser
    role: membership ? membership.role : "Owner",
    isOwner: !membership,
    // The group company this person switched to, or null while they work in their own (or the owner's) business
    activeBusinessId: activeId !== getGroupBusinessId(email) ? activeId : null,
  });
}

/** Sign out. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", sessionClearCookie(req));
  return res;
}
