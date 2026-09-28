"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { Sun, Moon, Globe, Search, Lock } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { WEBSITE_URL } from "@/config/urls";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "./UpgradeModal";

interface TabletRailProps {
  navItems: NavItem[];
  onOpenSearch?: () => void;
}

export function TabletRail({ navItems, onOpenSearch }: TabletRailProps) {
  const pathname = usePathname();
  const { resolvedTheme, cycleTheme } = useTheme();
  const { hasPlanLevel } = usePlanAccess();
  const [lockedItem, setLockedItem] = React.useState<NavItem | null>(null);

  return (
    <aside className="hidden md:flex lg:hidden flex-col items-center w-16 h-screen fixed inset-y-0 left-0 bg-surface/95 backdrop-blur-2xl border-r border-line select-none z-30 py-3 transition-colors">
      {/* Brand Icon with Ribbon Logo */}
      <Link
        href="/dashboard"
        className="w-10 h-10 flex items-center justify-center mb-3 hover:scale-105 transition-transform"
        title="BizzPal Dashboard"
      >
        <Image
          src="/logo-icon.png"
          alt="BizzPal Logo"
          width={32}
          height={32}
          className="object-contain drop-shadow"
        />
      </Link>

      {/* Quick Search Button */}
      <button
        type="button"
        onClick={onOpenSearch}
        title="Search tools, pages… (⌘K)"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-surface-2 transition-all btn-tactile mb-3"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Icon Navigation list */}
      <nav className="flex-1 flex flex-col items-center gap-2 overflow-y-auto w-full px-2">
        {navItems.map(rawItem => {
          const isWorkspace = rawItem.id === "nav_chat" || rawItem.label.toLowerCase().includes("workspace");
          const isStrategy = rawItem.id === "nav_strategy" || rawItem.label.toLowerCase().includes("strategy");
          const isPlaybooks = rawItem.id === "nav_playbooks" || rawItem.label.toLowerCase().includes("playbook");
          const isAnalytics = rawItem.id === "nav_analytics" || rawItem.label.toLowerCase().includes("analytics");

          const item = {
            ...rawItem,
            icon: isWorkspace ? "BrainCircuit" : isStrategy ? "Target" : isPlaybooks ? "BookOpen" : isAnalytics ? "BarChart3" : rawItem.icon,
            badge: (rawItem.badge?.toUpperCase() === "NEW" || rawItem.badge?.toUpperCase() === "PRO" || rawItem.id === "nav_datapal" || rawItem.label.includes("DataPal")) ? undefined : rawItem.badge,
          };

          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const isLocked = !hasPlanLevel(item.requiredPlan);

          if (isLocked) {
            return (
              <button
                key={item.id}
                type="button"
                title={`${item.label} (upgrade required)`}
                onClick={() => setLockedItem(item)}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl text-text-muted/40 hover:text-text-muted hover:bg-surface-2 transition-all cursor-pointer"
              >
                <DynamicIcon name={item.icon} className="w-5 h-5 text-text-muted/40" />
                <Lock className="w-2.5 h-2.5 absolute bottom-1 right-1 text-text-muted/60" />
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all btn-tactile group ${
                isActive
                  ? "bg-gold/10 text-gold border border-gold/25 shadow-xs font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              }`}
            >
              <DynamicIcon name={item.icon} className={`w-5 h-5 ${isActive ? "text-gold" : "text-text-muted"}`} />
              {item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold ring-2 ring-surface" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom theme cycler button */}
      <div className="pt-2 border-t border-line w-full flex justify-center">
        <button
          type="button"
          onClick={cycleTheme}
          title="Cycle Theme (⌘⇧L)"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-colors btn-tactile"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4 text-brass" />
          ) : (
            <Sun className="w-4 h-4 text-brass" />
          )}
        </button>
      </div>

      {lockedItem && (
        <UpgradeModal
          featureLabel={lockedItem.label}
          requiredPlan={lockedItem.requiredPlan || "starter"}
          onClose={() => setLockedItem(null)}
        />
      )}
    </aside>
  );
}
