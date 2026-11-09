"use client";

import React, { useState } from "react";
import { Search, FileText, FileSpreadsheet, FileCode, RefreshCw } from "lucide-react";

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
      label: "Last year's marketing strategy",
      query: "What marketing strategy did we use last year, and how successful was it?",
    },
    {
      label: "Cash runway and burn rules",
      query: "What are our cash runway and burn protocols?",
    },
    {
      label: "Sales benchmarks and margins",
      query: "What are our core enterprise sales benchmarks and margins?",
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
      <div className="rounded-xl bg-surface border border-line p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text">Ask your company memory</h2>
          <p className="text-sm text-text-muted mt-1">
            Answers come from your uploaded documents and approved facts, with sources.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What are our cash runway rules?"
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-5 py-2.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isLoading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm">
          <span className="text-text-muted">Try:</span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSearch(sq.query)}
              className="text-text-muted hover:text-brass hover:underline cursor-pointer"
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-rust/30 bg-rust/5 text-sm text-rust">
          <span>{error}</span>
        </div>
      )}

      {/* Answer Output */}
      {result && (
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
            <div>
              <h3 className="text-base font-semibold text-text">Answer</h3>
              <p className="text-xs text-text-muted mt-0.5">Based on {result.citations.length} source passages</p>
            </div>
            <span className={`text-xs font-medium ${result.hasSufficientContext ? "text-jade" : "text-amber-500"}`}>
              {result.hasSufficientContext ? "Backed by your documents" : "Limited source coverage"}
            </span>
          </div>

          {/* AI Response Body */}
          <div className="text-sm text-text leading-relaxed whitespace-pre-line">
            {result.answer}
          </div>

          {/* Fact vs Inference Separation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-line space-y-2">
              <h4 className="text-sm font-semibold text-text">From your sources</h4>
              {result.verifiedFacts.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-text-muted list-disc pl-4">
                  {result.verifiedFacts.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">Nothing quoted directly.</p>
              )}
            </div>

            <div className="p-4 rounded-lg border border-line space-y-2">
              <h4 className="text-sm font-semibold text-text">Inferred</h4>
              {result.inferredConclusions.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-text-muted list-disc pl-4">
                  {result.inferredConclusions.map((inf, idx) => (
                    <li key={idx}>{inf}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">No conclusions inferred.</p>
              )}
            </div>
          </div>

          {result.citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text">Sources ({result.citations.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.citations.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveCitation(c)}
                    className="text-left p-3.5 rounded-lg border border-line hover:border-line-strong space-y-2 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-text truncate">{c.documentTitle}</span>
                      <span className="text-xs text-text-muted shrink-0">{(c.similarity * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">&ldquo;{c.snippet}&rdquo;</p>
                    <p className="text-xs text-text-muted">
                      {c.sectionTitle || "General"} · Page {c.pageNumber || 1}
                    </p>
                  </button>
                ))}
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
