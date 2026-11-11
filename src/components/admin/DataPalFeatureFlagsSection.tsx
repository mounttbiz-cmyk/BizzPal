"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
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
  }[] = [
    {
      key: "datapal.pitchAngle.enabled",
      title: "Pitch Angle / Target Digital Gap Selection",
      desc: "Renders an optional step between Where and Review allowing users to target specific digital gaps (e.g. Missing Website, Inactive Social, Outdated SEO).",
    },
    {
      key: "datapal.advancedRules.enabled",
      title: "Advanced Verification & Lead Delivery Rules",
      desc: "Renders advanced filter controls for directory scrapers, minimum star ratings, and strict phone/email verification gates.",
    },
    {
      key: "datapal.aiMatcher.enabled",
      title: "AI Smart Matcher & Pitch Analyzer",
      desc: "Displays a slim banner at the top of DataPal Search tab opening an intelligent side drawer to parse service offerings into target categories.",
    },
  ];

  return (
    <div className="pt-2 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">DataPal options</h2>
          <p className="text-sm text-text-muted mt-0.5">Optional steps and helpers in the DataPal studio.</p>
        </div>
        {justSaved && (
          <span className="text-sm text-jade flex items-center gap-1">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface shadow-sm divide-y divide-line overflow-hidden">
        {featureItems.map(item => {
          const isEnabled = Boolean(flags[item.key]);
          return (
            <div key={item.key} className="px-5 py-4 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-text">{item.title}</h3>
                <p className="text-sm text-text-muted mt-0.5 leading-relaxed max-w-2xl">{item.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                aria-label={item.title}
                onClick={() => handleToggle(item.key)}
                className={`relative w-10 h-6 rounded-full shrink-0 cursor-pointer transition-colors ${isEnabled ? "bg-brass" : "bg-line-strong"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-4" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
