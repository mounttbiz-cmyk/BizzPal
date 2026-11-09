"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, ExternalLink, X, RefreshCw, Scale } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { DocumentsManager } from "@/components/knowledge/DocumentsManager";
import { FactsManager } from "@/components/knowledge/FactsManager";

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
  const [activeTab, setActiveTab] = useState<"documents" | "facts" | "playbooks" | "news">("playbooks");
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
      executiveAdvisor: "CFO",
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
      executiveAdvisor: "CFO",
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
      executiveAdvisor: "CEO",
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
      executiveAdvisor: "Marketing",
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
      executiveAdvisor: "Operations",
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
      executiveAdvisor: "CFO",
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
      content: `### 1. Scope & Objective\nThis document codifies the mandatory onboarding standard for all enterprise clients. Compliance is tracked automatically by CEO AI.\n\n### 2. Immediate 48-Hour Protocol\n- **T+2 Hours**: Account setup in CRM and assignment of senior account lead.\n- **T+24 Hours**: Kickoff alignment call, discovery survey sign-off, and security verification.\n- **T+48 Hours**: Infrastructure configuration and access provisioning.\n\n### 3. Escalation Criteria\nAny blocker exceeding 4 hours must be escalated to the Executive Operations Slack Channel.`,
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
      content: `### Financial Controls Policy\n- Any vendor contract exceeding ₹50,000/yr requires dual sign-off from Department Head and CFO.\n- Discretionary SaaS subscriptions are audited monthly by CFO AI.\n- Target cash runway must never breach 6.0 months without board disclosure.`,
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

  // Fetch live news from Google RSS API
  const fetchLiveNews = async (showToast = false) => {
    setIsRefreshingNews(true);
    try {
      const res = await fetch("/api/news?category=all&limit=6", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.news) && data.news.length > 0) {
        setNewsList(data.news);
        try {
          localStorage.setItem("bizzpal_business_news", JSON.stringify(data.news));
        } catch {}
        if (showToast) {
          setToastMessage(
            `News refreshed — ${data.news.length} stories from ${data.sources} feeds!`
          );
          setTimeout(() => setToastMessage(null), 4000);
        }
      } else if (showToast) {
        setToastMessage("News feeds returned no new items. Showing cached data.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.warn("Failed to fetch live news, using fallback:", err);
      if (showToast) {
        setToastMessage("Could not reach news feeds. Showing cached intelligence.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } finally {
      setIsRefreshingNews(false);
    }
  };

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
          const sanitizedDocs = parsed.map((d: KnowledgeDoc) => ({
            ...d,
            content: (d.content || "")
              .replace(/Astra\s*\(CEO\s*AI\)/gi, "CEO")
              .replace(/Astra\s*AI/gi, "CEO AI")
              .replace(/Marcus\s*\(CFO\s*AI\)/gi, "CFO")
              .replace(/Marcus\s*AI/gi, "CFO AI")
              .replace(/Elena\s*\(Marketing\s*AI\)/gi, "Marketing")
              .replace(/Elena\s*AI/gi, "Marketing AI"),
          }));
          setDocs(sanitizedDocs);
        }
      }

      const savedNews = localStorage.getItem("bizzpal_business_news");
      if (savedNews) {
        const parsed = JSON.parse(savedNews);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitizedNews = parsed.map((n: BusinessNewsItem) => {
            let adv = n.executiveAdvisor || "CEO";
            if (adv.includes("Astra") || adv.includes("CEO")) adv = "CEO";
            else if (adv.includes("Marcus") || adv.includes("CFO")) adv = "CFO";
            else if (adv.includes("Elena") || adv.includes("Marketing")) adv = "Marketing";
            else if (adv.includes("David") || adv.includes("Operations")) adv = "Operations";
            else if (adv.includes("Vikram") || adv.includes("Sales")) adv = "Sales";
            return {
              ...n,
              executiveAdvisor: adv,
            };
          });
          setNewsList(sanitizedNews);
        }
      }
    } catch (e) {}

    // Auto-fetch live news on mount
    fetchLiveNews(false);
  }, []);

  const handleRefreshNews = () => {
    fetchLiveNews(true);
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
        executiveAdvisor: "CEO",
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
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Knowledge Hub</h1>
          <p className="text-sm text-text-muted mt-1">
            Documents, facts and market news that {companyName}&apos;s AI advisors use to answer questions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshNews}
            disabled={isRefreshingNews}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingNews ? "animate-spin" : ""}`} />
            Refresh news
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </header>

      {toastMessage && (
        <p className="p-3 rounded-lg border border-line bg-surface-2 text-sm text-text">{toastMessage}</p>
      )}

      <nav aria-label="Knowledge hub sections" className="flex items-center gap-1 border-b border-line overflow-x-auto overflow-y-hidden">
        {[
          { id: "playbooks" as const, label: "Playbooks" },
          { id: "news" as const, label: "News" },
          { id: "documents" as const, label: "Documents" },
          { id: "facts" as const, label: "Facts" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 pb-2.5 -mb-px text-sm whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? "border-brass text-text font-semibold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* SECTION: COMPANY DOCUMENTS INGESTION */}
      {activeTab === "documents" && (
        <DocumentsManager />
      )}

      {/* SECTION: PERSISTENT BUSINESS FACTS */}
      {activeTab === "facts" && (
        <FactsManager />
      )}

      {(activeTab === "playbooks" || activeTab === "news") && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === "news" ? "Search news…" : "Search playbooks…"}
            className="flex-1 sm:max-w-sm px-3.5 py-2 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
          {activeTab === "news" ? (
            <select
              value={selectedNewsCategory}
              onChange={e => setSelectedNewsCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-text cursor-pointer"
              aria-label="News category"
            >
              <option value="all">All topics</option>
              <option value="economy">Economy & rates</option>
              <option value="tax_compliance">Tax & GST</option>
              <option value="funding">Valuations & VC</option>
              <option value="tech_ai">Tech & DPDP</option>
              <option value="saas_trends">B2B trends</option>
            </select>
          ) : (
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-text cursor-pointer"
              aria-label="Playbook category"
            >
              <option value="all">All departments</option>
              <option value="operations">Operations</option>
              <option value="finance">Finance</option>
              <option value="sales">Sales & growth</option>
              <option value="technology">Tech & security</option>
              <option value="governance">Governance</option>
            </select>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNews.map(news => (
              <button
                key={news.id}
                type="button"
                onClick={() => setActiveNews(news)}
                className="text-left p-4 rounded-xl border border-line bg-surface hover:border-line-strong flex flex-col gap-2 cursor-pointer"
              >
                <p className="text-xs text-text-muted">
                  {news.categoryLabel} · {news.publishedAt}
                </p>
                <h3 className="text-sm font-semibold text-text leading-snug">{news.title}</h3>
                <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">{news.businessImpact}</p>
                <p className="text-xs text-text-muted mt-auto pt-2">{news.source}</p>
              </button>
            ))}
          </div>

          {filteredNews.length === 0 && (
            <p className="p-8 text-center rounded-xl border border-line text-sm text-text-muted">
              No news matches your filter.
            </p>
          )}
        </div>
      )}

      {activeTab === "playbooks" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDoc(doc)}
                className="text-left p-4 rounded-xl border border-line bg-surface hover:border-line-strong flex flex-col gap-2 cursor-pointer"
              >
                <p className="text-xs text-text-muted capitalize">
                  {doc.category} · {doc.version}
                </p>
                <h3 className="text-sm font-semibold text-text leading-snug">{doc.title}</h3>
                <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">{doc.description}</p>
                <p className="text-xs text-text-muted mt-auto pt-2">Updated {doc.updatedAt}</p>
              </button>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <p className="p-8 text-center rounded-xl border border-line text-sm text-text-muted">
              No playbooks match your search.
            </p>
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
                    <span className="text-xs text-text-muted">
                      {activeNews.categoryLabel} · {activeNews.source} · {activeNews.publishedAt}
                    </span>
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
              <div className="p-4 rounded-lg bg-surface-2 border border-line space-y-1.5">
                <p className="text-xs font-semibold text-text">Impact on {companyName}</p>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-between">
              <a
                href="/chat"
                className="text-xs font-semibold text-brass hover:underline flex items-center gap-1"
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
                  <span className="text-xs text-text-muted capitalize">
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
              <span className="text-xs text-text-muted">Available to your AI advisors</span>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Modal: Add New Knowledge Doc or Business News */}
      <PortalModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="max-w-lg w-full bg-surface border border-line rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h2 className="text-sm font-bold text-text">Add to Knowledge Hub</h2>
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
              Playbook
            </button>
            <button
              type="button"
              onClick={() => setEntryType("news")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryType === "news"
                  ? "bg-brass text-white"
                  : "text-text-muted hover:text-text"
              }`}
            >
              News item
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
                {entryType === "news" ? "Publish" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}
