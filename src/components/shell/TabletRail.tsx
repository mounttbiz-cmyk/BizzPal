"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { Sun, Moon, Search, Lock, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "./UpgradeModal";
import { WEBSITE_URL } from "@/config/urls";
import { forgetBrowserOwner } from "@/lib/auth/localData";

interface TabletRailProps {
  navItems: NavItem[];
  onOpenSearch?: () => void;
}

export function TabletRail({ navItems, onOpenSearch }: TabletRailProps) {
  const pathname = usePathname();
  const { resolvedTheme, cycleTheme } = useTheme();
  const { hasPlanLevel } = usePlanAccess();
  const [lockedItem, setLockedItem] = React.useState<NavItem | null>(null);

  // Use navItems directly without force-injecting deleted items
  const effectiveNavItems = React.useMemo(() => {
    return (navItems || []).filter(item => item.enabled !== false);
  }, [navItems]);

  return (
    <aside className="hidden md:flex lg:hidden flex-col items-center w-16 h-screen fixed inset-y-0 left-0 bg-white dark:bg-surface border-r border-line select-none z-30 py-3 transition-colors">
      {/* Brand Icon with Ribbon Logo */}
      <Link
        href="/dashboard"
        className="w-12 h-12 flex items-center justify-center mb-3 hover:scale-105 transition-transform"
        title="BizzPal Dashboard"
      >
        <Image
          src="/logo-icon.png"
          alt="BizzPal Logo"
          width={42}
          height={42}
          className="object-contain drop-shadow"
        />
      </Link>

      {/* Quick Search Button */}
      <button
        type="button"
        onClick={onOpenSearch}
        title="Search tools, pages…"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-surface-2 transition-all btn-tactile mb-3"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Icon Navigation list */}
      <nav className="flex-1 flex flex-col items-center gap-2 overflow-y-auto w-full px-2">
        {effectiveNavItems.map(rawItem => {
          const isWorkspace = rawItem.id === "nav_chat" || rawItem.label.toLowerCase().includes("workspace");
          const isStrategy = rawItem.id === "nav_strategy" || rawItem.label.toLowerCase().includes("strategy");
          const isPlaybooks = rawItem.id === "nav_playbooks" || rawItem.label.toLowerCase().includes("playbook");
          const isAnalytics = rawItem.id === "nav_analytics" || rawItem.label.toLowerCase().includes("analytics");

          const isDataPal = rawItem.id === "nav_datapal" || rawItem.href === "/datapal" || rawItem.label.toLowerCase().includes("datapal");

          const upperBadge = (rawItem.badge || "").trim().toUpperCase();
          const isRedundant = upperBadge === "NEW" || upperBadge === "PRO" || upperBadge === "LIVE" || isDataPal;

          const item = {
            ...rawItem,
            label: isDataPal ? "DataPal" : rawItem.label,
            icon: isWorkspace ? "BrainCircuit" : isStrategy ? "Target" : isPlaybooks ? "BookOpen" : isAnalytics ? "BarChart3" : rawItem.icon,
            badge: isRedundant ? undefined : rawItem.badge && /^[0-9]+$/.test(rawItem.badge.trim()) ? undefined : rawItem.badge,
          };

          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${isActive
                ? "bg-surface-2 text-text border border-line font-semibold"
                : "text-text-muted hover:text-text hover:bg-surface-2/60"
                }`}
            >
              <DynamicIcon name={item.icon} className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Theme, Settings & Sign out */}
      <div className="pt-2 border-t border-line w-full flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${resolvedTheme} (click to toggle)`}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4 text-gold" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>
        <Link
          href="/settings/profile"
          title="Settings"
          aria-label="Settings"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={async () => {
            try { await fetch("/api/auth/session", { method: "DELETE" }); } catch {}
            try {
              localStorage.removeItem("bizzpal_user_session");
              localStorage.removeItem("bizzpal_business_profile");
              localStorage.removeItem("bizzpal_subscription_plan");
              localStorage.removeItem("bizzpal_datapal_campaigns");
              forgetBrowserOwner();
            } catch {}
            window.location.href = WEBSITE_URL;
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-rust hover:bg-rust/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
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
