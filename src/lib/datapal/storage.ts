import { DataPalApiSettings, DataPalBusinessLead, DataPalSearchCampaign, DataPalSearchConfig } from "./types";
import {
  getSeenLeadSignatures,
  makeLeadSignature,
  recordSeenLeadSignatures,
} from "./credits";

export function getCampaignsStorageKey(): string {
  if (typeof window === "undefined") return "bizzpal_datapal_campaigns";
  try {
    const raw = localStorage.getItem("bizzpal_user_session");
    if (raw) {
      const sess = JSON.parse(raw);
      if (sess?.email) {
        return `bizzpal_datapal_campaigns_${sess.email.trim().toLowerCase()}`;
      }
      if (sess?.id) {
        return `bizzpal_datapal_campaigns_${sess.id}`;
      }
    }
  } catch (e) {}
  return "bizzpal_datapal_campaigns_guest";
}

const STORAGE_KEY_SETTINGS = "bizzpal_datapal_settings";

export function getStoredCampaigns(): DataPalSearchCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getCampaignsStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveCampaign(campaign: DataPalSearchCampaign): DataPalSearchCampaign[] {
  if (typeof window === "undefined") return [];
  const current = getStoredCampaigns();
  const existingIdx = current.findIndex(c => c.id === campaign.id);
  let updated: DataPalSearchCampaign[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = campaign;
  } else {
    updated = [campaign, ...current];
  }
  try {
    localStorage.setItem(getCampaignsStorageKey(), JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteCampaign(campaignId: string): DataPalSearchCampaign[] {
  if (typeof window === "undefined") return [];
  const current = getStoredCampaigns();
  const updated = current.filter(c => c.id !== campaignId);
  try {
    localStorage.setItem(getCampaignsStorageKey(), JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getStoredApiSettings(): DataPalApiSettings {
  const fallback: DataPalApiSettings = {
    apiKey: "",
    apiEndpoint: "https://data-pal.vercel.app/api",
    googlePlacesApiKey: "",
    isLiveConnected: false,
    remainingCredits: 2500,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function saveApiSettings(settings: Partial<DataPalApiSettings>): DataPalApiSettings {
  const current = getStoredApiSettings();
  const updated: DataPalApiSettings = {
    ...current,
    ...settings,
    isLiveConnected: Boolean(
      (settings.apiKey && settings.apiKey.trim().length > 6) ||
      (settings.googlePlacesApiKey && settings.googlePlacesApiKey.trim().length > 6)
    ),
    lastConnectedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

/**
 * Pushes a list of extracted leads directly into BizzPal's task / execution store
 */
export async function pushLeadsToBizzPalTasks(leads: DataPalBusinessLead[]): Promise<{ count: number; success: boolean }> {
  try {
    for (const lead of leads) {
      const taskData = {
        title: `Outreach to ${lead.name} (${lead.category})`,
        description: `Source: DataPal Extraction (${lead.source}). Phone: ${lead.phone || "N/A"}. Email: ${lead.email || "N/A"}. Address: ${lead.address}, ${lead.city}.\n\nAI Opportunity Note: ${lead.notes || "None"}`,
        priority: lead.opportunityLevel === "Critical" ? "urgent" : lead.opportunityLevel === "High" ? "high" : "medium",
        category: "growth",
        status: "todo",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      };

      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
    }
    return { count: leads.length, success: true };
  } catch (err) {
    console.error("Error pushing leads to tasks:", err);
    return { count: 0, success: false };
  }
}


/**
 * Applies the user's choice about records they have extracted before.
 * "New only" drops anything already seen by this account; "include old" keeps everything.
 * Either way the records are remembered so later searches can tell them apart.
 */
export function applyDuplicatePolicy(
  campaign: DataPalSearchCampaign,
  includePrevious: boolean,
  accountKey?: string
): DataPalSearchCampaign {
  const seen = getSeenLeadSignatures(accountKey);
  const kept: DataPalBusinessLead[] = [];
  const signatures: string[] = [];
  let removed = 0;

  for (const lead of campaign.results) {
    const sig = makeLeadSignature({ name: lead.name, city: lead.city, phone: lead.phone, website: lead.website });
    if (!includePrevious && seen.has(sig)) {
      removed++;
      continue;
    }
    seen.add(sig);
    signatures.push(sig);
    kept.push(lead);
  }

  recordSeenLeadSignatures(signatures, accountKey);

  return {
    ...campaign,
    results: kept,
    totalExtracted: kept.length,
    phoneCount: kept.filter(l => l.phone).length,
    emailCount: kept.filter(l => l.email).length,
    websiteCount: kept.filter(l => l.website).length,
    opportunityCount: kept.filter(l => l.opportunityLevel === "Critical" || l.opportunityLevel === "High").length,
    includesPreviousRecords: includePrevious,
    duplicatesRemoved: removed,
  };
}


/**
 * Older versions of DataPal filled searches with generated businesses (made-up names, phones and
 * addresses). Real records always come from Google Maps or OpenStreetMap, whose ids start with
 * "gplace_" or "osm_". This removes everything else from the browser's saved searches.
 * Returns how many records were removed.
 */
export function purgeFakeRecords(): number {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("bizzpal_datapal_campaigns")) continue;
      let list: DataPalSearchCampaign[];
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed)) continue;
        list = parsed;
      } catch {
        continue;
      }
      let changed = false;
      const cleaned: DataPalSearchCampaign[] = [];
      for (const camp of list) {
        const results = Array.isArray(camp.results) ? camp.results : [];
        const real = results.filter(l => /^(gplace_|osm_)/.test(String(l.id)));
        if (real.length !== results.length) {
          removed += results.length - real.length;
          changed = true;
        }
        if (real.length > 0) {
          cleaned.push(
            real.length === results.length
              ? camp
              : {
                  ...camp,
                  results: real,
                  totalExtracted: real.length,
                  phoneCount: real.filter(l => l.phone).length,
                  emailCount: real.filter(l => l.email).length,
                  websiteCount: real.filter(l => l.website).length,
                  opportunityCount: real.filter(l => l.opportunityLevel === "Critical" || l.opportunityLevel === "High").length,
                }
          );
        } else {
          changed = true;
        }
      }
      if (changed) localStorage.setItem(key, JSON.stringify(cleaned));
    }
    // The "already extracted" fingerprints were built from made-up records too
    if (removed > 0) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("bizzpal_datapal_seen_leads_")) localStorage.removeItem(key);
      }
    }
  } catch {}
  return removed;
}
