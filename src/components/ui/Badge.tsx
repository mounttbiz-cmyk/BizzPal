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
  // green = live / verified (e.g. LIVE FEED, LIVE STREAM)
  live: { pill: "bg-jade/10 text-jade dark:bg-[#172220] dark:text-[#3FA96A] dark:border dark:border-[rgba(63,169,106,0.35)]", dot: "bg-jade dark:bg-[#3FA96A]" },
  // gold = AI / autonomous (e.g. AUTONOMOUS tag: text #D9B44A with a gold dot)
  ai: { pill: "bg-gold/10 text-gold dark:bg-[rgba(217,180,74,0.10)] dark:text-[#D9B44A] dark:border dark:border-[rgba(217,180,74,0.35)]", dot: "bg-gold dark:bg-[#D9B44A]" },
  // amber = warning
  warning: { pill: "bg-amber/10 text-amber dark:bg-[#2B2219] dark:text-[#E0A62E] dark:border dark:border-[rgba(224,166,46,0.35)]", dot: "bg-amber dark:bg-[#E0A62E]" },
  // red = critical
  critical: { pill: "bg-rust/10 text-rust dark:bg-[#2B171B] dark:text-[#E04A3C] dark:border dark:border-[rgba(224,74,60,0.35)]", dot: "bg-rust dark:bg-[#E04A3C]" },
  // neutral = informational, no strong semantic color
  neutral: { pill: "bg-white/[0.05] text-text-muted dark:bg-[#18161D] dark:text-[#97928E] dark:border dark:border-[#2D2722]", dot: "bg-text-muted dark:bg-[#97928E]" },
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
      className: "bg-jade/10 text-jade dark:bg-[#172220] dark:text-[#3FA96A] dark:border dark:border-[rgba(63,169,106,0.35)]",
    },
    benchmark: {
      label: "Industry Benchmark",
      className: "bg-gold/10 text-gold dark:bg-[rgba(217,180,74,0.10)] dark:text-[#D9B44A] dark:border dark:border-[rgba(217,180,74,0.35)]",
    },
    estimate: {
      label: "BizzPal Estimate",
      className: "bg-amber/10 text-amber dark:bg-[#2B2219] dark:text-[#E0A62E] dark:border dark:border-[rgba(224,166,46,0.35)]",
    },
    user: {
      label: "User Input",
      className: "bg-white/[0.05] text-text-muted dark:bg-[#18161D] dark:text-[#97928E] dark:border dark:border-[#2D2722]",
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
