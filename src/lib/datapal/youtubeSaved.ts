import { db } from "@/lib/db";

/**
 * A business's shortlist of creators, with a status and a note for each. Only the channel ID, the status and the
 * note are kept. The channel's details are fetched fresh when the list is opened, because YouTube's rules do not
 * allow keeping its data for long.
 */

export const STATUSES = ["new", "contacted", "replied", "deal", "not_interested"] as const;
export type SavedStatus = (typeof STATUSES)[number];

export interface SavedChannel {
  channelId: string;
  status: SavedStatus;
  note: string;
  savedAt: string;
}

const MAX_SAVED = 200;
let ready = false;
function ensureSchema() {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_saved (
      business_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      note TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL,
      PRIMARY KEY (business_id, channel_id)
    );
  `);
  ready = true;
}

export function listSaved(businessId: string): SavedChannel[] {
  ensureSchema();
  return (db.prepare("SELECT channel_id, status, note, saved_at FROM youtube_saved WHERE business_id = ? ORDER BY saved_at DESC").all(businessId) as any[]).map(r => ({
    channelId: r.channel_id, status: r.status, note: r.note, savedAt: r.saved_at,
  }));
}

export function saveChannel(businessId: string, channelId: string, status: SavedStatus, note: string): { ok: true } | { ok: false; error: string } {
  ensureSchema();
  const existing = db.prepare("SELECT 1 FROM youtube_saved WHERE business_id = ? AND channel_id = ?").get(businessId, channelId);
  if (!existing) {
    const count = (db.prepare("SELECT COUNT(*) c FROM youtube_saved WHERE business_id = ?").get(businessId) as any).c;
    if (count >= MAX_SAVED) return { ok: false, error: `You can keep up to ${MAX_SAVED} saved channels. Remove some first.` };
  }
  db.prepare(`INSERT INTO youtube_saved (business_id, channel_id, status, note, saved_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(business_id, channel_id) DO UPDATE SET status = excluded.status, note = excluded.note`)
    .run(businessId, channelId, status, note.slice(0, 500), new Date().toISOString());
  return { ok: true };
}

export function removeSaved(businessId: string, channelId: string) {
  ensureSchema();
  db.prepare("DELETE FROM youtube_saved WHERE business_id = ? AND channel_id = ?").run(businessId, channelId);
}
