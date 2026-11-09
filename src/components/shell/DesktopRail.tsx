"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "./DynamicIcon";
import { ThemeSwitch } from "./ThemeSwitch";
import { LogOut, Search, Lock } from "lucide-react";
import { WEBSITE_URL } from "@/config/urls";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "./UpgradeModal";

interface DesktopRailProps {
  navItems: NavItem[];
  companyName?: string;
  industry?: string;
  companyLogo?: string | null;
  onOpenSearch?: () => void;
}

export function DesktopRail({
  navItems,
  companyName = "Apex Labs",
  industry = "B2B SaaS",
  companyLogo,
  onOpenSearch,
}: DesktopRailProps) {
  const pathname = usePathname();
  const [logo, setLogo] = React.useState<string | null>(companyLogo || null);

  React.useEffect(() => {
    if (companyLogo) {
      setLogo(companyLogo);
      return;
    }
    const syncLogo = () => {
      try {
        const p = localStorage.getItem("bizzpal_business_profile");
        if (p) {
          const parsed = JSON.parse(p);
          setLogo(parsed.logoUrl || parsed.logo || parsed.logo_url || null);
        }
      } catch {}
    };
    syncLogo();
    window.addEventListener("bizzpal_business_data_updated", syncLogo);
    window.addEventListener("bizzpal_profile_updated", syncLogo);
    window.addEventListener("storage", syncLogo);
    return () => {
      window.removeEventListener("bizzpal_business_data_updated", syncLogo);
      window.removeEventListener("bizzpal_profile_updated", syncLogo);
      window.removeEventListener("storage", syncLogo);
    };
  }, [companyLogo]);

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
    localStorage.removeItem("bizzpal_user_session"); localStorage.removeItem("bizzpal_business_profile"); localStorage.removeItem("bizzpal_subscription_plan"); localStorage.removeItem("bizzpal_datapal_campaigns");
    window.location.href = WEBSITE_URL;
  };

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

  // Use navItems directly without force-injecting deleted items
  const effectiveNavItems = React.useMemo(() => {
    return (navItems || []).filter(item => item.enabled !== false);
  }, [navItems]);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-surface border-r border-line select-none z-30">

      <div className="px-5 py-4 border-b border-line">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo-icon.png"
            alt="BizzPal"
            width={40}
            height={40}
            className="object-contain shrink-0"
            priority
          />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-black tracking-tight text-text leading-none flex items-start">
              <span>Bizz</span>
              <span className="bizzpal-brand-pal">Pal</span>
              <span className="text-xs font-bold text-gold/80 ml-0.5">™</span>
            </div>
            <p className="text-xs text-text-muted truncate mt-1">{companyName}</p>
          </div>
        </Link>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line text-text-muted hover:text-text hover:bg-surface-2 text-sm cursor-pointer"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="truncate">Search</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map(group => {
          const items = effectiveNavItems.filter(item => item.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key}>
              <div className="px-3 mb-1.5 text-xs text-text-muted">{group.label}</div>
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
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-text-muted/60 hover:text-text-muted hover:bg-surface-2 cursor-pointer"
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
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                      {item.badge && <span className="text-xs text-text-muted">{item.badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-line space-y-3">

        <ThemeSwitch />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {logo ? (
              <div className="w-8 h-8 rounded-full border border-line bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                <img src={logo} alt={companyName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-2 text-text-muted text-xs font-medium flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-text truncate">{companyName}</div>
              <div className="text-xs text-text-muted truncate">{planBadgeLabel}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
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