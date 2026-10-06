"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { ThemeSwitch } from "./ThemeSwitch";
import { ShieldCheck, ChevronRight, LogOut, Sliders, Search, Lock } from "lucide-react";
import { QuickBusinessInputModal } from "../intake/QuickBusinessInputModal";
import { WEBSITE_URL } from "@/config/urls";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { StatusBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "./UpgradeModal";

interface DesktopRailProps {
  navItems: NavItem[];
  companyName?: string;
  industry?: string;
  onOpenSearch?: () => void;
}

export function DesktopRail({
  navItems,
  companyName = "Apex Labs",
  industry = "B2B SaaS",
  onOpenSearch,
}: DesktopRailProps) {
  const pathname = usePathname();

  const groups: { key: NavItem["group"]; label: string }[] = [
    { key: "core", label: "Core" },
    { key: "intelligence", label: "Executive Intelligence" },
    { key: "management", label: "Operations & Execution" },
    { key: "system", label: "Platform" },
  ];

  const initials = companyName
    ? companyName
        .split(" ")
        .filter(Boolean)
        .map(w => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "NB"
    : "NB";

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("bizzpal_user_session");
    window.location.href = WEBSITE_URL;
  };

  const [isQuickInputOpen, setIsQuickInputOpen] = React.useState(false);
  const { plan: currentPlan, hasPlanLevel } = usePlanAccess();
  const [lockedItem, setLockedItem] = React.useState<NavItem | null>(null);
  const [planBadgeLabel, setPlanBadgeLabel] = React.useState<string>("Active Workspace");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("bizzpal_subscription_plans");
      if (raw) {
        const parsed = JSON.parse(raw);
        const match = parsed.find((p: any) => p.id === currentPlan);
        if (match?.name) {
          const cleaned = match.name.replace(/\s*\/\s*Demo/gi, "").replace(/Demo/gi, "").trim();
          setPlanBadgeLabel(cleaned || "Starter Free");
          return;
        }
      }
    } catch {}
    if (currentPlan === "free") setPlanBadgeLabel("Starter Free");
    else if (currentPlan === "starter") setPlanBadgeLabel("Starter OS");
    else if (currentPlan === "growth") setPlanBadgeLabel("Growth Plan");
    else if (currentPlan === "enterprise") setPlanBadgeLabel("Enterprise");
    else setPlanBadgeLabel("Active Workspace");
  }, [currentPlan]);

  // Guarantee DataPal is always present in navigation items
  const effectiveNavItems = React.useMemo(() => {
    const list = navItems || [];
    const hasDataPal = list.some(item => item.id === "nav_datapal" || item.href === "/datapal");
    if (!hasDataPal) {
      const datapalDefault: NavItem = {
        id: "nav_datapal",
        label: "DataPal",
        href: "/datapal",
        icon: "Database",
        order: 10,
        mobileTab: false,
        group: "intelligence",
        enabled: true,
      };
      return [...list, datapalDefault].sort((a, b) => a.order - b.order);
    }
    return list;
  }, [navItems]);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-white dark:bg-surface border-r border-line select-none z-30 transition-colors">
      {/* Quick Business Input Modal */}
      <QuickBusinessInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
      />

      {/* Brand Header */}
      <div className="p-4 border-b border-line">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-12 h-12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Image
              src="/logo-icon.png"
              alt="BizzPal Logo"
              width={46}
              height={46}
              className="object-contain drop-shadow"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-xl tracking-tight text-text font-sans flex items-center leading-none">
              <span>Bizz</span>
              <span className="font-black ml-0.5 bizzpal-brand-pal">
                Pal
              </span>
              <span className="text-xs text-gold/80 font-bold ml-1 -mt-2">™</span>
            </div>
            <p className="text-xs text-text-muted truncate max-w-[180px] font-medium mt-1">
              {companyName}
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Command Prompt / Search bar */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text hover:border-line-strong transition-all text-xs group cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors shrink-0" />
            <span className="text-[11px] font-medium truncate">Search tools, pages…</span>
          </div>
        </button>
      </div>

      {/* Nav List grouped */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => {
          const items = effectiveNavItems.filter(item => item.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key} className="space-y-1">
              <div className="px-3 text-[10px] uppercase font-bold tracking-widest text-text-muted/70 font-mono">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {items.map(rawItem => {
                  const isWorkspace = rawItem.id === "nav_chat" || rawItem.label.toLowerCase().includes("workspace");
                  const isStrategy = rawItem.id === "nav_strategy" || rawItem.label.toLowerCase().includes("strategy");
                  const isPlaybooks = rawItem.id === "nav_playbooks" || rawItem.label.toLowerCase().includes("playbook");
                  const isAnalytics = rawItem.id === "nav_analytics" || rawItem.label.toLowerCase().includes("analytics");

                  const isDataPal = rawItem.id === "nav_datapal" || rawItem.href === "/datapal" || rawItem.label.toLowerCase().includes("datapal");

                  const item = {
                    ...rawItem,
                    label: isDataPal ? "DataPal" : rawItem.label,
                    icon: isWorkspace ? "BrainCircuit" : isStrategy ? "Target" : isPlaybooks ? "BookOpen" : isAnalytics ? "BarChart3" : rawItem.icon,
                    badge: (rawItem.badge?.toUpperCase() === "NEW" || rawItem.badge?.toUpperCase() === "PRO" || isDataPal) ? undefined : rawItem.badge,
                  };

                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const isLocked = !hasPlanLevel(item.requiredPlan);

                  if (isLocked) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLockedItem(item)}
                        className="w-full relative flex items-center justify-between pl-3.5 pr-3 py-2 rounded-xl text-xs font-medium text-text-muted/50 hover:text-text-muted hover:bg-white/[0.02] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <DynamicIcon name={item.icon} className="w-4 h-4 text-text-muted/50" />
                          <span>{item.label}</span>
                        </div>
                        <Lock className="w-3 h-3 text-text-muted/50 shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`relative flex items-center justify-between pl-3.5 pr-3 py-2 rounded-xl text-xs font-medium transition-all btn-tactile ${
                        isActive
                          ? "bg-gold/10 text-gold font-semibold border border-gold/25 shadow-xs"
                          : "text-text-muted hover:text-text hover:bg-surface-2/60"
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-gold"
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex items-center gap-2.5">
                        <DynamicIcon
                          name={item.icon}
                          className={`w-4 h-4 ${isActive ? "text-gold" : "text-text-muted group-hover:text-text"}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                          isActive
                            ? "bg-gold/15 text-gold border border-gold/30"
                            : "bg-surface-2 border border-line text-text-muted"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer Controls & User Menu */}
      <div className="p-3 border-t border-line space-y-3 bg-white dark:bg-surface transition-colors">
        <Button
          type="button"
          variant="primary"
          size="md"
          fullWidth
          onClick={() => setIsQuickInputOpen(true)}
          icon={<Sliders className="w-3.5 h-3.5" />}
        >
          Quick Business Input
        </Button>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1.5 px-1">
            Appearance
          </div>
          <ThemeSwitch />
        </div>

        {/* User profile & logout */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-line text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 text-gold font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
            </div>
            <div className="truncate">
              <div className="font-semibold text-text truncate">{companyName}</div>
              <div className="text-[10px] text-text-muted flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{planBadgeLabel}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-surface transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
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
