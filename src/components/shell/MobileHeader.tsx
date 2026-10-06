"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, BrainCircuit, Globe, Search } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { WEBSITE_URL } from "@/config/urls";

interface MobileHeaderProps {
  companyName?: string;
  onOpenChat?: () => void;
  onOpenSearch?: () => void;
}

export function MobileHeader({
  companyName = "Apex Labs",
  onOpenChat,
  onOpenSearch,
}: MobileHeaderProps) {
  const { resolvedTheme, cycleTheme } = useTheme();

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-surface/95 backdrop-blur-xl border-b border-line pt-[env(safe-area-inset-top)]">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <Image
            src="/logo-icon.png"
            alt="BizzPal Logo"
            width={26}
            height={26}
            className="object-contain drop-shadow"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-tight text-text leading-tight font-sans flex items-center">
            <span>Bizz</span>
            <span className="font-black ml-0.5 bizzpal-brand-pal">
              Pal
            </span>
            <span className="text-[9px] text-gold/80 font-bold ml-0.5 -mt-1">™</span>
          </span>
          <span className="text-[10px] text-text-muted leading-tight truncate max-w-[120px]">
            {companyName}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-line bg-surface-2/80 text-text-muted hover:text-gold btn-tactile"
            aria-label="Open search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/40 btn-tactile"
            aria-label="Open AI Workspace"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-gold" />
            <span>Copilot</span>
          </button>
        )}

        <button
          type="button"
          onClick={cycleTheme}
          aria-label="Cycle theme"
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-line bg-surface-2/80 text-text-muted hover:text-text btn-tactile"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-3.5 h-3.5 text-gold" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-gold" />
          )}
        </button>
      </div>
    </header>
  );
}
