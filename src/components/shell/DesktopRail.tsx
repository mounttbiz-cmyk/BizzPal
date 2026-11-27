"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { AccountMenu } from "./AccountMenu";
import { Search, Lock } from "lucide-react";
import { WEBSITE_URL } from "@/config/urls";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { usePlanName } from "@/lib/hooks/usePlanName";
import { UpgradeModal } from "./UpgradeModal";
import { forgetBrowserOwner } from "@/lib/auth/localData";
import { CompanySwitcher } from "@/components/companies/CompanySwitcher";

interface DesktopRailProps {
  navItems: NavItem[];
  companyName?: string;
  industry?: string;
  companyLogo?: string | null;
  onOpenSearch?: () => void;
}

const notACount = (b?: string) => (b && /^[0-9]+$/.test(b.trim()) ? undefined : b);

export function DesktopRail({
  navItems,
  companyName = "",
  onOpenSearch,
}: DesktopRailProps) {
  const pathname = usePathname();

  const groups: { key: NavItem["group"]; label: string }[] = [
    { key: "core", label: "Core" },
    { key: "intelligence", label: "Executive Intelligence" },
    { key: "management", label: "Operations & Execution" },
    { key: "system", label: "Platform" },
  ];


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {}
    try {
      localStorage.removeItem("bizzpal_user_session");
      localStorage.removeItem("bizzpal_business_profile");
      localStorage.removeItem("bizzpal_subscription_plan");
      localStorage.removeItem("bizzpal_datapal_campaigns");
      forgetBrowserOwner();
    } catch {}
    window.location.href = WEBSITE_URL;
  };

  const { hasPlanLevel } = usePlanAccess();
  const [lockedItem, setLockedItem] = React.useState<NavItem | null>(null);

  // Agent actions waiting for the owner: the number shows next to Approvals
  const [pendingApprovals, setPendingApprovals] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/approvals?count=1", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (alive && d?.success) setPendingApprovals(Number(d.pending) || 0);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("bizzpal_approvals_changed", load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("bizzpal_approvals_changed", load);
    };
  }, [pathname]);
  const planBadgeLabel = usePlanName();

  // Use navItems directly without force-injecting deleted items
  const effectiveNavItems = React.useMemo(() => {
    return (navItems || []).filter(item => item.enabled !== false);
  }, [navItems]);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-surface border-r border-line select-none z-30">

      {/* Brand, with search as a quiet icon */}
      <div className="h-14 pl-4 pr-2.5 flex items-center justify-between shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="BizzPal home">
          <Image src="/logo-icon.png" alt="" width={26} height={26} className="object-contain shrink-0" priority />
          <span className="text-[19px] font-bold tracking-tight text-text leading-none">
            Bizz<span className="bizzpal-brand-pal">Pal</span>
            <sup className="ml-px text-[8px] font-medium text-text-muted align-super">TM</sup>
          </span>
        </Link>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search (Ctrl K)"
          title="Search  ·  Ctrl K"
          className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* The business you are working in */}
      <div className="px-2 pb-2 border-b border-line shrink-0">
        <CompanySwitcher fallbackName={companyName} />
      </div>

      <div className="nav-scroll flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-6">
        {groups.map(group => {
          const items = effectiveNavItems.filter(item => item.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key}>
              <div className="px-3 mb-1 text-[11px] font-medium text-text-muted/70">{group.label}</div>
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
                    badge: (rawItem.badge?.toUpperCase() === "NEW" || rawItem.badge?.toUpperCase() === "PRO" || isDataPal) ? undefined : notACount(rawItem.badge),
                  };

                  const isApprovals = rawItem.id === "nav_approvals" || rawItem.href === "/approvals";
                  const liveCount = isApprovals && pendingApprovals > 0 ? pendingApprovals : 0;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const isLocked = !hasPlanLevel(item.requiredPlan);

                  if (isLocked) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLockedItem(item)}
                        className="w-full h-9 flex items-center justify-between gap-2 px-3 rounded-lg text-sm text-text-muted/60 hover:text-text-muted hover:bg-surface-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <DynamicIcon name={item.icon} className="w-4 h-4" />
                          <span>{item.label}</span>
                        </span>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`h-9 flex items-center justify-between gap-2 px-3 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-surface-2 text-text font-medium"
                          : "text-text-muted hover:text-text hover:bg-surface-2/60"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <DynamicIcon
                          name={item.icon}
                          className={`w-4 h-4 ${isActive ? "text-brass" : ""}`}
                        />
                        <span>{item.label}</span>
                      </span>
                      {liveCount > 0 ? (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-brass text-white text-xs font-medium tabular-nums flex items-center justify-center" aria-label={`${liveCount} waiting`}>
                          {liveCount > 99 ? "99+" : liveCount}
                        </span>
                      ) : (
                        item.badge && <span className="text-xs text-text-muted">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-line">
        <AccountMenu planLabel={planBadgeLabel} onSignOut={handleLogout} />
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