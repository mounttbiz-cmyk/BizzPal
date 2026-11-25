/**
 * The Phase 1 industry packs (PRD section 4): exactly three industries, each with its specialist agents.
 * The X-Ray may only recommend an agent from the pack of the industry it detected. Every other industry is
 * "general": it gets the X-Ray but no agent recommendation yet (PRD section 1.2, V2 templates).
 */

export type IndustryId = "real_estate" | "financial_services" | "saas_agency" | "general";
export type LeakType = "revenue" | "efficiency" | "risk";

export interface AgentDefinition {
  id: string;
  name: string;
  /** The job it does, in one line */
  job: string;
  /** What has to be connected before it can work */
  needs: string[];
  /** What it may do once active */
  actions: string;
  /** What it will never do */
  guardrails: string;
  /** Where a person must approve */
  approvals: string;
  /** The kinds of leak it addresses */
  fixes: LeakType[];
  /** Connections that must be live before it can be activated (integration keys) */
  requires: string[];
  /** The only actions it may ask for (see lib/platform/policy.ts) */
  tools: string[];
}

export interface IndustryPack {
  id: Exclude<IndustryId, "general">;
  name: string;
  /** Plain words that describe businesses in this industry, for the analyst's guidance */
  describes: string;
  agents: AgentDefinition[];
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: "real_estate",
    name: "Real Estate & Property Management",
    describes: "property developers, builders, real estate brokers and agents, property management companies, rentals and leasing",
    agents: [
      {
        id: "re_lead_qualifier",
        requires: ["salespal", "crm", "calendar"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead", "crm.update_lead", "calendar.book_slot", "whatsapp.send_template", "salespal.start_call"],
        name: "AI Lead Qualifier & Site-Visit Booker",
        job: "Qualifies property enquiries (budget, location, timeline) and books site visits.",
        needs: ["SalesPal (voice and WhatsApp)", "CRM", "Calendar"],
        actions: "Replies to opted-in enquiries, records budget, location and timeline, and proposes site-visit slots.",
        guardrails: "Never states a price or availability that is not in your approved source.",
        approvals: "A booking is confirmed only after an authorised calendar entry.",
        fixes: ["revenue"],
      },
      {
        id: "re_rera_listing_qa",
        requires: ["documents"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal"],
        name: "RERA Compliance & Listing QA",
        job: "Checks listings against your project facts and your RERA checklist.",
        needs: ["Brain Drive documents", "Listing source"],
        actions: "Compares each listing with your facts and flags missing or conflicting details.",
        guardrails: "Checklist support only. It does not certify compliance or give legal advice.",
        approvals: "A person reviews every flagged listing.",
        fixes: ["risk"],
      },
      {
        id: "re_broker_payout",
        requires: ["accounting", "crm", "documents"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "Broker Payout Reconciler",
        job: "Matches closed deals, brokerage terms, invoices and payout records.",
        needs: ["Accounting / ERP", "CRM", "Brokerage agreements"],
        actions: "Read-only matching and a variance report.",
        guardrails: "Never starts a payment.",
        approvals: "A person signs off every variance.",
        fixes: ["efficiency", "risk"],
      },
      {
        id: "re_property_ops",
        requires: ["whatsapp", "tickets"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "whatsapp.send_template"],
        name: "Property Operations Coordinator",
        job: "Sorts maintenance requests, assigns them and tracks the response time.",
        needs: ["WhatsApp", "Ticket or property system"],
        actions: "Classifies requests, assigns the right queue and follows up on deadlines.",
        guardrails: "Escalates safety issues to a person and never diagnoses them.",
        approvals: "Safety-related requests go straight to a person.",
        fixes: ["efficiency"],
      },
    ],
  },
  {
    id: "financial_services",
    name: "Financial Services / Broking / Insurance",
    describes: "stock brokers, mutual fund and insurance distributors, insurance agencies, wealth and investment advisors, loan and credit agents, NBFC sales",
    agents: [
      {
        id: "fs_lead_closer",
        requires: ["salespal", "crm", "calendar"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead", "crm.update_lead", "calendar.book_slot", "whatsapp.send_template", "salespal.start_call"],
        name: "AI Lead Closer & Appointment Setter",
        job: "Responds to opted-in enquiries, qualifies interest and books an advisor callback.",
        needs: ["SalesPal (voice and WhatsApp)", "CRM", "Calendar"],
        actions: "Replies to opted-in enquiries and books callbacks with your advisors.",
        guardrails: "Never gives a personal investment or insurance recommendation.",
        approvals: "Any regulated question goes to a licensed person.",
        fixes: ["revenue"],
      },
      {
        id: "fs_commission_reconciler",
        requires: ["accounting", "crm", "documents"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "Broker Payout & Commission Reconciler",
        job: "Matches commission statements with ledger entries.",
        needs: ["Accounting", "CRM / ERP", "Commission statements"],
        actions: "Read-only matching and a variance report.",
        guardrails: "Never executes trades or moves money.",
        approvals: "A person signs off every variance.",
        fixes: ["efficiency", "risk"],
      },
      {
        id: "fs_kyc_checker",
        requires: ["documents", "crm"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "KYC Document Completeness Checker",
        job: "Checks KYC documents are present, legible and consistent.",
        needs: ["Secure document storage", "CRM"],
        actions: "Flags missing, unreadable or mismatched documents.",
        guardrails: "Never gives final KYC approval or verifies identity.",
        approvals: "Your compliance team makes every final decision.",
        fixes: ["risk", "efficiency"],
      },
      {
        id: "fs_renewal_followup",
        requires: ["crm", "whatsapp", "calendar"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead", "whatsapp.send_template", "calendar.book_slot"],
        name: "Renewal & Service Follow-up Agent",
        job: "Tracks renewal dates and sends approved reminders.",
        needs: ["CRM", "WhatsApp", "Calendar"],
        actions: "Sends approved reminder messages before renewal dates.",
        guardrails: "Never advises on coverage or promises claims.",
        approvals: "Reminder templates are approved by you first.",
        fixes: ["revenue"],
      },
    ],
  },
  {
    id: "saas_agency",
    name: "B2B SaaS / Marketing Agencies",
    describes: "B2B software and SaaS companies, IT services sold to businesses, digital and marketing agencies, consulting firms selling projects or retainers",
    agents: [
      {
        id: "saas_lead_closer",
        requires: ["salespal", "crm", "calendar"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead", "crm.update_lead", "calendar.book_slot", "whatsapp.send_template", "salespal.start_call"],
        name: "AI Lead Closer",
        job: "Qualifies inbound leads, answers approved FAQs, books demos and updates the CRM.",
        needs: ["SalesPal (voice and WhatsApp)", "CRM", "Calendar"],
        actions: "Replies to inbound leads, books demos and records outcomes in the CRM.",
        guardrails: "Never invents product claims, discounts or commitments.",
        approvals: "Discounts and custom terms go to a person.",
        fixes: ["revenue"],
      },
      {
        id: "saas_campaign_analyst",
        requires: ["crm", "analytics"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "Campaign Performance Analyst",
        job: "Summarises funnel and channel performance and flags anomalies.",
        needs: ["CRM", "Analytics", "Brain Drive"],
        actions: "Read-only reports with anomalies and tests to run.",
        guardrails: "Never invents attribution or claims cause without a test.",
        approvals: "None needed: it only reads and reports.",
        fixes: ["efficiency", "revenue"],
      },
      {
        id: "saas_delivery_coordinator",
        requires: ["project", "email", "crm"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "Client Delivery & SLA Coordinator",
        job: "Tracks milestones, collects client inputs and drafts status updates.",
        needs: ["Project tool", "Email", "CRM"],
        actions: "Tracks deadlines and drafts client updates.",
        guardrails: "Never sends client communication on its own.",
        approvals: "Every external message is approved by a person.",
        fixes: ["efficiency", "risk"],
      },
      {
        id: "saas_proposal_assistant",
        requires: ["documents", "crm"],
        tools: ["brief.read", "tasks.list", "message.draft", "tasks.create_internal", "crm.read_lead"],
        name: "Proposal & Scope Assistant",
        job: "Drafts proposals from your approved rate cards and discovery notes.",
        needs: ["Brain Drive (rate cards)", "CRM", "Documents"],
        actions: "Drafts proposals and scopes for review.",
        guardrails: "Cannot approve discounts or final legal terms.",
        approvals: "A person approves every proposal before it is sent.",
        fixes: ["revenue", "efficiency"],
      },
    ],
  },
];

export const INDUSTRY_NAMES: Record<IndustryId, string> = {
  real_estate: "Real Estate & Property Management",
  financial_services: "Financial Services / Broking / Insurance",
  saas_agency: "B2B SaaS / Marketing Agencies",
  general: "General business",
};

export function packFor(industry: IndustryId): IndustryPack | null {
  return INDUSTRY_PACKS.find(p => p.id === industry) || null;
}

export function agentById(id: string): { agent: AgentDefinition; pack: IndustryPack } | null {
  for (const pack of INDUSTRY_PACKS) {
    const agent = pack.agents.find(a => a.id === id);
    if (agent) return { agent, pack };
  }
  return null;
}

/** What each connection key means, for people. */
export const REQUIREMENT_LABELS: Record<string, string> = {
  salespal: "SalesPal",
  crm: "CRM",
  calendar: "Calendar",
  whatsapp: "WhatsApp Business",
  accounting: "Accounting / ERP",
  documents: "Documents in the Knowledge Hub",
  tickets: "Ticket or property system",
  project: "Project tool",
  email: "Email",
  analytics: "Analytics",
};
