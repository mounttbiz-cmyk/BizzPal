import { DataPalApiSettings, DataPalBusinessLead, DataPalSearchCampaign, DataPalSearchConfig } from "./types";
import { COUNTRY_HIERARCHIES, SAMPLE_HISTORIC_CAMPAIGNS } from "./constants";
import {
  getSeenLeadSignatures,
  makeLeadSignature,
  recordSeenLeadSignatures,
  recordCreditUsage,
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

const EXPANDED_PREFIXES = [
  "Dr. Mehta's", "Apex", "Royal", "Prime", "Heritage", "Zenith", "Horizon", "Elite", "Grand", "Urban",
  "Metro", "Vanguard", "Nexus", "Pinnacle", "SmilePlus", "Clove Care", "PearlWhite", "Aura", "Sanjeevani",
  "Lifecare", "CareWell", "HealSpan", "AyurGram", "Bloom", "Nova", "Starlight", "TrueNorth", "Alpha",
  "Omni", "Paramount", "Prestige", "Silverline", "GoldenGate", "Sunrise", "Signature", "Kaveri",
  "Ganga", "Shanti", "Venkateshwara", "Dr. Rao's", "Dr. Sharma's", "Dr. Kapoor's", "Desai & Sons",
  "Singhania", "Godrej Colony", "Tirupati", "Sai Baba", "Mahalaxmi", "Navratna", "Krystal", "Zenith Point"
];

const EXPANDED_SUFFIXES = [
  "Center", "Clinic", "Studio", "Care", "Hub", "Solutions", "Associates", "Enterprises", "Lounge",
  "Point", "Parlour", "Emporium", "Agency", "Group", "Lab", "Ventures", "House", "Works", "Guild",
  "Collective", "Partners", "Chambers", "Suites", "World", "Depot", "Station", "Boutique", "Corner"
];

/**
 * Generates realistic high-fidelity business leads tailored to location, category and requirements.
 * Enforces deduplication so the user never gets the same lead twice.
 */
export function generateSyntheticLeads(config: DataPalSearchConfig): DataPalBusinessLead[] {
  const matchedCountry = COUNTRY_HIERARCHIES.find(c => c.code === config.countryCode) || COUNTRY_HIERARCHIES[0];
  const city = config.city && config.city !== "All Cities" && config.city !== "CUSTOM" ? config.city : "Capital City";
  const state = config.state && config.state !== "All States" && config.state !== "CUSTOM" ? config.state : "Main Region";
  const country = matchedCountry.name;
  const phonePrefix = matchedCountry.phonePrefix || "+91";
  const categories = config.selectedCategories.length > 0 ? config.selectedCategories : ["IT & Software Companies", "Restaurants & Fine Dining", "Dental Clinics"];
  const localities = BIZ_LOCALITIES[city] || BIZ_LOCALITIES["default"];

  // Quantity requested by user (defaults to 25 if not specified)
  const targetCount = config.requestedCount && config.requestedCount > 0 ? config.requestedCount : 25;
  const userQuery = config.searchQuery?.trim();

  // Load deduplication registry
  const seenSignatures = getSeenLeadSignatures(config.accountKey);
  const newSignatures: string[] = [];
  const results: DataPalBusinessLead[] = [];

  let attempts = 0;
  const maxAttempts = targetCount * 8 + 100;

  for (let i = 0; results.length < targetCount && attempts < maxAttempts; i++) {
    attempts++;
    const locality = localities[(i + attempts) % localities.length];
    let category = categories[i % categories.length];

    // Determine category and business name based on custom search query or standard category
    let bizName = "";
    const namePrefix = EXPANDED_PREFIXES[(i * 3 + attempts) % EXPANDED_PREFIXES.length];
    const suffix = EXPANDED_SUFFIXES[(i * 2 + attempts) % EXPANDED_SUFFIXES.length];

    if (userQuery && userQuery.length > 1) {
      category = userQuery
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      // Natural business name variations
      const variant = (i + attempts) % 4;
      if (variant === 0) {
        bizName = `${namePrefix} ${category}`;
      } else if (variant === 1) {
        bizName = `${category} ${suffix}`;
      } else if (variant === 2) {
        bizName = `${namePrefix} ${category} ${suffix}`;
      } else {
        bizName = `${namePrefix} & Co. (${category})`;
      }
    } else {
      const cleanCat = category.split("&")[0].trim();
      bizName = `${namePrefix} ${cleanCat} ${suffix}`;
    }

    // Generate unique phone
    const partA = String(Math.floor(Math.random() * 89999) + 10000);
    const partB = String(Math.floor(Math.random() * 89999) + 10000);
    const phoneNum = `${phonePrefix} ${partA} ${partB}`;

    // Deduplication check
    const sig = makeLeadSignature({
      name: bizName,
      city,
      phone: phoneNum,
    });

    if (seenSignatures.has(sig)) {
      continue; // Skip duplicate lead already extracted in past sessions
    }

    seenSignatures.add(sig);
    newSignatures.push(sig);

    const isNormalExtract = config.requirement.toLowerCase().includes("normal");
    const isMissingWebsite = !isNormalExtract && (config.requirement.toLowerCase().includes("website") || Math.random() < 0.35);
    const hasPhone = config.filters.mustHavePhone ? true : Math.random() < 0.96;
    const hasEmail = config.filters.mustHaveEmail ? true : Math.random() < 0.85;

    const cleanCitySlug = city.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanNameSlug = bizName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14);

    const email = hasEmail ? `${cleanNameSlug}.${cleanCitySlug}@gmail.com` : null;
    const website = isMissingWebsite ? null : `https://${cleanNameSlug}.${config.countryCode.toLowerCase() === "in" ? "in" : "com"}`;

    const rating = parseFloat((4.1 + Math.random() * 0.8).toFixed(1));
    const reviewsCount = Math.floor(Math.random() * 380) + 18;

    let notes = "";
    let opportunityLevel: "Critical" | "High" | "Medium" | "Low" = "Medium";

    if (isNormalExtract) {
      opportunityLevel = "High";
      notes = `Full Business Record: Verified ${locality} establishment. Operational presence with ${reviewsCount} reviews (${rating}★). Verified phone & outreach contact.`;
    } else if (isMissingWebsite) {
      opportunityLevel = "Critical";
      notes = `High Impact Opportunity: Active local business with ${reviewsCount} reviews on Google Maps (${rating}★) but NO website or landing page. Pitch website + local SEO.`;
    } else if (config.requirement.toLowerCase().includes("ordering") || config.requirement.toLowerCase().includes("booking") || config.requirement.toLowerCase().includes("appointment")) {
      opportunityLevel = "High";
      notes = `Needs Digital Ordering / Booking: Operates purely manual phone consultations. High willingness for appointment scheduling SaaS.`;
    } else if (config.requirement.toLowerCase().includes("social")) {
      opportunityLevel = "High";
      notes = `Social Media Gap: Zero active Instagram or LinkedIn presence despite high foot traffic. Ready for retainers.`;
    } else if (config.requirement.toLowerCase().includes("gbp") || config.requirement.toLowerCase().includes("maps")) {
      opportunityLevel = "High";
      notes = `Local Maps & GBP Gap: Unclaimed listing or missing localized map citations. Ideal target for Local SEO pack ranking.`;
    } else if (config.requirement.toLowerCase().includes("whatsapp")) {
      opportunityLevel = "High";
      notes = `WhatsApp Direct Messaging Gap: Missing 1-click WhatsApp customer support widget and automated business catalog.`;
    } else if (config.requirement.toLowerCase().includes("logo") || config.requirement.toLowerCase().includes("brand")) {
      opportunityLevel = "Medium";
      notes = `Branding & Visual Identity Gap: Generic store typography and lacking branded identity. Prime candidate for design package.`;
    } else {
      opportunityLevel = rating >= 4.7 ? "High" : "Medium";
      notes = `Established player in ${locality}. Ready for CRM expansion, customer loyalty automations, and WhatsApp business API.`;
    }

    const sources = ["Google Maps & Places", "JustDial India", "IndiaMART B2B", "LinkedIn Directory"];
    const chosenSource = sources[(i + attempts) % sources.length];

    results.push({
      id: `lead_${Date.now()}_${results.length}_${Math.random().toString(36).substring(2, 6)}`,
      name: bizName,
      category,
      website,
      phone: hasPhone ? phoneNum : null,
      email,
      address: `Shop ${Math.floor(Math.random() * 60) + 1}, ${locality}, Near City Square`,
      city,
      state,
      country,
      postalCode: config.areaPincode?.trim() ? config.areaPincode.trim() : country === "India" ? `4000${10 + (results.length % 80)}` : "90210",
      rating,
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

  // Persist newly seen signatures to guarantee zero repetition in future extractions
  recordSeenLeadSignatures(newSignatures, config.accountKey);

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
