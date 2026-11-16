import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createInvite, getInviteByToken, inviterBusinessName, listInvites, revokeInvite, ROLES, type Role } from "@/lib/team/invites";
import { maskEmail } from "@/lib/team/decide";
import { rateLimited } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

/**
 * GET ?email=<owner>  : the owner's invites with live status
 * GET ?token=<token>  : public info for the invite page (masked email, role, who invited)
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token");
  if (token) {
    const inv = getInviteByToken(token);
    if (!inv || inv.status === "revoked") return NextResponse.json({ ok: false, error: "This invite link isn't valid any more." }, { status: 404 });
    return NextResponse.json({ ok: true, business: inviterBusinessName(inv.owner_email), role: inv.role, email: maskEmail(inv.invite_email), status: inv.status });
  }
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ invites: listInvites(auth.email) });
}

/** POST { email, inviteEmail, name?, role? } */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = auth.email;
  if (rateLimited(`inv:${owner}`, 60, 3_600_000)) return NextResponse.json({ error: "Too many invites. Please try again later." }, { status: 429 });
  const role: Role = (ROLES as readonly string[]).includes(b?.role) ? b.role : "Operator";
  const r = createInvite(owner, String(b?.inviteEmail || ""), String(b?.name || "").trim(), role);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, invite: r.invite, invites: listInvites(owner) });
}

/** DELETE { email, id } */
export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = auth.email;
  revokeInvite(owner, String(b?.id || ""));
  return NextResponse.json({ ok: true, invites: listInvites(owner) });
}
