"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  Search,
  Sparkles,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  Database,
  CornerDownLeft,
  X,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";

interface Citation {
  documentId: string;
  documentTitle: string;
  fileName: string;
  pageNumber?: number;
  sectionTitle?: string;
  snippet: string;
  similarity: number;
}

interface QueryResult {
  question: string;
  answer: string;
  hasSufficientContext: boolean;
  citations: Citation[];
  verifiedFacts: string[];
  inferredConclusions: string[];
  persistentBusinessFacts: {
    category: string;
    key: string;
    value: string;
    sourceCitation?: string;
  }[];
}

export function AskMemorySection({ companyName = "Your Business" }: { companyName?: string }) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const sampleQuestions = [
    {
      label: "Q4 Marketing Strategy & CAC",
      query: "What marketing strategy did we use last year, and how successful was it?",
      icon: Sparkles,
    },
    {
      label: "Cash Runway & Burn Safeguards",
      query: "What are our cash runway and burn protocols?",
      icon: ShieldCheck,
    },
    {
      label: "Enterprise Margin & Pricing Mandates",
      query: "What are our core enterprise sales benchmarks and margins?",
      icon: Database,
    },
  ];

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q) return;
    if (queryText) setQuestion(queryText);

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Failed to query company memory");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach Business Context Engine");
    } finally {
      setIsLoading(false);
    }
  };

  const getDocIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "xlsx") return FileSpreadsheet;
    if (ext === "json" || ext === "md") return FileCode;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Search Console Hero */}
      <div className="relative rounded-2xl bg-surface border border-line p-6 sm:p-7 shadow-theme overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brass/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider bg-brass/10 text-brass border border-brass/25">
              <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
              <span>pgvector Semantic Search</span>
            </span>
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-mono font-medium text-text-muted bg-surface-2 border border-line">
              <span>HNSW Cosine Operator</span>
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight font-sans">
              Natural Language Company Memory Console
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed max-w-3xl">
              Query verified business documents, board minutes, operational SOPs, and pricing policies. BizzPal returns source-backed evidence with grounded citations.
            </p>
          </div>

          {/* Search Bar Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="pt-2"
          >
            <div className="relative flex items-center rounded-xl bg-surface-2/80 border border-line hover:border-line-strong focus-within:border-brass/70 focus-within:ring-2 focus-within:ring-brass/20 transition-all p-1.5 shadow-inner">
              <div className="flex items-center justify-center pl-3 pr-2 text-text-muted">
                <Search className="w-4 h-4 text-brass" />
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask BizzPal anything about your business strategy, contracts, or financial history…"
                className="w-full bg-transparent py-2.5 pr-3 text-xs sm:text-sm text-text placeholder:text-text-muted/60 focus:outline-none"
              />
              {question && (
                <button
                  type="button"
                  onClick={() => setQuestion("")}
                  className="p-1.5 text-text-muted hover:text-text cursor-pointer mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Searching…" : "Search"}</span>
                <CornerDownLeft className="w-3 h-3 text-white/70 ml-0.5 hidden sm:inline-block" />
              </button>
            </div>
          </form>

          {/* Quick Prompt Capsules */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-mono text-text-muted/80 uppercase tracking-wider">Example Prompts:</span>
            {sampleQuestions.map((sq, i) => {
              const IconComp = sq.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSearch(sq.query)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line hover:border-brass/40 text-[11px] font-medium text-text-muted hover:text-text transition-all cursor-pointer text-left shadow-2xs group"
                >
                  <IconComp className="w-3 h-3 text-brass/70 group-hover:text-brass transition-colors" />
                  <span>{sq.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fade-in font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer Output */}
      {result && (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-7 space-y-6 shadow-theme animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shadow-2xs">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-text tracking-tight font-sans">
                  Synthesized Grounded Intelligence
                </h3>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">
                  Extracted from company vectors with {result.citations.length} cited source chunks
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider ${
                result.hasSufficientContext
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.hasSufficientContext ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>{result.hasSufficientContext ? "Verified Ground Truth" : "Limited Context Coverage"}</span>
            </span>
          </div>

          {/* AI Response Body */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface-2/60 border border-line text-xs sm:text-sm text-text/90 leading-relaxed space-y-3 whitespace-pre-line font-sans selection:bg-brass/20">
            {result.answer}
          </div>

          {/* Fact vs Inference Separation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Verified Facts */}
            <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 font-sans">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span>Verified Business Facts (From Source)</span>
              </div>
              {result.verifiedFacts.length > 0 ? (
                <ul className="space-y-2 text-xs text-text-muted">
                  {result.verifiedFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-muted">Extracted directly from matching vector chunks.</p>
              )}
            </div>

            {/* Inferred Conclusions */}
            <div className="p-4 sm:p-5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 font-sans">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span>Inferred Conclusions & Recommendations</span>
              </div>
              {result.inferredConclusions.length > 0 ? (
                <ul className="space-y-2 text-xs text-text-muted">
                  {result.inferredConclusions.map((inf, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{inf}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-muted">
                  Strategic deductions based on financial metrics and historical data.
                </p>
              )}
            </div>
          </div>

          {/* Citations & Evidence Sources */}
          {result.citations.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-brass" />
                  <span>Document Evidence Citations ({result.citations.length})</span>
                </h4>
                <span className="text-[11px] text-text-muted font-mono">Click card to inspect</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.citations.map((c, i) => {
                  const DocIcon = getDocIcon(c.fileName);
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveCitation(c)}
                      className="p-4 rounded-xl bg-surface-2/70 border border-line hover:border-brass/50 transition-all cursor-pointer group space-y-2.5 hover:shadow-theme"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center text-brass shrink-0 group-hover:border-brass/30">
                            <DocIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-text group-hover:text-brass transition-colors truncate">
                            {c.documentTitle}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface border border-line text-emerald-700 dark:text-emerald-400 shrink-0">
                          {(c.similarity * 100).toFixed(0)}% Match
                        </span>
                      </div>

                      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed italic">
                        &ldquo;{c.snippet}&rdquo;
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted/80 pt-2 border-t border-line/50">
                        <span className="truncate max-w-[140px]">{c.sectionTitle || "General Section"}</span>
                        <span>Page {c.pageNumber || 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citation Snippet Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text truncate max-w-[280px]">
                    {activeCitation.documentTitle}
                  </h4>
                  <p className="text-[10px] font-mono text-text-muted">{activeCitation.fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="w-7 h-7 rounded-lg bg-surface-2 border border-line text-text-muted hover:text-text flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-text-muted bg-surface-2/60 p-3 rounded-xl border border-line">
              <div>
                <span className="text-text-muted/60 block text-[10px]">SECTION</span>
                <span className="text-text font-bold">{activeCitation.sectionTitle || "General"}</span>
              </div>
              <div>
                <span className="text-text-muted/60 block text-[10px]">MATCH CONFIDENCE</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{(activeCitation.similarity * 100).toFixed(1)}% Cosine</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                Source Document Chunk Content:
              </span>
              <div className="p-4 rounded-xl bg-surface-2 border border-line text-xs text-text leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto shadow-inner">
                {activeCitation.snippet}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="h-8 px-4 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
