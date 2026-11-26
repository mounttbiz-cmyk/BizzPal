"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useTheme, ThemeMode } from "@/lib/theme/ThemeProvider";

const THEMES: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

/**
 * The signed-in person at the foot of the sidebar. One click opens a small menu with the colour theme, settings and
 * sign out, like the account menu in other workspace apps.
 */
export function AccountMenu({ planLabel, onSignOut }: { planLabel: string; onSignOut: () => void }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("bizzpal_user_session") || "{}");
      setPerson({ name: String(s.name || "").trim(), email: String(s.email || "").trim() });
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // "AAYAN" or "aayan" shows as "Aayan"
  const tidy = (t: string) => t.replace(/\S+/g, w => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w));
  const display = tidy(person.name) || person.email.split("@")[0] || "Your account";
  const initials =
    display
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ME";

  return (
    <div ref={ref} className="relative">
      {open && (
        <div role="menu" aria-label="Account" className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-line bg-surface shadow-xl p-1.5">
          {person.email && (
            <div className="px-2.5 pt-1.5 pb-2.5 mb-1 border-b border-line">
              <p className="text-sm font-medium text-text truncate">{display}</p>
              <p className="text-xs text-text-muted truncate">{person.email}</p>
            </div>
          )}
          <p className="px-2.5 pt-1 pb-1.5 text-xs text-text-muted">Theme</p>
          <div className="px-1.5 pb-2 grid grid-cols-3 gap-1" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ mode, label, Icon }) => {
              const on = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTheme(mode)}
                  className={`h-8 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    on ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-line pt-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="h-9 px-2.5 rounded-lg text-sm text-text hover:bg-surface-2 flex items-center gap-2.5"
            >
              <Settings className="w-4 h-4 text-text-muted" /> Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className="w-full h-9 px-2.5 rounded-lg text-sm text-text hover:bg-surface-2 flex items-center gap-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-text-muted" /> Sign out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`group w-full h-12 px-2 rounded-lg flex items-center gap-2.5 text-left cursor-pointer transition-colors ${open ? "bg-surface-2" : "hover:bg-surface-2"}`}
      >
        <span className="w-8 h-8 rounded-full bg-brass/10 text-brass text-xs font-semibold flex items-center justify-center shrink-0">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text leading-tight truncate">{display}</span>
          <span className="block text-xs text-text-muted leading-tight truncate mt-0.5">{planLabel}</span>
        </span>
        <ChevronsUpDown className="w-4 h-4 text-text-muted group-hover:text-text shrink-0" />
      </button>
    </div>
  );
}
