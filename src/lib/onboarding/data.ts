// Static choices used by the onboarding wizard. Classification and preferences only:
// nothing here is a business fact the user has to type in.

export interface Priority { id: string; title: string; detail: string; category: string; recommended?: boolean }

export const BUSINESS_TYPES = [
  { id: "it", title: "IT & Technology Services", desc: "Custom development, IT infrastructure, cloud engineering, and tech consultancy." },
  { id: "real_estate", title: "Real Estate & Property", desc: "Property portfolios, commercial leasing, brokerage, asset yields, and tenancy." },
  { id: "d2c", title: "E-Commerce & Retail", desc: "AOV, ROAS, SKU margins, repeat purchase frequency, and inventory cash cycle." },
  { id: "saas", title: "B2B SaaS & Cloud Platforms", desc: "Recurring ARR/MRR subscriptions, CAC payback, NRR, and churn telemetry." },
  { id: "agency", title: "Agency & Professional Services", desc: "Team billable utilisation, project margins, retainer pipeline, and realization." },
  { id: "healthcare", title: "Healthcare & Clinics", desc: "Patient volume, practitioner utilisation, recurring care, and clinic margins." },
  { id: "manufacturing", title: "Manufacturing & Physical Goods", desc: "Capacity utilisation, unit economics, supply lead time, and distributor cycles." },
  { id: "finance", title: "Financial Services & Wealth", desc: "AUM, advisory fees, portfolio performance, compliance, and asset management." },
  { id: "other", title: "Others (Custom Business)", desc: "Hospitality, logistics, education, agriculture and anything else." },
] as const;

export const TOOLS_OPTIONS = [
  {
    id: "google",
    name: "Google Account & Workspace",
    category: "Email, Calendar & Live OAuth",
    description: "Connect your Google account to sync your calendar, Gmail briefings, Drive files and Docs, so BizzPal always works from your real schedule and documents.",
  },
  {
    id: "microsoft",
    name: "Microsoft 365 & Teams",
    category: "Enterprise Cloud & SSO",
    description: "Connect Microsoft 365 to bring in Outlook email and calendar, OneDrive files and Teams alerts, with single sign-on for your whole team.",
  },
  {
    id: "linkedin",
    name: "LinkedIn Company & Ads",
    category: "B2B Social & Lead Generation",
    description: "Connect your LinkedIn page to track follower growth, ad campaign returns, B2B lead generation and executive posts in one place.",
  },
  {
    id: "meta",
    name: "Meta Business & Instagram",
    category: "Ad Spends, Instagram & WhatsApp",
    description: "Connect Meta Business to track Facebook and Instagram ad performance, acquisition cost and return on spend, Pixel events and WhatsApp conversations.",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments & Revenue",
    description: "Connect Stripe to automatically sync invoices, subscription revenue, refunds and daily cash inflow, so your numbers are always current.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Team Communication",
    description: "Connect Slack to receive executive channel alerts and cash-runway warnings, and to ask the BizzPal assistant questions right where your team works.",
  },
  {
    id: "zoho_books",
    name: "Zoho Books / QuickBooks",
    category: "Accounting & Ledgers",
    description: "Connect Zoho Books to sync your profit and loss, vendor expenses and GST reconciliation, and to track your monthly burn automatically.",
  },
  {
    id: "help_desk",
    name: "Help Desk (Zendesk / Freshdesk)",
    category: "Support & Customer Health",
    description: "Connect your help desk to monitor escalated tickets, response times and early signs of customer churn.",
  },
];

export const INDUSTRY_PRIORITIES: Record<string, Priority[]> = {
  saas: [
    {
      id: "saas_churn",
      title: "Reduce Churn & Expand Net Revenue Retention (NRR)",
      detail: "Set automated alert triggers on usage drops and account friction prior to contract renewals.",
      category: "Retention",
      recommended: true,
    },
    {
      id: "saas_cac",
      title: "Shorten CAC Payback Period Below 12 Months",
      detail: "Audit paid acquisition channel saturation and optimize conversion to sales demo.",
      category: "Growth",
      recommended: true,
    },
    {
      id: "extend_runway",
      title: "Extend Cash Runway & Control Cloud Server Burn",
      detail: "Audit AWS/GCP workloads and discretionary vendor subscriptions to stretch runway.",
      category: "Financial",
    },
    {
      id: "saas_pricing",
      title: "Reprice Tiers & Seat-Based Monetization",
      detail: "Simulate pricing tier elasticities and annual contract upfront advances.",
      category: "Pricing",
    },
    {
      id: "founder_bottleneck",
      title: "Remove Founder Bottleneck from Enterprise Closing",
      detail: "Codify closing playbook so sales team can demo and close independently.",
      category: "Operations",
    },
    {
      id: "board_intelligence",
      title: "Automate Board-Ready ARR Reporting & Telemetry",
      detail: "Instrument real-time ARR waterfall, cohort telemetry, and gap diagnostics.",
      category: "Strategy",
    },
  ],
  it: [
    {
      id: "it_util",
      title: "Elevate Billable Engineering Utilisation (>82%)",
      detail: "Maximize client realization hours and minimize bench idle burn.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "it_concentration",
      title: "Eliminate Single-Client Account Concentration Risk",
      detail: "De-risk primary client representing >25% of company revenues.",
      category: "Risk",
      recommended: true,
    },
    {
      id: "it_retainers",
      title: "Transition from T&M to High-Margin Managed Retainers",
      detail: "Productize recurring SLAs with upfront quarterly billing cycles.",
      category: "Pricing",
    },
    {
      id: "it_bench",
      title: "Optimize Developer Bench & Accelerate Sourcing",
      detail: "Reduce recruitment cycles and align talent bench to forward project pipeline.",
      category: "Talent",
    },
    {
      id: "founder_bottleneck",
      title: "Standardize Delivery Playbooks & Eliminate Founder Reviews",
      detail: "Empower project leads to run client scrums and milestone sign-offs independently.",
      category: "Operations",
    },
    {
      id: "it_collections",
      title: "Accelerate Milestone Cash Collections & Reduce DSO",
      detail: "Enforce payment milestones before staging release to protect cash flow.",
      category: "Financial",
    },
  ],
  d2c: [
    {
      id: "d2c_roas",
      title: "Improve Blended ROAS & Lower First-Order CAC",
      detail: "Audit Meta/Google ad efficiency, creative fatigue, and landing page dropoffs.",
      category: "Acquisition",
      recommended: true,
    },
    {
      id: "d2c_inventory",
      title: "Prevent Stockouts & Shorten Cash Conversion Cycle",
      detail: "Synchronize inventory reorder lead times with working capital availability.",
      category: "Supply Chain",
      recommended: true,
    },
    {
      id: "d2c_rto",
      title: "Reduce Courier Return-to-Origin (RTO) Losses",
      detail: "Implement OTP address verification and COD-to-prepaid customer conversion.",
      category: "Logistics",
    },
    {
      id: "d2c_ltv",
      title: "Elevate Repeat Purchase Frequency & 90-Day LTV",
      detail: "Automate post-purchase WhatsApp and email re-engagement flows.",
      category: "Retention",
    },
    {
      id: "d2c_margins",
      title: "Protect Contribution Margin After Packaging & Shipping",
      detail: "Model unit economics elasticity against carrier courier rate increases.",
      category: "Pricing",
    },
  ],
  real_estate: [
    {
      id: "re_occupancy",
      title: "Elevate Portfolio Occupancy & Commercial Yields",
      detail: "Accelerate tenant acquisition pipeline and optimize long-term lease spreads.",
      category: "Revenue",
      recommended: true,
    },
    {
      id: "re_closing",
      title: "Shorten High-Ticket Deal Closing & Syndication Velocity",
      detail: "Standardize investor diligence data room and automate buyer follow-ups.",
      category: "Sales",
      recommended: true,
    },
    {
      id: "re_collections",
      title: "Automate Rent Invoicing & Overdue Escalations",
      detail: "Eliminate overdue tenant arrears with automated GST reconciliation.",
      category: "Cash Flow",
    },
    {
      id: "re_dscr",
      title: "De-risk Debt-Service Coverage Ratio (DSCR)",
      detail: "Stress-test debt amortization obligations against fluctuating tenant vacancy.",
      category: "Financial",
    },
    {
      id: "re_pipeline",
      title: "Centralize Broker Partner Network & Commission Tracking",
      detail: "Instrument channel partner visibility and prevent broker leakages.",
      category: "Operations",
    },
  ],
  agency: [
    {
      id: "agency_founder",
      title: "Break Past Founder-Led Sales & Deal Dependency",
      detail: "Systematize inbound pitch decks and enable Account Executives to close.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "agency_margins",
      title: "Eliminate Project Scope Creep & Margin Erosion",
      detail: "Track client revisions and automate change-request billings.",
      category: "Profitability",
      recommended: true,
    },
    {
      id: "agency_retainers",
      title: "Convert One-Off Projects into Recurring Monthly Retainers",
      detail: "Package ongoing strategic advisory and maintenance retainers.",
      category: "Revenue",
    },
    {
      id: "agency_dso",
      title: "Accelerate Client Receivable Collections (DSO < 30 Days)",
      detail: "Automate milestone invoicing and require retainer payments at month start.",
      category: "Cash Flow",
    },
    {
      id: "agency_churn",
      title: "Standardize Client Onboarding & Account Retention",
      detail: "Set up 30-60-90 day milestone review cadences to prevent account churn.",
      category: "Retention",
    },
  ],
  healthcare: [
    {
      id: "health_throughput",
      title: "Maximize Doctor & Procedure Room Utilisation",
      detail: "Balance clinical appointment scheduling and reduce idle room hours.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "health_noshow",
      title: "Lower Patient Appointment No-Show Rate Below 5%",
      detail: "Automate WhatsApp appointment confirmations and 24-hour reminders.",
      category: "Retention",
      recommended: true,
    },
    {
      id: "health_equipment",
      title: "Accelerate High-Value Diagnostic Equipment Payback",
      detail: "Monitor scanning volume and drive referral partnership volume.",
      category: "Capital",
    },
    {
      id: "health_recurring",
      title: "Launch Recurring Preventive Care & Wellness Memberships",
      detail: "Create steady predictable cash inflow through annual wellness care subscriptions.",
      category: "Revenue",
    },
  ],
  manufacturing: [
    {
      id: "mfg_capacity",
      title: "Elevate Plant Capacity Utilisation Above 80%",
      detail: "Minimize machine idle downtime and optimize batch changeover schedules.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "mfg_materials",
      title: "Mitigate Raw Material Price Volatility & Supply Lead Times",
      detail: "Diversify vendor contracts and optimize safety stock thresholds.",
      category: "Supply Chain",
      recommended: true,
    },
    {
      id: "mfg_scrap",
      title: "Reduce Quality Rejections & Production Scrap Below 1.5%",
      detail: "Implement automated stage-gate QA audits across assembly lines.",
      category: "Quality",
    },
    {
      id: "mfg_dealers",
      title: "Expand Dealer/Distributor Network & Improve Turnaround",
      detail: "Accelerate distributor dispatch cycles and track regional dealer quotas.",
      category: "Distribution",
    },
  ],
  finance: [
    {
      id: "fin_aum",
      title: "Accelerate High-Net-Worth Client Acquisition & AUM",
      detail: "Streamline wealth advisory pipeline and client portfolio proposals.",
      category: "Growth",
      recommended: true,
    },
    {
      id: "fin_compliance",
      title: "Automate Regulatory Audits & Compliance Documentation",
      detail: "Maintain continuous audit trails and KYC compliance checks.",
      category: "Compliance",
      recommended: true,
    },
    {
      id: "fin_fees",
      title: "Protect Advisory Fee Realisation & Transparency",
      detail: "Automate management fee billing and portfolio performance attribution.",
      category: "Operations",
    },
  ],
  other: [
    {
      id: "other_runway",
      title: "Extend Working Capital Runway & Optimize Cash Flow",
      detail: "Audit operational burn and forecast forward liquidity reserves.",
      category: "Financial",
      recommended: true,
    },
    {
      id: "other_sales",
      title: "Systematize Sales Pipeline & Reduce Founder Closing Burden",
      detail: "Enable team to qualify, quote, and close deals independently.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "other_vendor",
      title: "Eliminate Vendor Cost Creep & Protect Gross Margins",
      detail: "Audit monthly supplier invoices and re-negotiate high-spend contracts.",
      category: "Profitability",
    },
    {
      id: "other_retention",
      title: "Elevate Client Retention & Repeat Business",
      detail: "Implement structured post-delivery check-ins and satisfaction telemetry.",
      category: "Retention",
    },
  ],
};
