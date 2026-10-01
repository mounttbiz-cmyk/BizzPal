"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Target, Filter, Database, Check } from "lucide-react";
import {
  DataPalFeatureFlags,
  DEFAULT_DATAPAL_FEATURE_FLAGS,
  getStoredFeatureFlags,
  saveStoredFeatureFlags,
} from "@/lib/datapal/featureFlags";

export function DataPalFeatureFlagsSection() {
  const [flags, setFlags] = useState<DataPalFeatureFlags>(DEFAULT_DATAPAL_FEATURE_FLAGS);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setFlags(getStoredFeatureFlags());
  }, []);

  const handleToggle = (key: keyof DataPalFeatureFlags) => {
    const updated = {
      ...flags,
      [key]: !flags[key],
    };
    setFlags(updated);
    saveStoredFeatureFlags(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const featureItems: {
    key: keyof DataPalFeatureFlags;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: "datapal.pitchAngle.enabled",
      title: "Pitch Angle / Target Digital Gap Selection",
      desc: "Renders an optional step between Where and Review allowing users to target specific digital gaps (e.g. Missing Website, Inactive Social, Outdated SEO).",
      icon: Sliders,
    },
    {
      key: "datapal.advancedRules.enabled",
      title: "Advanced Verification & Lead Delivery Rules",
      desc: "Renders advanced filter controls for directory scrapers, minimum star ratings, and strict phone/email verification gates.",
      icon: Filter,
    },
    {
      key: "datapal.aiMatcher.enabled",
      title: "AI Smart Matcher & Pitch Analyzer",
      desc: "Displays a slim banner at the top of DataPal Search tab opening an intelligent side drawer to parse service offerings into target categories.",
      icon: Target,
    },
  ];

  return (
    <div className="pt-6 border-t border-line space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brass/10 border border-brass/25 flex items-center justify-center text-brass">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-text">DataPal Extraction Engine Features</h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Configure optional steps, AI drawers, and advanced extraction rules for the DataPal studio.
          </p>
        </div>

        {justSaved && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Updated
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featureItems.map(item => {
          const Icon = item.icon;
          const isEnabled = Boolean(flags[item.key]);

          return (
            <div
              key={item.key}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isEnabled
                  ? "bg-surface border-brass/40 shadow-xs"
                  : "bg-surface-2/40 border-dashed border-line opacity-70"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                      isEnabled
                        ? "bg-brass/15 border-brass/30 text-brass"
                        : "bg-surface-2 border-line text-text-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      isEnabled
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                        : "bg-surface-2 border-line text-text-muted hover:text-text"
                    }`}
                  >
                    {isEnabled ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-text">{item.title}</h3>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>Default: OFF</span>
                <span className={isEnabled ? "text-brass font-bold" : ""}>
                  {isEnabled ? "Active in UI" : "Hidden"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
