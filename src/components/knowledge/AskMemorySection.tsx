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
    "What marketing strategy did we use last year, and how successful was it?",
    "What are our cash runway and burn protocols?",
    "What are our core enterprise sales benchmarks and margins?",
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

  return (
    <div className="space-y-6">
      {/* Search Input Banner */}
      <div className="relative rounded-2xl p-6 bg-gradient-to-br from-surface to-surface-2 border border-line shadow-xs overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brass/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-brass">
              Persistent Company Memory • pgvector Semantic Search
            </span>
          </div>

          <h2 className="text-xl font-bold text-text">
            Ask BizzPal about {companyName}&apos;s Knowledge & Strategy
          </h2>

          <p className="text-xs text-text-muted leading-relaxed">
            Query all uploaded contracts, board memos, quarterly reports, and business records using natural language.
            BizzPal searches vector embeddings, retrieves exact citations, and separates verified facts from inferences.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything (e.g. What marketing strategy did we use last year, and how successful was it?)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:border-brass/70 focus:ring-1 focus:ring-brass/30 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Retrieving…" : "Query Memory"}</span>
            </button>
          </form>

          {/* Sample Prompts */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-text-muted font-medium">Try asking:</span>
            {sampleQuestions.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSearch(sq)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-2/80 hover:bg-surface border border-line hover:border-line-strong text-text-muted hover:text-text transition-all cursor-pointer text-left"
              >
                &ldquo;{sq}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer Output */}
      {result && (
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-6 shadow-xs animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brass-soft flex items-center justify-center text-brass">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Synthesized Business Intelligence Answer</h3>
                <p className="text-[11px] text-text-muted">
                  Grounded response with {result.citations.length} document citations
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                result.hasSufficientContext
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}
            >
              {result.hasSufficientContext ? "Source-Backed & Grounded" : "Limited Document Coverage"}
            </span>
          </div>

          {/* AI Response Body */}
          <div className="prose prose-invert max-w-none text-xs text-text/90 leading-relaxed space-y-3 whitespace-pre-line bg-surface-2/40 p-4 rounded-xl border border-line">
            {result.answer}
          </div>

          {/* Fact vs Inference Separation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Verified Facts */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Business Facts (From Sources)</span>
              </div>
              {result.verifiedFacts.length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-text-muted">
                  {result.verifiedFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-text-muted">Extracted directly from matched document sections.</p>
              )}
            </div>

            {/* Inferred Conclusions */}
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <HelpCircle className="w-4 h-4" />
                <span>Inferred Conclusions & Recommendations</span>
              </div>
              {result.inferredConclusions.length > 0 ? (
                <ul className="space-y-1.5 text-[11px] text-text-muted">
                  {result.inferredConclusions.map((inf, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{inf}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Conclusions inferred based on historical metrics and strategic context.
                </p>
              )}
            </div>
          </div>

          {/* Citations & Evidence Sources */}
          {result.citations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brass" />
                <span>Supporting Source Evidence ({result.citations.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.citations.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveCitation(c)}
                    className="p-3.5 rounded-xl bg-surface-2 border border-line hover:border-brass/40 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-text group-hover:text-brass transition-colors line-clamp-1">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-brass" />
                        <span>{c.documentTitle}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-line text-text-muted shrink-0 font-mono">
                        {(c.similarity * 100).toFixed(0)}% Match
                      </span>
                    </div>

                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                      &ldquo;{c.snippet}&rdquo;
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-text-muted/70 pt-1 border-t border-line/60">
                      <span>Section: {c.sectionTitle || "General"}</span>
                      <span>Page {c.pageNumber || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citation Snippet Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brass" />
                <h4 className="text-sm font-bold text-text">{activeCitation.documentTitle}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-text-muted space-y-1">
              <div><strong>File:</strong> {activeCitation.fileName}</div>
              <div><strong>Section:</strong> {activeCitation.sectionTitle || "General"} (Page {activeCitation.pageNumber || 1})</div>
              <div><strong>Vector Similarity Score:</strong> {(activeCitation.similarity * 100).toFixed(1)}%</div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-line text-xs text-text/90 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {activeCitation.snippet}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
