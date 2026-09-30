"use client";

import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, ThemeMode } from "@/lib/theme/ThemeProvider";

interface ThemeSwitchProps {
  compact?: boolean;
}

export function ThemeSwitch({ compact = false }: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border border-line bg-surface-2 ${
        compact ? "scale-90" : "w-full"
      }`}
      role="radiogroup"
      aria-label="Color theme selection"
    >
      {options.map(opt => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setTheme(opt.mode)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs rounded-lg transition-all cursor-pointer ${
              isActive
                ? "bg-surface text-text font-bold shadow-xs border border-line"
                : "text-text-muted hover:text-text hover:bg-surface/50"
            }`}
            title={`Switch to ${opt.label} mode (⌘⇧L to cycle)`}
          >
            {opt.icon}
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
