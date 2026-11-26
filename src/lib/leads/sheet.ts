import * as XLSX from "xlsx";
import { fetchGoogleDriveFile, getGoogleDriveToken } from "@/lib/integrations/googleDrive";
import { businessEvent } from "@/lib/agents/schedule";
import { addLead, describeLead, updateSource, type LeadSource } from "./store";

/**
 * A Google Sheet of leads. The owner picks the sheet with Google's own picker and says which column holds what; new
 * rows become leads. A row is recognised by its contents, so sorting the sheet never adds anyone twice.
 */

export const LEAD_FIELDS = ["name", "email", "phone", "company", "message"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];
export type Mapping = Partial<Record<LeadField, string>>;

export class SheetError extends Error {}

/** The sheet's rows as header -> value, from Google Drive. */
export async function readSheet(businessId: string, fileId: string, mimeType = "application/vnd.google-apps.spreadsheet"): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const token = await getGoogleDriveToken(businessId);
  if (!token.connected || !token.accessToken) throw new SheetError("Google Drive is not connected. Connect it on the Integrations page first.");
  let content: string;
  try {
    content = (await fetchGoogleDriveFile(token.accessToken, fileId, mimeType, "leads")).content;
  } catch {
    throw new SheetError("Could not open that sheet. Pick it again, or check it was not deleted.");
  }
  const wb = XLSX.read(content, { type: "string", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const table = (sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) : []) as unknown[][];
  const headerIndex = table.findIndex(r => r.filter(c => String(c).trim()).length >= 2);
  if (headerIndex < 0) throw new SheetError("The sheet looks empty. It needs a header row (for example Name, Email, Phone) and at least one lead.");
  const headers = table[headerIndex].map((h, i) => String(h).trim() || `Column ${i + 1}`);
  const rows = table
    .slice(headerIndex + 1)
    .filter(r => r.some(c => String(c).trim()))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])));
  return { headers, rows };
}

/** Suggests which column holds what, from the header names. The owner confirms it. */
export function guessMapping(headers: string[]): Mapping {
  const find = (re: RegExp) => headers.find(h => re.test(h.toLowerCase()));
  return {
    name: find(/^(full ?)?name$|contact|customer|lead|person/) || find(/name/),
    email: find(/e-?mail/),
    phone: find(/phone|mobile|whatsapp|contact no|number/),
    company: find(/company|business|organi[sz]ation|firm|brand/),
    message: find(/message|note|requirement|comment|enquiry|inquiry|query|details/),
  };
}

const keyOf = (row: Record<string, string>, m: Mapping) =>
  [m.email && row[m.email], m.phone && row[m.phone], m.name && row[m.name], m.company && row[m.company]]
    .map(v => String(v || "").trim().toLowerCase())
    .join("|");

/**
 * Reads the sheet and adds new rows as leads. On the first sync (backfill) the existing rows are added quietly; after
 * that, each new lead can start agents set to react to new leads.
 */
export async function syncSheet(businessId: string, source: LeadSource): Promise<{ added: number; total: number }> {
  const m: Mapping = source.config.mapping || {};
  if (!m.name && !m.email && !m.phone) throw new SheetError("Choose at least the name, email or phone column.");
  try {
    const { rows } = await readSheet(businessId, source.config.fileId, source.config.mimeType);
    const backfill = !source.state.synced;
    let added = 0;
    for (const row of rows) {
      const key = keyOf(row, m);
      if (!key.replace(/\|/g, "")) continue;
      const lead = addLead(businessId, source, "lead", key, {
        name: m.name ? row[m.name] : undefined,
        email: m.email ? row[m.email] : undefined,
        phone: m.phone ? row[m.phone] : undefined,
        company: m.company ? row[m.company] : undefined,
        message: m.message ? row[m.message] : undefined,
      });
      if (lead) {
        added++;
        if (!backfill) businessEvent(businessId, "new_lead", describeLead(lead));
      }
    }
    updateSource(businessId, source.id, { state: { ...source.state, synced: true, rows: rows.length }, lastSyncedAt: new Date().toISOString(), lastError: null });
    return { added, total: rows.length };
  } catch (err) {
    updateSource(businessId, source.id, { lastError: (err as Error).message.slice(0, 300), lastSyncedAt: new Date().toISOString() });
    throw err;
  }
}
