import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { cleanEmail, ensureVerificationSchema } from "@/lib/verification/store";
import type { Provider, RevenueSnapshot } from "./providers";

export interface PaymentSourceView {
  provider: Provider;
  status: "connected" | "test_mode";
  label: string;
  snapshot: RevenueSnapshot | null;
  connectedAt: string;
  syncedAt: string | null;
}

const view = (r: any): PaymentSourceView => {
  let snapshot: RevenueSnapshot | null = null;
  try { snapshot = r.snapshot ? JSON.parse(r.snapshot) : null; } catch {}
  return { provider: r.provider, status: r.status, label: r.label || "", snapshot, connectedAt: r.connected_at, syncedAt: r.synced_at };
};

/** Never returns credentials. */
export function listPaymentSources(email: string): PaymentSourceView[] {
  ensureVerificationSchema();
  return (db.prepare("SELECT * FROM payment_sources WHERE email = ? ORDER BY connected_at").all(cleanEmail(email)) as any[]).map(view);
}

export function savePaymentSource(email: string, provider: Provider, secret: string, label: string, snapshot: RevenueSnapshot, status: "connected" | "test_mode"): void {
  ensureVerificationSchema();
  const e = cleanEmail(email);
  const now = new Date().toISOString();
  const enc = encryptSecret(secret);
  const exists = db.prepare("SELECT id FROM payment_sources WHERE email = ? AND provider = ?").get(e, provider) as any;
  if (exists) {
    db.prepare("UPDATE payment_sources SET status = ?, cred_enc = ?, label = ?, snapshot = ?, synced_at = ? WHERE id = ?")
      .run(status, enc, label, JSON.stringify(snapshot), now, exists.id);
  } else {
    db.prepare("INSERT INTO payment_sources (id, email, provider, status, cred_enc, label, snapshot, connected_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), e, provider, status, enc, label, JSON.stringify(snapshot), now, now);
  }
}

export function updateSnapshot(email: string, provider: Provider, snapshot: RevenueSnapshot): void {
  ensureVerificationSchema();
  db.prepare("UPDATE payment_sources SET snapshot = ?, synced_at = ? WHERE email = ? AND provider = ?")
    .run(JSON.stringify(snapshot), new Date().toISOString(), cleanEmail(email), provider);
}

/** Decrypts the stored credential. Server-side only. */
export function getPaymentSecret(email: string, provider: Provider): string | null {
  ensureVerificationSchema();
  const r = db.prepare("SELECT cred_enc FROM payment_sources WHERE email = ? AND provider = ?").get(cleanEmail(email), provider) as any;
  if (!r) return null;
  try { return decryptSecret(r.cred_enc); } catch { return null; }
}

export function deletePaymentSource(email: string, provider: Provider): void {
  ensureVerificationSchema();
  db.prepare("DELETE FROM payment_sources WHERE email = ? AND provider = ?").run(cleanEmail(email), provider);
}

/** Total real revenue across live sources (last 30 days, INR). null if no live source is connected. */
export function totalRevenue(email: string): { revenueInr: number; sources: Provider[]; asOf: string } | null {
  const live = listPaymentSources(email).filter((s) => s.status === "connected" && s.snapshot);
  if (!live.length) return null;
  return {
    revenueInr: Math.round(live.reduce((a, s) => a + (s.snapshot?.revenueInr || 0), 0) * 100) / 100,
    sources: live.map((s) => s.provider),
    asOf: live.map((s) => s.snapshot!.syncedAt).sort().slice(-1)[0],
  };
}
