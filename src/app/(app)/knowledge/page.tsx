"use client";

import React, { useState, useEffect } from "react";
import { Plus, ExternalLink, X, RefreshCw, Cloud } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { DocumentsManager } from "@/components/knowledge/DocumentsManager";
import { FactsManager } from "@/components/knowledge/FactsManager";
import {
  CloudDrivePickerModal,
  GoogleDriveIcon,
  OneDriveIcon,
  CloudDriveFileResult,
} from "@/components/integrations/CloudDrivePickerModal";
import { loadWorkspaceState, saveWorkspaceState } from "@/lib/workspace/stateClient";

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
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [cloudPickerProvider, setCloudPickerProvider] = useState<"google" | "onedrive">("google");

  const handleCloudImport = (result: CloudDriveFileResult) => {
    setEntryType("playbook");
    if (!newTitle.trim()) {
      setNewTitle(result.fileName.replace(/\.[^/.]+$/, ""));
    }
    if (!newDescription.trim()) {
      setNewDescription(`Business document imported from ${result.sourceProvider === "google_drive" ? "Google Drive" : "OneDrive"}.`);
    }
    setNewContent(result.content);
    setToastMessage(`Loaded ${result.fileName} from ${result.sourceProvider === "google_drive" ? "Google Drive" : "OneDrive"}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live business news (loaded from the news feeds below; nothing is pre-written)
  const [newsList, setNewsList] = useState<BusinessNewsItem[]>([]);

  // The company's own documents and playbooks. Only what the team adds appears here.
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);

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
    let active = true;
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setCompanyName(parsed.name);
      }
    } catch {}

    fetch("/api/business/intake", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (active && d?.success && d.business?.name) {
          setCompanyName(d.business.name);
        }
      })
      .catch(() => {});

    const sanitizeDocsList = (parsed: KnowledgeDoc[]) =>
      parsed.map((d: KnowledgeDoc) => ({
        ...d,
        content: (d.content || "")
          .replace(/Astra\s*\(CEO\s*AI\)/gi, "CEO")
          .replace(/Astra\s*AI/gi, "CEO AI")
          .replace(/Marcus\s*\(CFO\s*AI\)/gi, "CFO")
          .replace(/Marcus\s*AI/gi, "CFO AI")
          .replace(/Elena\s*\(Marketing\s*AI\)/gi, "Marketing")
          .replace(/Elena\s*AI/gi, "Marketing AI"),
      }));

    loadWorkspaceState<KnowledgeDoc[]>("knowledge_playbooks", "bizzpal_knowledge_docs")
      .then(parsed => {
        if (active && Array.isArray(parsed) && parsed.length > 0) {
          setDocs(sanitizeDocsList(parsed));
        }
      })
      .catch(() => {});

    try {
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
    return () => { active = false; };
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
        saveWorkspaceState("knowledge_playbooks", updated, "bizzpal_knowledge_docs").catch(() => {});
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
              No news yet. It loads from live news feeds. Press Refresh if it stays empty.
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
              Nothing here yet. Add your own company playbooks and documents with the Add button.
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

              {/* Strategic Business Impact for User (only if provided) */}
              {activeNews.businessImpact && (
                <div className="p-4 rounded-lg bg-surface-2 border border-line space-y-1.5">
                  <p className="text-xs font-semibold text-text">Impact on {companyName}</p>
                  <p className="text-xs text-text leading-relaxed">
                    {activeNews.businessImpact}
                  </p>
                </div>
              )}

              {/* Key Actionable Takeaways (only if present) */}
              {Array.isArray(activeNews.keyTakeaways) && activeNews.keyTakeaways.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider">Key Takeaways</h4>
                  <div className="space-y-1.5">
                    {activeNews.keyTakeaways.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <a
                  href={`/chat?advisor=${encodeURIComponent(
                    (activeNews.executiveAdvisor || "ceo").toLowerCase()
                  )}&prompt=${encodeURIComponent(
                    `Analyze how this market development impacts ${companyName}: "${activeNews.title}" — ${activeNews.summary}`
                  )}`}
                  className="text-xs font-semibold text-brass hover:underline flex items-center gap-1"
                >
                  <span>Discuss with {activeNews.executiveAdvisor}</span>
                </a>
                {activeNews.url && (
                  <a
                    href={activeNews.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-muted hover:text-text hover:underline inline-flex items-center gap-1"
                  >
                    <span>Source article</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
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

              <div className="overflow-y-auto max-h-[45vh] pr-2 space-y-2 text-xs text-text leading-relaxed font-sans border-t border-line pt-3">
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

          {/* Cloud Storage Quick Ingest */}
          <div className="p-2.5 rounded-xl bg-surface-2 border border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Cloud className="w-4 h-4 text-brass shrink-0" />
              <span>Import from Cloud:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCloudPickerProvider("google");
                  setIsCloudPickerOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass text-text text-xs cursor-pointer shadow-2xs transition-colors"
              >
                <GoogleDriveIcon className="w-3.5 h-3.5" />
                <span>Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCloudPickerProvider("onedrive");
                  setIsCloudPickerOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass text-text text-xs cursor-pointer shadow-2xs transition-colors"
              >
                <OneDriveIcon className="w-3.5 h-3.5" />
                <span>OneDrive</span>
              </button>
            </div>
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

      <CloudDrivePickerModal
        isOpen={isCloudPickerOpen}
        onClose={() => setIsCloudPickerOpen(false)}
        onFileSelect={handleCloudImport}
        initialProvider={cloudPickerProvider}
        title="Import into Knowledge Hub"
        description="Select policies, playbooks, guidelines or news docs from your Google Drive or Microsoft OneDrive."
      />
    </div>
  );
}
