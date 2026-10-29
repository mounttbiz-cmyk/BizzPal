"use client";

import React from "react";
import Link from "next/link";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Sun, Moon, Monitor, Eye, Palette, Check, Globe, ArrowUpRight, Layers, Building2 } from "lucide-react";

export default function AppearancePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2 pb-4 border-b border-line">
        <h1 className="text-lg font-bold text-text">Platform Settings</h1>
        <p className="text-xs text-text-muted font-medium">
          Customize the visual interface, color palette, dark mode behaviors, and font scaling of the BizzPal console.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Business & Account</span>
          </Link>
          <Link
            href="/settings/appearance"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brass text-white shadow-xs flex items-center gap-1.5"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance & Theme</span>
          </Link>
          <Link
            href="/settings/tools"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Connected Business Tools</span>
          </Link>
        </div>
      </div>

      {/* Theme selection card */}
      <div className="p-5 rounded-xl border border-line bg-surface shadow-theme space-y-5">
        <div>
          <h2 className="text-xs font-bold text-text uppercase tracking-wider">
            Color Palette & Mode
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Switch between light boardroom cool paper and dark deep ink navy.
          </p>
        </div>

        <div className="max-w-xs">
          <ThemeSwitch />
        </div>
      </div>

      {/* BizzPal Website Link */}
      <div className="p-5 rounded-xl border border-line bg-surface shadow-theme space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>BizzPal Website</span>
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Launch the public 3D interactive intelligence experience, product vision, and platform showcases.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-2 hover:bg-surface border border-line hover:border-line-strong text-xs font-semibold text-text btn-tactile transition-all shrink-0 shadow-xs"
          >
            <span>Open Website</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
          </a>
        </div>
      </div>
    </div>
  );
}
