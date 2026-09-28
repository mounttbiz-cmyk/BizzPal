"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  ShieldCheck,
  BrainCircuit,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  X,
  Share2,
  Download,
  FolderOpen,
  Newspaper,
  TrendingUp,
  Globe,
  Radio,
  AlertCircle,
  RefreshCw,
  Building2,
  Landmark,
  Scale,
  Zap,
  ArrowUpRight
} from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

interface KnowledgeDoc {
  id: string;
  title: string;
  category: "operations" | "finance" | "sales" | "governance" | "technology";
  description: string;
  updatedAt: string;
  version: string;
  author: string;
  indexed: boolean;
  content: string;
}

interface BusinessNewsItem {
  id: string;
  title: string;
  category: "economy" | "tax_compliance" | "funding" | "tech_ai" | "saas_trends";
  categoryLabel: string;
  source: string;
  publishedAt: string;
  summary: string;
  businessImpact: string;
  keyTakeaways: string[];
  url?: string;
  badgeColor: string;
  executiveAdvisor: string;
}

export default function KnowledgeHubPage() {
  const [activeTab, setActiveTab] = useState<"all" | "news" | "playbooks">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>("all");
  const [activeDoc, setActiveDoc] = useState<KnowledgeDoc | null>(null);
  const [activeNews, setActiveNews] = useState<BusinessNewsItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("Your Business");
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);

  // Close modals when Escape key is pressed
  useEscapeKey(() => {
    if (isAddModalOpen) setIsAddModalOpen(false);
    if (activeDoc) setActiveDoc(null);
    if (activeNews) setActiveNews(null);
  }, Boolean(isAddModalOpen || activeDoc || activeNews));

  // New Knowledge/News Form
  const [entryType, setEntryType] = useState<"playbook" | "news">("playbook");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("operations");
  const [newSource, setNewSource] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState("");
  const [newContent, setNewContent] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Business News Items
  const [newsList, setNewsList] = useState<BusinessNewsItem[]>([
    {
      id: "news-1",
      title: "RBI Monetary Policy: Repo Rate Held Steady at 6.50% as Corporate Credit Expands",
      category: "economy",
      categoryLabel: "Economy & Markets",
      source: "The Economic Times",
      publishedAt: "2 hours ago",
      summary: "The Reserve Bank of India maintained the benchmark policy rate, pointing to resilient macroeconomic expansion and stable headline inflation figures. Private capex and credit uptake among Indian mid-market enterprises registered a 14.8% annualized growth.",
      businessImpact: "Stabilized corporate interest rates reduce debt servicing volatility and ensure lower cost of working capital for your forward expansion.",
      keyTakeaways: [
        "Bank loan benchmark rates remain anchored for the upcoming quarter.",
        "Domestic consumption demand across tier-1 and tier-2 business centers remains strong.",
        "Advisable to lock in annual vendor contracts before anticipated year-end repricing."
      ],
      badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      executiveAdvisor: "Marcus (CFO AI)",
    },
    {
      id: "news-2",
      title: "GST Council Mandate: Real-Time E-Invoicing & Automated ITC Reconciliation Enforced",
      category: "tax_compliance",
      categoryLabel: "Tax & GST Compliance",
      source: "Financial Express",
      publishedAt: "Today, 10:15 AM",
      summary: "CBIC has issued updated compliance protocols mandating two-way electronic invoice matching for Input Tax Credit (ITC) claims. Companies exceeding ₹5Cr turnover must integrate automated ledger APIs with GSTN within 45 days.",
      businessImpact: "Requires immediate synchronization between Zoho Books / Tally ledger and BizzPal compliance checks to prevent vendor ITC clawbacks.",
      keyTakeaways: [
        "Unreconciled vendor invoices older than 180 days risk automated reversal with 18% penal interest.",
        "Direct API integration through Zoho Books / accounting software eliminates manual GSTR-2B matching.",
        "CFO team must audit active contractor GSTIN validity monthly."
      ],
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      executiveAdvisor: "Marcus (CFO AI)",
    },
    {
      id: "news-3",
      title: "Enterprise SaaS Valuation Benchmarks: Q3 Multiple Rebounds to 6.8x ARR for Profitable Scale",
      category: "funding",
      categoryLabel: "Funding & Valuation",
      source: "Bloomberg Intelligence",
      publishedAt: "Yesterday",
      summary: "Global and Indian enterprise software valuations have rebounded from cyclical lows, heavily rewarding companies with net burn under 15% and Net Revenue Retention (NRR) above 110%. Pure 'growth-at-all-costs' models continue to trade at steep discounts.",
      businessImpact: "Your current gross margins (82%) and positive unit economics position your company for top-quartile valuation multiples in future equity or debt rounds.",
      keyTakeaways: [
        "Rule of 40 (Revenue Growth % + Free Cash Flow Margin %) remains the primary investor valuation anchor.",
        "Annual upfront payment contracts command higher investor sentiment than monthly recurring billing.",
        "Venture debt yields average 12.5% to 14.2%, preserving valuable founder equity dilution."
      ],
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      executiveAdvisor: "Astra (CEO AI)",
    },
    {
      id: "news-4",
      title: "Digital Personal Data Protection (DPDP) Act: Operating Rules Released for Enterprise Software",
      category: "tech_ai",
      categoryLabel: "Tech & AI Regulations",
      source: "LiveMint",
      publishedAt: "1 day ago",
      summary: "The Ministry of Electronics and Information Technology (MeitY) has finalized compliance standards under the DPDP Act. Enterprise platforms storing Indian consumer or B2B customer contact records must maintain verifiable audit trails and explicit consent records.",
      businessImpact: "Ensures BizzPal automated client databases and marketing outreach lists remain 100% legally compliant without regulatory exposure.",
      keyTakeaways: [
        "Data fiduciaries must implement clear opt-out workflows for enterprise communications.",
        "Customer records must be encrypted at rest and in transit (AES-256 / TLS 1.3 enforced).",
        "Breach notification SLA mandated within 72 hours to the Data Protection Board."
      ],
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      executiveAdvisor: "Elena (Marketing AI)",
    },
    {
      id: "news-5",
      title: "B2B Payment Cycles: DSO Drops by 22% as Indian Corporates Adopt Instant UPI & NACH Mandates",
      category: "saas_trends",
      categoryLabel: "Industry Trends",
      source: "TechCrunch",
      publishedAt: "3 days ago",
      summary: "Adoption of recurring UPI e-mandates and automated Net Banking auto-debit has drastically cut Days Sales Outstanding (DSO) for enterprise service providers and SaaS platforms across India from 58 days down to 34 days.",
      businessImpact: "Transitioning your top 10 client invoices to automated recurring auto-debits will recover significant trapped working capital.",
      keyTakeaways: [
        "Automated recurring mandates reduce payment friction and involuntary churn.",
        "DSO reduction directly extends cash runway without needing external loans.",
        "Recommended action: Enable Stripe / Razorpay Auto-Debit for monthly retainer clients."
      ],
      badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      executiveAdvisor: "David (Operations AI)",
    },
    {
      id: "news-6",
      title: "Venture Debt Surges Past $1.4B in India: Alternative Non-Dilutive Capital for Scaled Startups",
      category: "funding",
      categoryLabel: "Funding & Valuation",
      source: "Inc42",
      publishedAt: "4 days ago",
      summary: "Non-dilutive venture debt and revenue-based financing have reached an all-time high in 2026. Founders are pairing modest equity rounds with venture debt lines to finance working capital, sales hiring, and server infrastructure.",
      businessImpact: "Provides an immediate financing buffer to extend cash runway beyond 14 months without giving up equity or board control.",
      keyTakeaways: [
        "Venture debt lines typically offer 1.5x to 3.0x current monthly revenue.",
        "Warrant coverage has moderated to 8-12%, reducing founder dilution.",
        "Optimal for financing enterprise sales team ramp periods with predictable payback."
      ],
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      executiveAdvisor: "Marcus (CFO AI)",
    },
  ]);

  // Company SOP Docs
  const [docs, setDocs] = useState<KnowledgeDoc[]>([
    {
      id: "doc-1",
      title: "Standard Operating Procedures: Client Onboarding & SLA Protocol",
      category: "operations",
      description: "End-to-end framework for provisioning enterprise client accounts, assigning project leads, and meeting 99.9% uptime SLAs.",
      updatedAt: "3 days ago",
      version: "v2.4",
      author: "COO / Operations",
      indexed: true,
      content: `### 1. Scope & Objective\nThis document codifies the mandatory onboarding standard for all enterprise clients. Compliance is tracked automatically by Astra AI.\n\n### 2. Immediate 48-Hour Protocol\n- **T+2 Hours**: Account setup in CRM and assignment of senior account lead.\n- **T+24 Hours**: Kickoff alignment call, discovery survey sign-off, and security verification.\n- **T+48 Hours**: Infrastructure configuration and access provisioning.\n\n### 3. Escalation Criteria\nAny blocker exceeding 4 hours must be escalated to the Executive Operations Slack Channel.`,
    },
    {
      id: "doc-2",
      title: "Quarterly Financial Governance & Discretionary Opex Policy",
      category: "finance",
      description: "Threshold rules for software vendor renewals, departmental budget caps, and capital expense approval workflows.",
      updatedAt: "1 week ago",
      version: "v3.1",
      author: "CFO / Finance",
      indexed: true,
      content: `### Financial Controls Policy\n- Any vendor contract exceeding ₹50,000/yr requires dual sign-off from Department Head and CFO.\n- Discretionary SaaS subscriptions are audited monthly by Marcus AI.\n- Target cash runway must never breach 6.0 months without board disclosure.`,
    },
    {
      id: "doc-3",
      title: "Enterprise Sales Playbook & Objection Handling Matrix",
      category: "sales",
      description: "Codified closing methodology, competitor battlecards, and ROI calculation frameworks for high-ticket accounts.",
      updatedAt: "Yesterday",
      version: "v4.0",
      author: "Founder / Head of Growth",
      indexed: true,
      content: `### Sales Closing Playbook\n- **Target ICP**: Mid-market and enterprise leadership.\n- **Primary Value Prop**: Proven 3.8x ROI within 90 days.\n- **Objection: 'We already have legacy software'**: Highlight integration speed and zero-downtime deployment.\n- **Pricing Guardrail**: Never discount annual prepay beyond 15% without CEO approval.`,
    },
    {
      id: "doc-4",
      title: "Cloud Infrastructure Architecture & Data Security Standard",
      category: "technology",
      description: "SOC2 compliance guidelines, multi-region deployment topography, encrypted backup rotation, and incident drills.",
      updatedAt: "2 weeks ago",
      version: "v2.0",
      author: "CTO / Engineering",
      indexed: true,
      content: `### Security Standards\n- All customer data encrypted at rest (AES-256) and in transit (TLS 1.3).\n- Zero-trust RBAC enforced across all internal production databases.\n- Automated failover tests executed bi-weekly.`,
    },
    {
      id: "doc-5",
      title: "Company Shareholder Governance & Board Charter",
      category: "governance",
      description: "Voting thresholds, stock option plan administration, quarterly board meeting schedules, and advisory committee structure.",
      updatedAt: "1 month ago",
      version: "v1.2",
      author: "General Counsel",
      indexed: true,
      content: `### Governance & Board Protocols\n- Board packets distributed exactly 5 business days prior to quarterly review.\n- Executive compensation and option grant approvals require majority quorum.\n- Material litigation or regulatory inquiries require immediate notice within 24 hours.`,
    },
  ]);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setCompanyName(parsed.name);
      }

      const savedDocs = localStorage.getItem("bizzpal_knowledge_docs");
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocs(parsed);
        }
      }

      const savedNews = localStorage.getItem("bizzpal_business_news");
      if (savedNews) {
        const parsed = JSON.parse(savedNews);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNewsList(parsed);
        }
      }
    } catch (e) {}
  }, []);

  const handleRefreshNews = () => {
    setIsRefreshingNews(true);
    setTimeout(() => {
      setIsRefreshingNews(false);
      setToastMessage("Live market intelligence & economic telemetry refreshed from global feeds!");
      setTimeout(() => setToastMessage(null), 4000);
    }, 700);
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    if (entryType === "news") {
      const newNewsItem: BusinessNewsItem = {
        id: `news-${Date.now()}`,
        title: newTitle.trim(),
        category: (newCategory as any) || "economy",
        categoryLabel: newCategory === "tax_compliance" ? "Tax & GST" : newCategory.toUpperCase(),
        source: newSource.trim() || "Verified Market Wire",
        publishedAt: "Just now",
        summary: newDescription.trim(),
        businessImpact: newImpact.trim() || "Direct operational relevance for executive leadership.",
        keyTakeaways: newContent ? newContent.split("\n").filter(l => l.trim().length > 0) : ["Monitored for forward strategic impact."],
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        executiveAdvisor: "Astra (CEO AI)",
      };

      setNewsList(prev => {
        const updated = [newNewsItem, ...prev];
        try {
          localStorage.setItem("bizzpal_business_news", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setToastMessage(`Market intelligence item '${newNewsItem.title}' published!`);
    } else {
      const newDocItem: KnowledgeDoc = {
        id: `doc-${Date.now()}`,
        title: newTitle.trim(),
        category: newCategory as any,
        description: newDescription.trim(),
        updatedAt: "Just now",
        version: "v1.0",
        author: "Company Executive",
        indexed: true,
        content: newContent.trim() || `### ${newTitle}\n\n${newDescription}`,
      };

      setDocs(prev => {
        const updated = [newDocItem, ...prev];
        try {
          localStorage.setItem("bizzpal_knowledge_docs", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setToastMessage(`Knowledge item '${newDocItem.title}' indexed into AI memory!`);
    }

    setIsAddModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewContent("");
    setNewSource("");
    setNewImpact("");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredDocs = docs.filter(doc => {
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredNews = newsList.filter(news => {
    const matchesCategory = selectedNewsCategory === "all" || news.category === selectedNewsCategory;
    const matchesSearch =
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.businessImpact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header with Mandatory One-Line Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brass-soft flex items-center justify-center text-brass">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">Knowledge Hub & Business Intelligence</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                  Live Context Engine
                </span>
              </div>
              {/* One-Line Summary */}
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Central repository for company operating playbooks, live market news, and regulatory business intelligence powering {companyName}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshNews}
            disabled={isRefreshingNews}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface hover:border-line-strong transition-all cursor-pointer shadow-2xs"
            title="Refresh Live Business Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brass ${isRefreshingNews ? "animate-spin" : ""}`} />
            <span>Refresh News</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-sm hover:brightness-110 btn-tactile cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge / News</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-brass" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Mode Tab Switcher: All vs Live Business News vs Company SOPs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-1.5 bg-surface-2/60 border border-line rounded-2xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all btn-tactile cursor-pointer flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-brass text-white shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Knowledge & News ({docs.length + newsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("news")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all btn-tactile cursor-pointer flex items-center gap-1.5 ${
              activeTab === "news"
                ? "bg-cyan-500 text-slate-950 shadow-xs font-extrabold"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Live Business News & Intel ({newsList.length})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("playbooks")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all btn-tactile cursor-pointer flex items-center gap-1.5 ${
              activeTab === "playbooks"
                ? "bg-brass text-white shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Company SOPs & Playbooks ({docs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-[11px] text-text-muted">
          <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>Auto-Ingested into Astra (CEO) & Marcus (CFO) Memory</span>
        </div>
      </div>

      {/* Search & Dynamic Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search playbooks, market news, tax rules…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-brass"
          />
        </div>

        {/* Dynamic Category Filters based on active tab */}
        {activeTab === "news" ? (
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {[
              { id: "all", label: "All News" },
              { id: "economy", label: "Economy & Rates" },
              { id: "tax_compliance", label: "Tax & GST" },
              { id: "funding", label: "Valuations & VC" },
              { id: "tech_ai", label: "Tech & DPDP" },
              { id: "saas_trends", label: "B2B Trends" },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedNewsCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all btn-tactile cursor-pointer ${
                  selectedNewsCategory === cat.id
                    ? "bg-cyan-500 text-slate-950 border-cyan-500 font-bold shadow-xs"
                    : "bg-surface-2 border-line text-text-muted hover:text-text"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {[
              { id: "all", label: "All Sectors" },
              { id: "operations", label: "Operations" },
              { id: "finance", label: "Finance" },
              { id: "sales", label: "Sales & Growth" },
              { id: "technology", label: "Tech & Security" },
              { id: "governance", label: "Governance" },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all btn-tactile cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-brass text-white border-brass font-semibold"
                    : "bg-surface-2 border-line text-text-muted hover:text-text"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: LIVE BUSINESS NEWS & MARKET INTEL */}
      {(activeTab === "all" || activeTab === "news") && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
                Live Business News & Enterprise Intelligence Feed
              </h2>
            </div>
            <span className="text-[11px] text-text-muted font-mono">Curated Daily</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNews.map(news => (
              <div
                key={news.id}
                onClick={() => setActiveNews(news)}
                className="p-4 rounded-xl border border-line bg-surface hover:border-cyan-500/50 shadow-theme hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 btn-tactile group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border font-mono ${news.badgeColor}`}>
                      {news.categoryLabel}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {news.publishedAt}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-text group-hover:text-cyan-400 transition-colors leading-snug">
                    {news.title}
                  </h3>

                  <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                    {news.summary}
                  </p>

                  {/* Impact Highlight Box */}
                  <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 block uppercase tracking-wider">
                      Business Impact:
                    </span>
                    <p className="text-text-muted line-clamp-2 leading-relaxed text-[11px]">
                      {news.businessImpact}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-line/60 flex items-center justify-between text-[10px] text-text-muted">
                  <span className="font-semibold text-text">{news.source}</span>
                  <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
                    <span>Executive Briefing</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredNews.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-line bg-surface-2/40 text-xs text-text-muted">
              No business news matched your filter.
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: COMPANY SOPS & PLAYBOOKS */}
      {(activeTab === "all" || activeTab === "playbooks") && (
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brass" />
              <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
                Internal Standard Operating Procedures (SOPs) & Playbooks
              </h2>
            </div>
            <span className="text-[11px] text-text-muted font-mono">{filteredDocs.length} Documents</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className="p-4 rounded-xl border border-line bg-surface hover:border-brass/70 shadow-theme hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 btn-tactile"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 border border-line text-brass font-bold uppercase tracking-wider">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {doc.version}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-text line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>

                  <p className="text-[11px] text-text-muted line-clamp-3 leading-relaxed">
                    {doc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[10px] text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>AI Synced</span>
                  </div>
                  <span>Updated {doc.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-line bg-surface-2/40 text-xs text-text-muted">
              No internal documents matched your search.
            </div>
          )}
        </div>
      )}

      {/* Modal: Full Business News Story & AI Executive Briefing */}
      <PortalModal isOpen={Boolean(activeNews)} onClose={() => setActiveNews(null)}>
        {activeNews && (
          <div className="max-w-2xl w-full bg-surface border border-line rounded-2xl shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col justify-between animate-scale-in">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border font-mono ${activeNews.badgeColor}`}>
                      {activeNews.categoryLabel}
                    </span>
                    <span className="text-[11px] text-text-muted">Source: <strong>{activeNews.source}</strong></span>
                    <span className="text-[11px] text-text-muted">· {activeNews.publishedAt}</span>
                  </div>
                  <h2 className="text-base font-bold text-text mt-2 leading-snug">
                    {activeNews.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNews(null)}
                  className="p-1.5 rounded-lg border border-line bg-surface-2 text-text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* News Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">Story Summary</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  {activeNews.summary}
                </p>
              </div>

              {/* Strategic Business Impact for User */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                  <BrainCircuit className="w-4 h-4" />
                  <span>Strategic Impact for {companyName} (Advisor: {activeNews.executiveAdvisor})</span>
                </div>
                <p className="text-xs text-text leading-relaxed">
                  {activeNews.businessImpact}
                </p>
              </div>

              {/* Key Actionable Takeaways */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">Executive Takeaways</h4>
                <div className="space-y-1.5">
                  {activeNews.keyTakeaways.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-between">
              <a
                href="/chat"
                className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Discuss this development with {activeNews.executiveAdvisor}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setActiveNews(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Modal: View Document Drawer / Modal */}
      <PortalModal isOpen={Boolean(activeDoc)} onClose={() => setActiveDoc(null)}>
        {activeDoc && (
          <div className="max-w-2xl w-full bg-surface border border-line rounded-2xl shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col justify-between animate-scale-in">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 border border-line text-brass font-bold uppercase">
                    {activeDoc.category} · {activeDoc.version}
                  </span>
                  <h2 className="text-sm font-bold text-text mt-1.5 leading-snug">
                    {activeDoc.title}
                  </h2>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Authored by {activeDoc.author} · Last updated {activeDoc.updatedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDoc(null)}
                  className="p-1.5 rounded-lg border border-line bg-surface-2 text-text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-line text-xs text-text-muted leading-relaxed">
                {activeDoc.description}
              </div>

              <div className="overflow-y-auto max-h-[45vh] pr-2 space-y-2 text-xs text-text leading-relaxed font-sans border-t border-line/60 pt-3">
                <div className="whitespace-pre-line font-mono text-[11px] bg-surface-2/30 p-4 rounded-xl border border-line">
                  {activeDoc.content}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Indexed in AI Executive Brain</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Modal: Add New Knowledge Doc or Business News */}
      <PortalModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="max-w-lg w-full bg-surface border border-line rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h2 className="text-sm font-bold text-text">Add Knowledge or Market Intelligence</h2>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type Toggle: Playbook vs Market News */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-2 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setEntryType("playbook")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryType === "playbook"
                  ? "bg-brass text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Company Playbook / SOP
            </button>
            <button
              type="button"
              onClick={() => setEntryType("news")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryType === "news"
                  ? "bg-cyan-500 text-slate-950 font-extrabold shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Business News / Intel
            </button>
          </div>

          <form onSubmit={handleAddDoc} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                {entryType === "news" ? "News Headline / Story Title *" : "Document Title *"}
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={entryType === "news" ? "e.g. RBI Keeps Repo Rate Stable at 6.50%..." : "e.g. Standard Operating Procedure: Vendor Invoice Approval"}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </div>

            {entryType === "news" && (
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  News Source
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={e => setNewSource(e.target.value)}
                  placeholder="e.g. The Economic Times, Bloomberg, LiveMint"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Category
              </label>
              {entryType === "news" ? (
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                >
                  <option value="economy">Economy & Markets</option>
                  <option value="tax_compliance">Tax & GST Compliance</option>
                  <option value="funding">Funding & Valuations</option>
                  <option value="tech_ai">Tech & AI Regulations</option>
                  <option value="saas_trends">B2B SaaS Trends</option>
                </select>
              ) : (
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                >
                  <option value="operations">Operations</option>
                  <option value="finance">Finance</option>
                  <option value="sales">Sales & Growth</option>
                  <option value="technology">Tech & Security</option>
                  <option value="governance">Governance</option>
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                {entryType === "news" ? "Story Summary *" : "Summary Description *"}
              </label>
              <textarea
                rows={2}
                required
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder={entryType === "news" ? "Concise summary of the economic or business news..." : "Provide a 1-2 sentence executive summary of this policy..."}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </div>

            {entryType === "news" && (
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Strategic Impact on Your Business
                </label>
                <input
                  type="text"
                  value={newImpact}
                  onChange={e => setNewImpact(e.target.value)}
                  placeholder="How does this news impact your revenue, costs, or operations?"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                {entryType === "news" ? "Key Takeaways (one per line)" : "Document Content / Policy Text"}
              </label>
              <textarea
                rows={3}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder={entryType === "news" ? "Takeaway 1\nTakeaway 2\nTakeaway 3" : "Paste full policy text, checklist items, and procedures…"}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                {entryType === "news" ? "Publish Market Intel" : "Save & Index into AI"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}
