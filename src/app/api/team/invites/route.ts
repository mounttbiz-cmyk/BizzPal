import { NextResponse } from "next/server";
import { createInvite, getInviteByToken, inviterBusinessName, listInvites, revokeInvite, ROLES, type Role } from "@/lib/team/invites";
import { maskEmail } from "@/lib/team/decide";
import { cleanEmail, rateLimited } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

const ownerOf = (v: any) => { const e = cleanEmail(typeof v === "string" ? v : ""); return e.includes("@") ? e : ""; };

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
  const owner = ownerOf(u.searchParams.get("email"));
  if (!owner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  return NextResponse.json({ invites: listInvites(owner) });
}

/** POST { email, inviteEmail, name?, role? } */
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = ownerOf(b?.email);
  if (!owner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (rateLimited(`inv:${owner}`, 60, 3_600_000)) return NextResponse.json({ error: "Too many invites. Please try again later." }, { status: 429 });
  const role: Role = (ROLES as readonly string[]).includes(b?.role) ? b.role : "Operator";
  const r = createInvite(owner, String(b?.inviteEmail || ""), String(b?.name || "").trim(), role);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, invite: r.invite, invites: listInvites(owner) });
}

/** DELETE { email, id } */
export async function DELETE(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = ownerOf(b?.email);
  if (!owner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  revokeInvite(owner, String(b?.id || ""));
  return NextResponse.json({ ok: true, invites: listInvites(owner) });
}
