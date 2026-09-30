import React from "react";

export type StatusTone = "live" | "ai" | "warning" | "critical" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  /** Show the pulsing beacon dot (reserve for genuinely live/real-time states). */
  pulse?: boolean;
  className?: string;
}

const toneClasses: Record<StatusTone, { pill: string; dot: string }> = {
  // green = live / verified (emerald-800 on light = 6.8:1; emerald-300 on dark = 7.5:1)
  live: {
    pill: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  // gold = AI / autonomous (amber-900 on light = 6.5:1; amber-200 on dark = 8:1)
  ai: {
    pill: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20",
    dot: "bg-amber-600 dark:bg-gold",
  },
  // amber = warning
  warning: {
    pill: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  // red = critical
  critical: {
    pill: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20",
    dot: "bg-rose-600 dark:bg-rust",
  },
  // neutral = informational, no strong semantic color
  neutral: {
    pill: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-line",
    dot: "bg-slate-500 dark:bg-slate-400",
  },
};

/**
 * Standardized status/state pill: fixed height, fully rounded, dot + label.
 * Use for things like "LIVE", "AUTONOMOUS", "SUPERADMIN SECURE", "ACTIVE TENANT".
 */
export function StatusBadge({ label, tone = "neutral", pulse = false, className = "" }: StatusBadgeProps) {
  const cfg = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider whitespace-nowrap ${cfg.pill} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${pulse ? "beacon-dot-current" : ""}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

export type ProvenanceType = "from_data" | "benchmark" | "estimate" | "user";

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  citation?: string;
}

export function ProvenanceBadge({ type, citation }: ProvenanceBadgeProps) {
  const configs: Record<ProvenanceType, { label: string; className: string }> = {
    from_data: {
      label: "Verified Data",
      className: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20",
    },
    benchmark: {
      label: "Industry Benchmark",
      className: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20",
    },
    estimate: {
      label: "BizzPal Estimate",
      className: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20",
    },
    user: {
      label: "User Input",
      className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-line",
    },
  };

  const config = configs[type];

  return (
    <span
      className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider whitespace-nowrap ${config.className}`}
      title={citation || `Source: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
