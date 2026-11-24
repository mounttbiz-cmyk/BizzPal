import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createInvite, getInviteByToken, inviterBusinessName, listInvites, revokeInvite, setInviteRole, ROLES, type Role } from "@/lib/team/invites";
import { addTeamAuditLog, getGroupBusinessId } from "@/lib/db";
import { maskEmail } from "@/lib/team/decide";
import { rateLimited } from "@/lib/verification/store";
import { appBaseUrl, emailTemplate, mailConfigured, sendMail } from "@/lib/mail";

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

  // Email the invite link. If email isn't set up, the owner still has the link to share by hand.
  const link = `${appBaseUrl(req)}${r.invite.link}`;
  const business = inviterBusinessName(owner);
  const mail = emailTemplate({
    heading: `You're invited to join ${business} on BizzPal`,
    paragraphs: [
      `${business} has invited you to their BizzPal workspace as ${r.invite.role}.`,
      "Open the link and confirm your work email with Google to accept.",
    ],
    buttonLabel: "Accept the invite",
    buttonUrl: link,
  });
  const sent = await sendMail({ to: r.invite.email, subject: `${business} invited you to BizzPal`, text: mail.text, html: mail.html });
  addTeamAuditLog({ businessId: getGroupBusinessId(owner), action: `Invited ${r.invite.email} as ${r.invite.role}`, userName: owner });
  return NextResponse.json({ ok: true, invite: r.invite, invites: listInvites(owner), emailed: sent.ok, emailConfigured: mailConfigured() });
}

/** DELETE { email, id } */
export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = auth.email;
  const target = listInvites(owner).find(i => i.id === String(b?.id || ""));
  revokeInvite(owner, String(b?.id || ""));
  if (target) addTeamAuditLog({ businessId: getGroupBusinessId(owner), action: `Removed ${target.email} from the team`, userName: owner });
  return NextResponse.json({ ok: true, invites: listInvites(owner) });
}

/** PUT { id, role } changes a teammate's role. PUT { id, resend: true } emails the invite again. */
export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const owner = auth.email;
  const id = String(b?.id || "");
  const target = listInvites(owner).find(i => i.id === id);
  if (!target) return NextResponse.json({ ok: false, error: "That invite no longer exists." }, { status: 404 });

  if (b?.resend) {
    if (target.status !== "invited") return NextResponse.json({ ok: false, error: "This person has already joined." }, { status: 400 });
    if (rateLimited(`inv-resend:${owner}`, 20, 3_600_000)) return NextResponse.json({ ok: false, error: "Too many emails. Please try again later." }, { status: 429 });
    const business = inviterBusinessName(owner);
    const mail = emailTemplate({
      heading: `You're invited to join ${business} on BizzPal`,
      paragraphs: [`${business} has invited you to their BizzPal workspace as ${target.role}.`, "Open the link and confirm your work email with Google to accept."],
      buttonLabel: "Accept the invite",
      buttonUrl: `${appBaseUrl(req)}${target.link}`,
    });
    const sent = await sendMail({ to: target.email, subject: `${business} invited you to BizzPal`, text: mail.text, html: mail.html });
    return NextResponse.json({ ok: true, emailed: sent.ok, emailConfigured: mailConfigured() });
  }

  if (!(ROLES as readonly string[]).includes(b?.role)) return NextResponse.json({ ok: false, error: "Unknown role." }, { status: 400 });
  setInviteRole(owner, id, b.role as Role);
  addTeamAuditLog({ businessId: getGroupBusinessId(owner), action: `Changed ${target.email} from ${target.role} to ${b.role}`, userName: owner });
  return NextResponse.json({ ok: true, invites: listInvites(owner) });
}
