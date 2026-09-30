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
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-surface/95 dark:bg-[#0B0A0E] backdrop-blur-xl border-b border-line dark:border-b-[#2D2722] pt-[env(safe-area-inset-top)]">
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
            <span className="logo-bizz">Bizz</span>
            <span
              className="font-black ml-0.5 logo-pal"
              style={{
                background: "linear-gradient(135deg, #F7ECD1 0%, #DFBA73 50%, #A37C2C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "#DFBA73",
                display: "inline-block",
              }}
            >
              Pal
            </span>
            <span className="text-[9px] text-gold/80 dark:text-[#D9B44A] font-bold ml-0.5 -mt-1">™</span>
          </span>
          <span className="text-[10px] text-text-muted dark:text-[#97928E] leading-tight truncate max-w-[120px]">
            {companyName}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-line dark:border-[#2D2722] bg-surface-2/80 dark:bg-[#18161D] text-text-muted dark:text-[#726C66] hover:text-gold dark:hover:text-[#D9B44A] btn-tactile cursor-pointer"
            aria-label="Open search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gold/15 dark:bg-[rgba(217,180,74,0.15)] text-gold dark:text-[#D9B44A] border border-gold/40 dark:border-[rgba(217,180,74,0.30)] btn-tactile cursor-pointer"
            aria-label="Open AI Workspace"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-gold dark:text-[#D9B44A]" />
            <span>Copilot</span>
          </button>
        )}

        <button
          type="button"
          onClick={cycleTheme}
          aria-label="Cycle theme"
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-line dark:border-[#2D2722] bg-surface-2/80 dark:bg-[#18161D] text-text-muted dark:text-[#726C66] hover:text-text dark:hover:text-[#EBE7DF] btn-tactile cursor-pointer"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-3.5 h-3.5 text-gold dark:text-[#D9B44A]" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-gold" />
          )}
        </button>
      </div>
    </header>
  );
}
