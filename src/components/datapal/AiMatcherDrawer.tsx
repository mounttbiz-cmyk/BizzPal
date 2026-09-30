"use client";

import React, { useState } from "react";
import { Bot, Sparkles, X, Upload, CheckCircle2, ArrowRight } from "lucide-react";

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    inferredRequirement: string;
    recommendedCategories: string[];
    summary: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = () => {
    if (!serviceDescription.trim()) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      const text = serviceDescription.toLowerCase();

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

      setResult({
        inferredRequirement: req,
        recommendedCategories: cats,
        summary: `Target ${cats.join(", ")} with gap directive "${req}".`,
      });
    }, 700);
  };

  const handleApply = () => {
    if (!result) return;
    onApplySuggestions(result.inferredRequirement, result.recommendedCategories);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Smart Matcher & Pitch Analyzer"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md h-full bg-surface border-l border-line p-5 flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
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
            className="w-full py-2.5 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{isAnalyzing ? "Analyzing Pitch…" : "Analyze Pitch & Match Niches"}</span>
          </button>

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
    </div>
  );
}
