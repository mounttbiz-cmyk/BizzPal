"use client";

import React, { useState } from "react";
import { DesktopRail } from "./DesktopRail";
import { TabletRail } from "./TabletRail";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomBar } from "./MobileBottomBar";
import { ChatDock, ContextChip } from "./ChatDock";
import { CommandPalette } from "@/components/search/CommandPalette";
import { NavItem } from "@/config/schemas/nav";
import { MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { motion, AnimatePresence } from "framer-motion";

import { defaultNavItems } from "@/config/seeds/defaultNav";

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  companyName?: string;
  industry?: string;
}

function sanitizeNavItems(list: NavItem[]): NavItem[] {
  const existingIds = new Set((list || []).map(item => item.id));
  const existingHrefs = new Set((list || []).map(item => item.href));
  const missingDefaults = defaultNavItems.filter(
    def => !existingIds.has(def.id) && !existingHrefs.has(def.href)
  );

  const fullList = [...(list || []), ...missingDefaults].sort((a, b) => a.order - b.order);

  return fullList.map(item => {
    const isWorkspace = item.id === "nav_chat" || item.label.toLowerCase().includes("workspace");
    const isStrategy = item.id === "nav_strategy" || item.label.toLowerCase().includes("strategy");
    const isPlaybooks = item.id === "nav_playbooks" || item.label.toLowerCase().includes("playbook");
    const isAnalytics = item.id === "nav_analytics" || item.label.toLowerCase().includes("analytics");

    return {
      ...item,
      icon: isWorkspace ? "BrainCircuit" : isStrategy ? "Target" : isPlaybooks ? "BookOpen" : isAnalytics ? "BarChart3" : item.icon,
      badge: (item.badge?.toUpperCase() === "NEW" || item.badge?.toUpperCase() === "PRO" || item.id === "nav_datapal" || item.label.includes("DataPal")) ? undefined : item.badge,
    };
  });
}

export function AppShell({
  children,
  navItems,
  companyName: initialCompanyName = "Apex Analytics",
  industry: initialIndustry = "B2B SaaS",
}: AppShellProps) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [industry, setIndustry] = useState(initialIndustry);

  // Close search or chat overlay when Escape key is pressed
  useEscapeKey(() => {
    if (searchOpen) setSearchOpen(false);
    if (chatOpen) setChatOpen(false);
  }, Boolean(searchOpen || chatOpen));

  // Global keyboard shortcut for ⌘K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [items, setItems] = useState<NavItem[]>(() => sanitizeNavItems(navItems || []));
  const [features, setFeatures] = useState<{
    enableAiCopilot: boolean;
    enableDailyCheckin: boolean;
    enableCommandPalette: boolean;
    enableWhatsApp: boolean;
    enableToolsCatalog: boolean;
  }>({
    enableAiCopilot: true,
    enableDailyCheckin: true,
    enableCommandPalette: true,
    enableWhatsApp: true,
    enableToolsCatalog: true,
  });

  // Sync navItems prop if changes
  React.useEffect(() => {
    if (navItems && navItems.length > 0) {
      setItems(sanitizeNavItems(navItems.filter(item => item.enabled !== false)));
    }
  }, [navItems]);

  // Fetch dynamic navigation and feature toggles with real-time Superadmin listeners
  React.useEffect(() => {
    let mounted = true;

    const fetchConfig = () => {
      // 1. Instant check from localStorage
      if (typeof window !== "undefined") {
        try {
          const savedNav = localStorage.getItem("bizzpal_dashboard_nav");
          if (savedNav) {
            const parsedNav = JSON.parse(savedNav);
            if (mounted && Array.isArray(parsedNav) && parsedNav.length > 0) {
              const cleaned = sanitizeNavItems(parsedNav.filter((n: NavItem) => n.enabled !== false));
              setItems(cleaned);
              localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(cleaned));
            }
          }
          const savedFeatures = localStorage.getItem("bizzpal_dashboard_features");
          if (savedFeatures) {
            const parsedFeatures = JSON.parse(savedFeatures);
            if (mounted && parsedFeatures) {
              setFeatures(parsedFeatures);
            }
          }
        } catch {}
      }

      // 2. Fetch from backend
      fetch("/api/public/config", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
        .then(r => r.json())
        .then(d => {
          if (!mounted) return;
          if (d.success) {
            if (Array.isArray(d.nav) && d.nav.length > 0) {
              const cleaned = sanitizeNavItems(d.nav.filter((n: NavItem) => n.enabled !== false));
              setItems(cleaned);
              try {
                localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(cleaned));
              } catch {}
            }
            if (d.features) {
              setFeatures(d.features);
              try {
                localStorage.setItem("bizzpal_dashboard_features", JSON.stringify(d.features));
              } catch {}
            }
          }
        })
        .catch(() => {});
    };

    fetchConfig();

    window.addEventListener("bizzpal_config_updated", fetchConfig);
    window.addEventListener("storage", fetchConfig);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("bizzpal_channel");
      bc.onmessage = () => fetchConfig();
    } catch {}

    return () => {
      mounted = false;
      window.removeEventListener("bizzpal_config_updated", fetchConfig);
      window.removeEventListener("storage", fetchConfig);
      if (bc) bc.close();
    };
  }, []);

  React.useEffect(() => {
    const syncProfile = () => {
      try {
        const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
        if (savedProfileStr) {
          const saved = JSON.parse(savedProfileStr);
          if (saved.name) setCompanyName(saved.name);
          if (saved.industryLabel) {
            setIndustry(saved.industryLabel);
          } else if (saved.industry) {
            setIndustry(saved.industry);
          }
        } else {
          fetch("/api/business/intake")
            .then(r => r.json())
            .then(d => {
              if (d.success && d.business) {
                if (d.business.name) setCompanyName(d.business.name);
                if (d.business.industry_label || d.business.industryLabel) {
                  setIndustry(d.business.industry_label || d.business.industryLabel);
                }
                try {
                  localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
                } catch {}
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    };

    syncProfile();
    window.addEventListener("bizzpal_profile_updated", syncProfile);
    window.addEventListener("storage", syncProfile);
    return () => {
      window.removeEventListener("bizzpal_profile_updated", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  const [contextChips, setContextChips] = useState<ContextChip[]>([
    { id: "chip_dash", label: "Dashboard: Q3 Live Data", type: "page" },
    { id: "chip_runway", label: "Runway: 7.2 months", type: "metric" },
  ]);

  const handleRemoveChip = (id: string) => {
    setContextChips(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col md:flex-row relative overflow-x-hidden selection:bg-gold/25 selection:text-gold-light">
      {/* Ambient subtle champagne gold background depth — restrained and luxurious, not overpowering */}
      <div className="fixed top-0 left-1/4 w-[650px] h-[350px] bg-gradient-to-br from-gold/[0.04] via-transparent to-transparent blur-3xl pointer-events-none -z-10 dark:block hidden" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[350px] bg-gradient-to-tl from-gold/[0.03] via-transparent to-transparent blur-3xl pointer-events-none -z-10 dark:block hidden" />
      <div className="fixed top-0 left-1/4 w-[650px] h-[350px] bg-gradient-to-br from-gold/[0.03] to-transparent blur-3xl pointer-events-none -z-10 dark:hidden block" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[350px] bg-gradient-to-tl from-slate-200/30 to-transparent blur-3xl pointer-events-none -z-10 dark:hidden block" />

      {/* Desktop Left Rail (lg+) */}
      <DesktopRail
        navItems={items}
        companyName={companyName}
        industry={industry}
        onOpenSearch={() => features.enableCommandPalette && setSearchOpen(true)}
      />

      {/* Tablet Icon Rail (md) */}
      <TabletRail
        navItems={items}
        onOpenSearch={() => features.enableCommandPalette && setSearchOpen(true)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 md:ml-16 lg:ml-64 relative">
        {/* Ambient Top Glow specific to main column */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/[0.02] to-transparent pointer-events-none z-0" />
        
        {/* Mobile Header (xs/sm) */}
        <MobileHeader
          companyName={companyName}
          onOpenChat={() => setChatOpen(true)}
          onOpenSearch={() => features.enableCommandPalette && setSearchOpen(true)}
        />

        {/* Page Content Container with Framer Motion Page Transitions */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-[1560px] w-full mx-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating AI Executive Launcher Button (Desktop & Tablet & Mobile) - Signature BizzPal Champagne Gold */}
      {features.enableAiCopilot && pathname !== "/chat" && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open AI Workspace"
          className="fixed z-40 flex items-center gap-2.5 rounded-full btn-gold-gradient shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-bold font-sans cursor-pointer group bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 px-3.5 py-2 sm:px-4 sm:py-2.5"
        >
          <MessageSquare className="w-4 h-4 text-[#120E05] group-hover:rotate-6 transition-transform" />
          <span className="font-bold tracking-wide text-[#120E05]">
            Ask Executive AI
          </span>
        </button>
      )}

      {/* Universal Command Palette / Spotlight Search Modal */}
      {features.enableCommandPalette && (
        <CommandPalette
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* Slide-over Chat Dock */}
      <ChatDock
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        activeContextChips={contextChips}
        onRemoveChip={handleRemoveChip}
      />

      {/* Mobile Bottom Tab Bar (xs/sm) */}
      <MobileBottomBar navItems={items} />
    </div>
  );
}
