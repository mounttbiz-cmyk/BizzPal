import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanEmail, computeLevel, ensureVerificationSchema, listVerifications } from "@/lib/verification/store";
import { totalRevenue } from "@/lib/payments/store";
import { listInvites, verifiedCount } from "@/lib/team/invites";
import { getHrisConnection } from "@/lib/team/hris";

export const dynamic = "force-dynamic";

const INDUSTRIES: Record<string, string> = {
  it: "IT & Technology Services",
  real_estate: "Real Estate & Property",
  d2c: "E-Commerce & Retail",
  saas: "B2B SaaS & Cloud Platforms",
  agency: "Agency & Professional Services",
  healthcare: "Healthcare & Clinics",
  manufacturing: "Manufacturing & Physical Goods",
  finance: "Financial Services & Wealth",
  other: "Other",
};
const TOOLS = ["google", "microsoft", "linkedin", "meta", "stripe", "slack", "zoho_books", "help_desk"];
// Tool keys the existing integrations table already tracks
const TRACKED = ["stripe", "slack", "zoho_books", "google_calendar", "help_desk"];

const str = (v: any, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function domainLabel(domain: string): string {
  const core = domain.replace(/^www\./, "").split(".")[0] || domain;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

/**
 * POST: finish onboarding.
 * Identity (legal name, GSTIN, state, status) and the verification level come ONLY from the
 * server's own verification records. Revenue, burn, cash and team size are NOT collected here:
 * they will be filled from connected sources, so they start empty (0) and are labelled as such.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = cleanEmail(body?.email);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please sign in again, then retry." }, { status: 401 });
  }

  ensureVerificationSchema();
  const rows = listVerifications(email);
  const gstinRow = rows.find((r) => r.kind === "gstin" && r.status === "verified") || rows.find((r) => r.kind === "gstin" && r.status === "unverified");
  if (!gstinRow) {
    return NextResponse.json({ error: "Add and check your GSTIN before finishing setup." }, { status: 400 });
  }
  const { level, domain, bank } = computeLevel(email);
  const bankPending = rows.find((r) => r.kind === "bank" && r.status === "unverified") || null;
  const registryVerified = gstinRow.status === "verified";
  const rec = registryVerified ? gstinRow.evidence?.record || {} : {};
  const fmt = gstinRow.evidence?.format || {};

  const selected: string[] = (Array.isArray(body?.industries) ? body.industries : []).filter((x: any) => typeof x === "string" && x in INDUSTRIES).slice(0, 9);
  if (selected.length === 0) return NextResponse.json({ error: "Pick at least one industry." }, { status: 400 });
  const customIndustry = selected.includes("other") ? str(body?.customIndustry, 80) : "";
  if (selected.includes("other") && !customIndustry) return NextResponse.json({ error: "Tell us your industry." }, { status: 400 });

  const tools: string[] = (Array.isArray(body?.connectedTools) ? body.connectedTools : []).filter((t: any) => TOOLS.includes(t));
  const needs: string[] = (Array.isArray(body?.needs) ? body.needs : []).map((n: any) => str(n, 200)).filter(Boolean).slice(0, 25);
  const founderName = str(body?.founderName, 100) || email.split("@")[0];

  const customCompanyName = str(body?.companyName, 120);
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl : null;
  const legalName: string = rec.legalName || "";
  const tradeName: string = rec.tradeName || "";
  const name = customCompanyName || tradeName || legalName || (domain ? domainLabel(domain.subject) : `GSTIN ${gstinRow.subject}`);
  const industryLabel = selected.map((s) => (s === "other" ? customIndustry : INDUSTRIES[s])).join(", ");
  const now = new Date().toISOString();
  const bizId = `biz_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const exists = db.prepare("SELECT id FROM businesses WHERE id = ?").get(bizId);
  const identity = [
    name, selected[0], industryLabel, customIndustry || null, founderName, domain?.subject || null,
    JSON.stringify(tools), legalName || null, tradeName || null, gstinRow.subject, fmt.pan || null,
    rec.state || fmt.state || null, rec.address || null, rec.constitution || null, rec.status || null,
    rec.registrationDate || null, fmt.entityType || null, level, registryVerified ? now : null,
    logoUrl, now,
  ];
  if (exists) {
    // Financial columns are deliberately left untouched so values synced later are never clobbered.
    db.prepare(`
      UPDATE businesses SET name = ?, industry = ?, industry_label = ?, custom_industry = ?, founder_name = ?, website = ?,
        connected_tools = ?, legal_name = ?, trade_name = ?, gstin = ?, pan = ?, registered_state = ?, registered_address = ?,
        constitution = ?, gst_status = ?, gst_registration_date = ?, entity_type = ?, verification_level = ?, verified_at = ?,
        logo_url = COALESCE(?, logo_url), updated_at = ?
      WHERE id = ?
    `).run(...identity, bizId);
  } else {
    db.prepare(`
      INSERT INTO businesses (name, industry, industry_label, custom_industry, founder_name, website, connected_tools,
        legal_name, trade_name, gstin, pan, registered_state, registered_address, constitution, gst_status, gst_registration_date,
        entity_type, verification_level, verified_at, logo_url, created_at, updated_at,
        id, team_size, annual_revenue, monthly_revenue, monthly_burn, cash_on_hand, no_integrations, whatsapp_opt_in, financials_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, ?, 0, 'none')
    `).run(...identity.slice(0, 20), now, now, bizId, tools.length === 0 ? 1 : 0);
  }

  for (const key of TRACKED) {
    const wanted = tools.includes(key === "google_calendar" ? "google" : key);
    const cur = db.prepare("SELECT status FROM integrations WHERE business_id = ? AND tool_key = ?").get(bizId, key) as any;
    const status = wanted ? (cur?.status === "connected" ? "connected" : "pending_connection") : cur?.status === "connected" ? "connected" : "not_connected";
    const label: Record<string, [string, string]> = {
      stripe: ["Stripe", "payments"], slack: ["Slack", "communication"], zoho_books: ["Zoho Books", "accounting"],
      google_calendar: ["Google Calendar", "scheduling"], help_desk: ["Help Desk", "support"],
    };
    db.prepare(`
      INSERT INTO integrations (id, business_id, tool_key, name, category, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(business_id, tool_key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
    `).run(`int_${bizId}_${key}`, bizId, key, label[key][0], label[key][1], status, now);
  }

  // Real figures only: revenue comes from the connected payment provider,
  // headcount from verified HRIS/HCM active roster or confirmed email invites.
  const rev = totalRevenue(email);
  const confirmed = verifiedCount(email);
  const { summary: hrisSummary } = getHrisConnection(email);
  const hrisHeadcount = hrisSummary?.activeHeadcount || 0;
  // If enterprise HRIS or verified directory is connected, use verified core active headcount; otherwise count verified invites
  const teamSize = hrisHeadcount > 0 ? hrisHeadcount : 1 + confirmed;
  db.prepare("UPDATE businesses SET team_size = ?, monthly_revenue = COALESCE(?, monthly_revenue), financials_source = COALESCE(?, financials_source) WHERE id = ?")
    .run(teamSize, rev ? rev.revenueInr : null, rev ? rev.sources.join("+") : null, bizId);
  const invitedCount = listInvites(email).length;
  const bankEv: any = bank?.evidence || bankPending?.evidence || null;

  // The profile object the dashboard reads. Numbers are 0 because nothing has been synced yet.
  const profile = {
    name,
    founderName,
    email,
    logoUrl: logoUrl || null,
    website: domain?.subject || "",
    industry: customIndustry || selected.map((s) => INDUSTRIES[s]).join(", "),
    industryLabel,
    industryKey: selected[0],
    selectedCategories: selected,
    categoriesLabels: selected.map((s) => (s === "other" ? customIndustry : INDUSTRIES[s])),
    customBusinessType: customIndustry,
    businessModel: "subscription",
    currency: "INR",
    teamSize,
    annualRevenue: 0,
    revenue: rev ? rev.revenueInr : 0,
    burn: 0,
    cash: 0,
    financialsSource: rev ? rev.sources.join("+") : "none",
    financialsAsOf: rev ? rev.asOf : null,
    needs: needs.length ? needs : ["extend_runway"],
    connectedTools: tools,
    noIntegrations: tools.length === 0,
    whatsappOptIn: false,
    whatsappNumber: "",
    dynamicAnswers: {},
    extractedWebsiteData: null,
    verification: {
      level,
      registryVerified,
      gstin: gstinRow.subject,
      legalName,
      tradeName,
      state: rec.state || fmt.state || "",
      entityType: fmt.entityType || "",
      gstStatus: rec.status || "",
      website: domain ? { domain: domain.subject, method: domain.evidence?.method, emailMatches: Boolean(domain.evidence?.emailMatches) } : null,
      verifiedAt: registryVerified ? now : null,
      bank: bankEv ? { verified: Boolean(bank), bankName: bankEv.bank?.bank || "", branch: bankEv.bank?.branch || "", ifsc: bankEv.bank?.ifsc || "", last4: bankEv.last4 || "", holderName: bank ? bankEv.holderName || "" : "" } : null,
      payments: rev ? { sources: rev.sources, revenueLast30DaysInr: rev.revenueInr, asOf: rev.asOf } : null,
      team: { confirmed, invited: invitedCount },
    },
    completedAt: now,
  };

  db.prepare("UPDATE registered_users SET business_profile = ? WHERE LOWER(email) = ?").run(JSON.stringify(profile), email);

  return NextResponse.json({ success: true, businessId: bizId, profile });
}
