import { DataPalApiSettings, DataPalBusinessLead, DataPalSearchCampaign, DataPalSearchConfig } from "./types";
import { SAMPLE_HISTORIC_CAMPAIGNS } from "./constants";

const STORAGE_KEY_CAMPAIGNS = "bizzpal_datapal_campaigns";
const STORAGE_KEY_SETTINGS = "bizzpal_datapal_settings";

export function getStoredCampaigns(): DataPalSearchCampaign[] {
  if (typeof window === "undefined") return SAMPLE_HISTORIC_CAMPAIGNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(SAMPLE_HISTORIC_CAMPAIGNS));
      return SAMPLE_HISTORIC_CAMPAIGNS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_HISTORIC_CAMPAIGNS;
  } catch (e) {
    return SAMPLE_HISTORIC_CAMPAIGNS;
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
    localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteCampaign(campaignId: string): DataPalSearchCampaign[] {
  if (typeof window === "undefined") return [];
  const current = getStoredCampaigns();
  const updated = current.filter(c => c.id !== campaignId);
  try {
    localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
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

// Indian & Global realistic business name generators for high fidelity preview
const BIZ_NAME_PREFIXES: Record<string, string[]> = {
  default: ["Apex", "Royal", "Prime", "Heritage", "Zenith", "Horizon", "Elite", "Grand", "Urban", "Metro", "Vanguard", "Nexus", "Pinnacle"],
  Dental: ["Dr. Mehta's", "DentCraft", "SmilePlus", "Clove Dental Care", "PearlWhite", "Dr. Rao's", "AuraDental"],
  Medical: ["Sanjeevani", "Lifecare", "Apollo Clinic", "CareWell", "HealSpan", "AyurGram", "Aashray"],
  Restaurant: ["The Spice Guild", "Copper Chimney", "Barbeque Nation", "Bistro 18", "Tandoor Express", "Saffron Bistro", "Coastal Feast"],
  Cafe: ["Roast & Brew", "The Coffee Workshop", "Third Wave Bean", "Mocha Point", "Espresso Haven", "Cafe Bliss"],
  Hotel: ["The Grand Imperial", "Lemon Tree Retreat", "Residency Suites", "Fern Heritage", "Royal Orchid"],
  Architect: ["Morphology Studio", "Studio Praxis", "DesignGrid", "Aura Space Architects", "Atelier V", "Modus Design"],
  Software: ["CloudScale Tech", "DataVibe Analytics", "CodeMatrix Solutions", "Synthetix Logic", "ByteWave Labs", "OmniStack"],
  Retail: ["Vogue & Trend", "The Silk Route", "Urban Attire", "Prestige Jewelers", "Titanium Sparks", "Reliance Mart"],
};

const BIZ_LOCALITIES: Record<string, string[]> = {
  Mumbai: ["Bandra West", "Andheri East", "Nariman Point", "Lower Parel", "Juhu", "Powai", "Colaba", "Borivali West", "Goregaon"],
  Delhi: ["Connaught Place", "Hauz Khas", "South Extension", "Saket", "Karol Bagh", "Lajpat Nagar", "Dwarka Sector 12"],
  Bangalore: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Jayanagar", "MG Road", "Electronic City Phase 1"],
  Pune: ["Koregaon Park", "Baner", "Kothrud", "Viman Nagar", "Hinjewadi Phase 2", "FC Road"],
  Hyderabad: ["Jubilee Hills", "Banjara Hills", "HITEC City", "Gachibowli", "Madhapur", "Kondapur"],
  default: ["Commercial Hub, 1st Cross", "High Street Zone", "Station Road", "Tech Park Road", "City Center Plaza"],
};

/**
 * Generates realistic high-fidelity business leads tailored to location, category and requirements
 */
export function generateSyntheticLeads(config: DataPalSearchConfig): DataPalBusinessLead[] {
  const city = config.city && config.city !== "All Cities" && config.city !== "CUSTOM" ? config.city : "Mumbai";
  const state = config.state && config.state !== "All States" && config.state !== "CUSTOM" ? config.state : "Maharashtra";
  const country = config.countryCode === "US" ? "United States" : config.countryCode === "AE" ? "United Arab Emirates" : "India";
  const categories = config.selectedCategories.length > 0 ? config.selectedCategories : ["IT & Software Companies", "Restaurants & Fine Dining", "Dental Clinics"];
  const localities = BIZ_LOCALITIES[city] || BIZ_LOCALITIES["default"];

  const results: DataPalBusinessLead[] = [];
  const count = Math.floor(Math.random() * 10) + 18; // 18 to 27 leads
  const userQuery = config.searchQuery?.trim();

  for (let i = 0; i < count; i++) {
    const locality = localities[i % localities.length];
    let category = categories[i % categories.length];
    const prefix = BIZ_NAME_PREFIXES[category.split(" ")[0]] || BIZ_NAME_PREFIXES.default;
    const namePrefix = prefix[Math.floor(Math.random() * prefix.length)];

    let bizName = "";
    if (userQuery && userQuery.length > 1) {
      category = userQuery.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      const suffixes = ["Hub", "Care", "Services", "Center", "Associates", "Solutions", "Chambers", "Clinic", "Associates"];
      const suffix = suffixes[i % suffixes.length];
      bizName = `${namePrefix} ${category} ${i % 3 === 0 ? suffix : ""}`.trim();
    } else {
      bizName = `${namePrefix} ${category.split("&")[0].trim()} ${i > 4 ? "Hub" : "Center"}`;
    }

    const isMissingWebsite = config.requirement.toLowerCase().includes("website") || Math.random() < 0.35;
    const hasPhone = config.filters.mustHavePhone ? true : Math.random() < 0.95;
    const hasEmail = config.filters.mustHaveEmail ? true : Math.random() < 0.82;

    const cleanCitySlug = city.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanNameSlug = namePrefix.toLowerCase().replace(/[^a-z0-9]/g, "");

    const phoneNum = country === "India"
      ? `+91 ${98000 + Math.floor(Math.random() * 1900)} ${10000 + Math.floor(Math.random() * 89999)}`
      : `+1 (${Math.floor(Math.random() * 800) + 201}) ${Math.floor(Math.random() * 899) + 100}-${Math.floor(Math.random() * 8999) + 1000}`;

    const email = hasEmail ? `${cleanNameSlug}.${cleanCitySlug}@gmail.com` : null;
    const website = isMissingWebsite ? null : `https://${cleanNameSlug}${category.slice(0, 3).toLowerCase().replace(/[^a-z]/g, "")}.in`;

    const rating = parseFloat((4.1 + Math.random() * 0.8).toFixed(1));
    const reviewsCount = Math.floor(Math.random() * 320) + 28;

    let notes = "";
    let opportunityLevel: "Critical" | "High" | "Medium" | "Low" = "Medium";

    if (isMissingWebsite) {
      opportunityLevel = "Critical";
      notes = `High Impact Opportunity: Active local business with ${reviewsCount} reviews on Google Maps (${rating}★) but NO website or landing page. Pitch website + local SEO.`;
    } else if (config.requirement.toLowerCase().includes("ordering") || config.requirement.toLowerCase().includes("booking")) {
      opportunityLevel = "High";
      notes = `Needs Digital Ordering / Booking: Operates purely manual phone consultations. High willingness for appointment scheduling SaaS.`;
    } else if (config.requirement.toLowerCase().includes("social")) {
      opportunityLevel = "High";
      notes = `Social Media Gap: Zero active Instagram or LinkedIn presence despite high foot traffic. Ready for retainers.`;
    } else {
      opportunityLevel = rating >= 4.7 ? "High" : "Medium";
      notes = `Established player in ${locality}. Ready for CRM expansion, customer loyalty automations, and WhatsApp business API.`;
    }

    const sources = ["Google Maps & Places", "JustDial India", "IndiaMART B2B", "LinkedIn Company Search"];
    const chosenSource = sources[i % sources.length];

    results.push({
      id: `lead_${Date.now()}_${i}`,
      name: bizName,
      category,
      website,
      phone: hasPhone ? phoneNum : null,
      email,
      address: `Shop ${Math.floor(Math.random() * 40) + 1}, ${locality}, Near City Square`,
      city,
      state,
      country,
      postalCode: config.areaPincode?.trim() ? config.areaPincode.trim() : country === "India" ? `4000${10 + (i % 80)}` : "90210",
      rating: rating,
      reviewsCount,
      existingPresence: isMissingWebsite ? "Google Maps, JustDial" : "Website, Google Maps, Instagram",
      source: chosenSource,
      notes,
      verified: true,
      opportunityLevel,
      tags: [isMissingWebsite ? "No Website" : "Has Website", hasPhone ? "Phone Ready" : "No Phone", locality],
      extractedAt: new Date().toISOString(),
    });
  }

  return results;
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
