import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { cleanEmail, computeLevel, ensureVerificationSchema } from "@/lib/verification/store";
import { emailMatchesDomain } from "@/lib/verification/domain";
import { decideAcceptance, type AcceptDecision } from "./decide";

export const ROLES = ["Executive", "Manager", "Operator"] as const;
export type Role = (typeof ROLES)[number];

export interface InviteView {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "invited" | "verified";
  link: string;
  sameDomain: boolean | null; // null when no website has been verified to compare against
  createdAt: string;
  verifiedAt: string | null;
}

const MAX_INVITES = 100;

export function listInvites(owner: string): InviteView[] {
  ensureVerificationSchema();
  const o = cleanEmail(owner);
  const domain = computeLevel(o).domain?.subject || null;
  const rows = db.prepare("SELECT * FROM team_invites WHERE owner_email = ? AND status <> 'revoked' ORDER BY created_at").all(o) as any[];
  return rows.map((r) => ({
    id: r.id, email: r.invite_email, name: r.name || "", role: r.role, status: r.status,
    link: `/join/${r.token}`,
    sameDomain: domain ? emailMatchesDomain(r.invite_email, domain) : null,
    createdAt: r.created_at, verifiedAt: r.verified_at,
  }));
}

export function createInvite(owner: string, inviteEmail: string, name: string, role: Role): { ok: true; invite: InviteView } | { ok: false; error: string } {
  ensureVerificationSchema();
  const o = cleanEmail(owner);
  const e = cleanEmail(inviteEmail);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e)) return { ok: false, error: "That doesn't look like a valid email address." };
  if (e === o) return { ok: false, error: "That's your own email. You're already on the team." };
  const count = (db.prepare("SELECT COUNT(*) c FROM team_invites WHERE owner_email = ? AND status <> 'revoked'").get(o) as any)?.c || 0;
  if (count >= MAX_INVITES) return { ok: false, error: "You've reached the invite limit." };

  const existing = db.prepare("SELECT id, status FROM team_invites WHERE owner_email = ? AND invite_email = ?").get(o, e) as any;
  if (existing && existing.status !== "revoked") return { ok: false, error: "This person has already been invited." };
  const token = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  if (existing) {
    db.prepare("UPDATE team_invites SET status = 'invited', token = ?, name = ?, role = ?, created_at = ?, verified_at = NULL, verified_via = NULL WHERE id = ?")
      .run(token, name.slice(0, 80), role, now, existing.id);
  } else {
    db.prepare("INSERT INTO team_invites (id, owner_email, invite_email, name, role, token, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'invited', ?)")
      .run(randomUUID(), o, e, name.slice(0, 80), role, token, now);
  }
  const invite = listInvites(o).find((i) => i.email === e)!;
  return { ok: true, invite };
}

export function revokeInvite(owner: string, id: string): void {
  ensureVerificationSchema();
  db.prepare("UPDATE team_invites SET status = 'revoked' WHERE id = ? AND owner_email = ?").run(id, cleanEmail(owner));
}

export function getInviteByToken(token: string): any | null {
  ensureVerificationSchema();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token || "")) return null;
  return (db.prepare("SELECT * FROM team_invites WHERE token = ?").get(token) as any) || null;
}

/** Called ONLY with an email that Google has confirmed for the signed-in person. */
export function acceptInvite(token: string, googleEmail: string, googleEmailVerified: boolean): { decision: AcceptDecision; invite: any | null } {
  const invite = getInviteByToken(token);
  const decision = decideAcceptance(invite, googleEmail, googleEmailVerified);
  if (decision === "ok") {
    db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE id = ?")
      .run(new Date().toISOString(), invite.id);
  }
  return { decision, invite };
}

export function verifiedCount(owner: string): number {
  ensureVerificationSchema();
  return (db.prepare("SELECT COUNT(*) c FROM team_invites WHERE owner_email = ? AND status = 'verified'").get(cleanEmail(owner)) as any)?.c || 0;
}

export function inviterBusinessName(ownerEmail: string): string {
  const rec = computeLevel(ownerEmail).gstin?.evidence?.record;
  return rec?.tradeName || rec?.legalName || "a BizzPal business";
}
