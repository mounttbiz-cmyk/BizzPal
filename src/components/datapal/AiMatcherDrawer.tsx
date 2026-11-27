"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, Target, X, CheckCircle2, ArrowRight } from "lucide-react";

interface AiMatcherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serviceDescription: string;
  onServiceDescriptionChange: (val: string) => void;
  onApplySuggestions: (requirement: string, categories: string[]) => void;
}

export function AiMatcherDrawer({
  isOpen,
  onClose,
  serviceDescription,
  onServiceDescriptionChange,
  onApplySuggestions,
}: AiMatcherDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inferredRequirement: string;
    recommendedCategories: string[];
    summary: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const fallbackKeywordMatch = (raw: string) => {
    const text = raw.toLowerCase();
    let req = "Normal Extract (All Business Details)";
    let cats = ["Dental Clinics", "Aesthetic & Dermatology Clinics"];

    if (text.includes("web") || text.includes("site") || text.includes("domain")) {
      req = "Missing Website";
      cats = ["Restaurants & Fine Dining", "Dental Clinics", "Automobile Service & Garage"];
    } else if (text.includes("seo") || text.includes("maps") || text.includes("google")) {
      req = "Missing Google Business Profile (GBP / Maps)";
      cats = ["Medical Clinics", "Lawyers & Advocates", "Salons & Hairdressers"];
    } else if (text.includes("chat") || text.includes("whatsapp")) {
      req = "Missing WhatsApp Business / Direct Chat";
      cats = ["Diagnostic Centers", "Clinics & Doctors", "Boutique Stores"];
    } else if (text.includes("social") || text.includes("instagram")) {
      req = "Missing Social Media Presence";
      cats = ["Cafes & Coffee Shops", "Aesthetic Clinics", "Jewelry & Watches"];
    }

    return {
      inferredRequirement: req,
      recommendedCategories: cats,
      summary: `Target ${cats.join(", ")} with directive "${req}".`,
    };
  };

  const handleAnalyze = async () => {
    if (!serviceDescription.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setStatusNote(null);

    try {
      const prompt = [
        "Given this B2B service pitch, choose the single best DataPal target directive from:",
        "- Normal Extract (All Business Details)",
        "- Missing Website",
        "- Missing Google Business Profile (GBP / Maps)",
        "- Missing WhatsApp Business / Direct Chat",
        "- Missing Social Media Presence",
        "And list 3 specific Indian local business categories (e.g. Dental Clinics, Aesthetic & Dermatology Clinics, Restaurants & Fine Dining, Automobile Service & Garage, Logistics & Warehousing, Real Estate Agencies) that would convert best.",
        'Respond strictly as compact JSON with keys: "inferredRequirement" (string), "recommendedCategories" (array of 3 strings), "summary" (1 sentence).',
        `Service pitch: ${serviceDescription.trim()}`,
      ].join("\n");

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, agentId: "marketing" }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && typeof data.text === "string") {
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.inferredRequirement && Array.isArray(parsed?.recommendedCategories) && parsed.recommendedCategories.length > 0) {
            setResult({
              inferredRequirement: String(parsed.inferredRequirement),
              recommendedCategories: parsed.recommendedCategories.slice(0, 5).map(String),
              summary: String(parsed.summary || `Target ${parsed.recommendedCategories.join(", ")} for ${parsed.inferredRequirement}.`),
            });
            setIsAnalyzing(false);
            return;
          }
        }
      }

      setStatusNote("AI advisor unavailable — showing quick keyword suggestions.");
      setResult(fallbackKeywordMatch(serviceDescription));
    } catch {
      setStatusNote("Could not reach AI service — showing quick keyword suggestions.");
      setResult(fallbackKeywordMatch(serviceDescription));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplySuggestions(result.inferredRequirement, result.recommendedCategories);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Smart Matcher & Pitch Analyzer"
      className="fixed inset-0 z-[9999] flex justify-end"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md h-full bg-surface border-l border-line p-5 flex flex-col shadow-lg z-10 animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between pb-3.5 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-brass" />
            <h3 className="text-sm font-bold text-text">AI Smart Matcher</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          <p className="text-text-muted leading-relaxed">
            Paste your agency service pitch, portfolio URL, or business offer. Our AI will automatically infer the optimal digital gap and high-converting target categories.
          </p>

          <textarea
            rows={5}
            value={serviceDescription}
            onChange={e => onServiceDescriptionChange(e.target.value)}
            placeholder="e.g. We design high-converting e-commerce web storefronts and booking systems for local food & beverage and clinic chains..."
            className="w-full p-3 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass resize-none"
          />

          <button
            type="button"
            disabled={!serviceDescription.trim() || isAnalyzing}
            onClick={handleAnalyze}
            className="w-full py-2.5 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4 text-white" />
            <span>{isAnalyzing ? "Analyzing Pitch…" : "Analyze Pitch & Match Niches"}</span>
          </button>

          {statusNote && (
            <p className="text-[11px] text-text-muted">{statusNote}</p>
          )}

          {result && (
            <div className="p-4 rounded-xl bg-surface-2/60 border border-brass/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-brass font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recommended Matching Strategy</span>
              </div>

              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">
                  Target Digital Gap:
                </span>
                <span className="text-xs font-semibold text-text">
                  {result.inferredRequirement}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">
                  Target Niches:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.recommendedCategories.map(cat => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-lg bg-surface border border-line text-[11px] font-medium text-text"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2 rounded-xl bg-surface hover:bg-surface-2 border border-brass text-brass text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Apply to Search Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
