"use client";

import React, { useState, useEffect } from "react";
import { PortalModal } from "@/components/ui/PortalModal";
import {
  Crown,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  Users,
  Workflow,
  Compass,
  Briefcase,
  ShieldCheck,
  Bot,
  BrainCircuit,
  DollarSign,
  Award,
  Rocket,
  Flame,
  X,
  RotateCcw,
  Check,
  LucideProps,
} from "lucide-react";

export interface AgentMetaLike {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badge?: string;
  color?: string;
  summary?: string;
}

export const AVAILABLE_AGENT_ICONS: Record<
  string,
  { icon: React.ComponentType<LucideProps>; label: string; defaultFor?: string }
> = {
  Crown: { icon: Crown, label: "Crown (Leadership)", defaultFor: "CEO" },
  TrendingUp: { icon: TrendingUp, label: "Trending Up (Finance)", defaultFor: "CFO" },
  Target: { icon: Target, label: "Target (Marketing)", defaultFor: "Marketing" },
  Zap: { icon: Zap, label: "Lightning (Sales)", defaultFor: "Sales" },
  Users: { icon: Users, label: "Users (Talent & HR)", defaultFor: "HR" },
  Workflow: { icon: Workflow, label: "Workflow (Operations)", defaultFor: "Operations" },
  Compass: { icon: Compass, label: "Compass (Strategy)", defaultFor: "Strategy" },
  Briefcase: { icon: Briefcase, label: "Briefcase (Executive)" },
  ShieldCheck: { icon: ShieldCheck, label: "Shield (Governance)" },
  Bot: { icon: Bot, label: "Bot (Autonomous AI)" },
  BrainCircuit: { icon: BrainCircuit, label: "Brain (Intelligence)" },
  BarChart3: { icon: BarChart3, label: "Bar Chart (Analytics)" },
  DollarSign: { icon: DollarSign, label: "Dollar (Treasury)" },
  Award: { icon: Award, label: "Award (Milestones)" },
  Rocket: { icon: Rocket, label: "Rocket (Scaling)" },
  Flame: { icon: Flame, label: "Flame (Velocity)" },
};

// Map legacy emojis to modern SVG icon names
const LEGACY_EMOJI_MAP: Record<string, string> = {
  "👑": "Crown",
  "📊": "TrendingUp",
  "🎯": "Target",
  "⚡": "Zap",
  "🤝": "Users",
  "⚙️": "Workflow",
  "🧭": "Compass",
  "💼": "Briefcase",
  "👤": "Users",
};

export function AgentAvatarIcon({
  iconName,
  className = "w-4 h-4",
  fallback = null,
}: {
  iconName?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  if (!iconName) return fallback ? <>{fallback}</> : <Bot className={className} />;

  // Normalize legacy emojis if present
  const resolvedName = LEGACY_EMOJI_MAP[iconName] || iconName;

  const entry = AVAILABLE_AGENT_ICONS[resolvedName];
  if (entry) {
    const IconComponent = entry.icon;
    return <IconComponent className={className} />;
  }

  // If text or unknown character
  if (resolvedName.length <= 4) {
    return <span className="leading-none text-base">{resolvedName}</span>;
  }

  return fallback ? <>{fallback}</> : <Bot className={className} />;
}

interface CustomizeAdvisorModalProps {
  isOpen: boolean;
  agent: AgentMetaLike | null;
  defaultName: string;
  defaultIcon: string;
  onClose: () => void;
  onSave: (agentId: string, customData: { name: string; avatar: string }) => void;
  onReset: (agentId: string) => void;
}

export function CustomizeAdvisorModal({
  isOpen,
  agent,
  defaultName,
  defaultIcon,
  onClose,
  onSave,
  onReset,
}: CustomizeAdvisorModalProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Crown");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name || defaultName);
      const initialIcon = LEGACY_EMOJI_MAP[agent.avatar] || agent.avatar || defaultIcon;
      setSelectedIcon(AVAILABLE_AGENT_ICONS[initialIcon] ? initialIcon : defaultIcon);
      setError(null);
    }
  }, [agent, defaultName, defaultIcon]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !agent) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name for the advisor.");
      return;
    }
    if (trimmed.length > 30) {
      setError("Advisor name must be 30 characters or fewer.");
      return;
    }
    onSave(agent.id, { name: trimmed, avatar: selectedIcon });
  };

  const handleResetClick = () => {
    onReset(agent.id);
  };

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div
        className="w-full max-w-lg bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brass/15 border border-brass/30 flex items-center justify-center text-brass shadow-sm">
              <AgentAvatarIcon iconName={selectedIcon} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Customize {agent.role}</h2>
              <p className="text-[11px] text-text-muted">
                Change the advisor name and choose an executive symbol.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Advisor Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-text uppercase tracking-wider">
              Advisor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`e.g. ${defaultName}, Athena, Max...`}
              maxLength={30}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass focus:border-brass transition-all"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
              <span>Default: {defaultName}</span>
              <span>{name.length}/30</span>
            </div>
            {error && <p className="text-xs text-rust font-medium mt-1">{error}</p>}
          </div>

          {/* Icon Symbol Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text uppercase tracking-wider">
              Executive Symbol / Icon
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {Object.entries(AVAILABLE_AGENT_ICONS).map(([key, { icon: Icon, label }]) => {
                const isSelected = selectedIcon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedIcon(key)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brass/15 border-brass text-brass shadow-sm ring-1 ring-brass/40"
                        : "bg-surface-2/40 border-line hover:border-line-strong hover:bg-surface-2 text-text-muted hover:text-text"
                    }`}
                    title={label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-medium truncate max-w-full leading-tight">
                      {key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-surface-2/50 border border-line flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface border border-brass/30 flex items-center justify-center text-brass shadow-sm shrink-0">
                <AgentAvatarIcon iconName={selectedIcon} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-text truncate">
                    {name.trim() || defaultName}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border bg-brass/10 border-brass/30 text-brass">
                    {agent.role}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted truncate mt-0.5">
                  {agent.badge || "Autonomous Executive Advisor"}
                </p>
              </div>
            </div>
            <div className="text-[10px] text-jade font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Preview</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetClick}
              className="px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text-muted hover:text-text hover:border-line-strong flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset name and icon to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl btn-gold-gradient text-xs font-bold shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </PortalModal>
  );
}
