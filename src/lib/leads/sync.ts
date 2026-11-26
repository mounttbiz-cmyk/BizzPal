import { db } from "@/lib/db";
import { getSource, type LeadSource } from "./store";
import { syncSheet } from "./sheet";
import { syncInbox } from "./inbox";

/** Checks one source for new leads or enquiries. */
export async function syncSource(businessId: string, source: LeadSource): Promise<{ added: number }> {
  if (source.kind === "google_sheet") return syncSheet(businessId, source);
  return syncInbox(businessId, source);
}

let running = false;

/** Called by the background scheduler: checks every switched-on source, one at a time. */
export async function syncAllSources(): Promise<number> {
  if (running) return 0;
  running = true;
  let added = 0;
  try {
    const rows = db.prepare("SELECT id, business_id FROM lead_sources WHERE enabled = 1").all() as any[];
    for (const r of rows) {
      const src = getSource(r.business_id, r.id);
      if (!src) continue;
      try {
        added += (await syncSource(r.business_id, src)).added;
      } catch {
        // The reason is saved on the source and shown to the owner
      }
    }
  } catch {}
  running = false;
  return added;
}
