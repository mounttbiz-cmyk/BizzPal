"use client";

import React from "react";
import { TARGET_PROFILE_PRESETS } from "@/lib/datapal/constants";
import { Check, Target } from "lucide-react";

interface PitchAngleStepProps {
  selectedRequirement: string;
  onSelectRequirement: (req: string) => void;
  className?: string;
}

export function PitchAngleStep({
  selectedRequirement,
  onSelectRequirement,
  className = "",
}: PitchAngleStepProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-brass" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Target Digital Gap / Pitch Angle (Optional)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TARGET_PROFILE_PRESETS.map(preset => {
          const isSelected = selectedRequirement === preset.label;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectRequirement(preset.label)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? "bg-brass/10 border-brass ring-1 ring-brass/30 shadow-xs"
                  : "bg-surface border-line hover:border-line-strong hover:bg-surface-2/40 text-text"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="text-xs font-bold text-text truncate">
                    {preset.label}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-surface-2 border border-line text-text-muted shrink-0">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-snug line-clamp-2">
                  {preset.desc}
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-brass border-brass text-white"
                      : "border-line bg-surface"
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
