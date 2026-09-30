"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { Menu, X, Sun, Moon, Lock } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "./UpgradeModal";

interface MobileBottomBarProps {
  navItems: NavItem[];
}

export function MobileBottomBar({ navItems }: MobileBottomBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { hasPlanLevel } = usePlanAccess();
  const [lockedItem, setLockedItem] = useState<NavItem | null>(null);

  // Close drawer on Escape
  useEscapeKey(() => setMoreOpen(false), moreOpen);

  // Primary 4 tabs + 5th is "More"
  const primaryTabs: { id: string; label: string; href: string; icon: string }[] = [
    { id: "tab_dash", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { id: "tab_chat", label: "Chat", href: "/chat", icon: "MessageSquare" },
    { id: "tab_gaps", label: "Gaps", href: "/gaps", icon: "AlertTriangle" },
    { id: "tab_tasks", label: "Tasks", href: "/tasks", icon: "CheckSquare" },
  ];

  // Secondary items for the More bottom sheet
  const secondaryItems = navItems.filter(
    item => !primaryTabs.some(tab => tab.href === item.href)
  );

  return (
    <>
      {/* Bottom Fixed Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 dark:bg-[#0B0A0E] backdrop-blur-xl border-t border-line dark:border-t-[#2D2722] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14 items-center justify-around px-1">
          {primaryTabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 rounded-xl transition-all btn-tactile ${
                  isActive ? "text-gold dark:text-[#D9B44A] font-bold" : "text-text-muted hover:text-text dark:text-[#726C66] dark:hover:text-[#EBE7DF]"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-6 h-[2px] rounded-full bg-gold dark:bg-[#D9B44A]" aria-hidden="true" />
                )}
                <DynamicIcon name={tab.icon} className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* 5th Tab: More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 rounded-xl transition-all btn-tactile ${
              moreOpen ? "text-gold dark:text-[#D9B44A] font-bold" : "text-text-muted hover:text-text dark:text-[#726C66] dark:hover:text-[#EBE7DF]"
            }`}
            aria-expanded={moreOpen}
            aria-label="More navigation links"
          >
            {moreOpen ? <X className="w-5 h-5 mb-0.5" /> : <Menu className="w-5 h-5 mb-0.5" />}
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 dark:bg-[#040306]/75 backdrop-blur-sm flex flex-col justify-end transition-opacity">
          <div
            className="fixed inset-0"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-surface dark:bg-[#121016] border-t border-line dark:border-t-[#2D2722] rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 space-y-4 shadow-xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-line-strong dark:bg-[#2D2722] rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-line dark:border-b-[#2D2722]">
              <div className="font-semibold text-sm text-text dark:text-[#EBE7DF]">More Options</div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text dark:text-[#726C66] dark:hover:text-[#EBE7DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links List */}
            <div className="grid grid-cols-2 gap-2">
              {secondaryItems.map(item => {
                const isActive = pathname === item.href;
                const isLocked = !hasPlanLevel(item.requiredPlan);

                if (isLocked) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        setLockedItem(item);
                      }}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-line dark:border-[#2D2722] bg-surface-2/20 dark:bg-[#18161D]/50 text-text-muted/60 dark:text-[#726C66] text-xs font-medium"
                    >
                      <DynamicIcon name={item.icon} className="w-4 h-4 text-text-muted/50" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <Lock className="w-3 h-3 shrink-0" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? "bg-surface-2 border-brass text-text dark:bg-[rgba(217,180,74,0.10)] dark:border-[rgba(217,180,74,0.30)] dark:text-[#D9B44A]"
                        : "bg-surface-2/40 border-line text-text hover:bg-surface-2 dark:bg-[#18161D] dark:border-[#2D2722] dark:text-[#97928E] dark:hover:text-[#EBE7DF] dark:hover:bg-[#1C1A22]"
                    }`}
                  >
                    <DynamicIcon name={item.icon} className="w-4 h-4 text-brass dark:text-[#D9B44A]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Theme Switch in More Drawer */}
            <div className="pt-2 border-t border-line dark:border-t-[#2D2722]">
              <div className="text-[11px] font-semibold text-text-muted dark:text-[#726C66] uppercase tracking-wider mb-2 font-mono">
                Theme & Appearance
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTheme(m)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border capitalize flex items-center justify-center gap-1.5 cursor-pointer ${
                      theme === m
                        ? "bg-surface border-brass text-brass font-bold shadow-sm dark:bg-[#1C1A22] dark:border-[rgba(217,180,74,0.45)] dark:text-[#D9B44A]"
                        : "bg-surface-2 border-line text-text-muted dark:bg-[#18161D] dark:border-[#2D2722] dark:text-[#726C66] dark:hover:text-[#EBE7DF]"
                    }`}
                  >
                    {m === "light" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {lockedItem && (
        <UpgradeModal
          featureLabel={lockedItem.label}
          requiredPlan={lockedItem.requiredPlan || "starter"}
          onClose={() => setLockedItem(null)}
        />
      )}
    </>
  );
}
