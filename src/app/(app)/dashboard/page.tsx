"use client";

import React, { useState, useEffect } from "react";
import { resolveTenantConfig, TenantContext } from "@/config/resolver";
import { RenderWidget } from "@/components/widgets/WidgetRegistry";
import { WidgetDef } from "@/config/schemas/widget";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Sliders,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  CheckCircle2,
  X,
  UploadCloud,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Suspense } from "react";
import { DailyCheckInModal } from "@/components/checkin/DailyCheckInModal";
import { UploadDataModal } from "@/components/upload/UploadDataModal";
import { QuickBusinessInputModal } from "@/components/intake/QuickBusinessInputModal";
import { useBusinessDataSync } from "@/lib/upload/events";
import { Clock, Send, Radio } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { LEGACY_NAMES } from "@/lib/advisors";

const formatIndustryName = (ind: string) => {
  const map: Record<string, string> = {
    it_services: "IT & Technology Services",
    it_tech: "IT & Technology Services",
    saas: "B2B SaaS",
    agency: "Agency & Professional Services",
    ecommerce: "E-Commerce & Retail",
    healthcare: "Healthcare & MedTech",
    manufacturing: "Manufacturing & Logistics",
    real_estate: "Real Estate & Property",
  };
  return map[ind.toLowerCase()] || ind.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

const formatCurrencyCompact = (amount: number) => {
  if (!amount || amount === 0) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2).replace(/\.00$/, "")}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const [selectedIndustry, setSelectedIndustry] = useState<TenantContext["industry"]>("saas");
  const [selectedModel, setSelectedModel] = useState<TenantContext["businessModel"]>("subscription");
  const [companyName, setCompanyName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const p = localStorage.getItem("bizzpal_business_profile");
        if (p) {
          const parsed = JSON.parse(p);
          if (parsed.name && !parsed.name.includes("Acme")) return parsed.name;
        }
      } catch {}
    }
    return "My Enterprise";
  });
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const p = localStorage.getItem("bizzpal_business_profile");
        if (p) {
          const parsed = JSON.parse(p);
          return parsed.logoUrl || parsed.logo || parsed.logo_url || null;
        }
      } catch {}
    }
    return null;
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState("Live Today");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [liquidRunwayMo, setLiquidRunwayMo] = useState("0.0");
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [overallHealthScore, setOverallHealthScore] = useState(50);
  const [baseHealthScore, setBaseHealthScore] = useState(50);
  const [baseLiquidRunwayMo, setBaseLiquidRunwayMo] = useState("0.0");
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const startInputRef = React.useRef<HTMLInputElement>(null);
  const endInputRef = React.useRef<HTMLInputElement>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const calendarData = React.useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { year, month, firstDay, daysInMonth, monthName };
  }, [calendarMonth]);

  const customDaysDiff = React.useMemo(() => {
    if (!customStartDate || !customEndDate) return 14;
    const diff = Math.round((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, isNaN(diff) ? 14 : diff);
  }, [customStartDate, customEndDate]);

  const handleCalendarDaySelect = (day: number) => {
    const y = calendarData.year;
    const m = String(calendarData.month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const selected = `${y}-${m}-${dStr}`;

    if (!customStartDate || (customStartDate && customEndDate && customStartDate !== customEndDate)) {
      setCustomStartDate(selected);
      setCustomEndDate(selected);
    } else {
      if (new Date(selected) < new Date(customStartDate)) {
        setCustomEndDate(customStartDate);
        setCustomStartDate(selected);
      } else {
        setCustomEndDate(selected);
      }
    }
  };

  const getDateStatus = (day: number) => {
    const y = calendarData.year;
    const m = String(calendarData.month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const current = `${y}-${m}-${dStr}`;

    const isStart = current === customStartDate;
    const isEnd = current === customEndDate;
    const isInRange = customStartDate && customEndDate && current > customStartDate && current < customEndDate;

    return { isStart, isEnd, isInRange, isSelected: isStart || isEnd };
  };
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [bottleneckGapCount, setBottleneckGapCount] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isQuickInputModalOpen, setIsQuickInputModalOpen] = useState(false);

  const [checkinData, setCheckinData] = useState<{
    isCompletedToday: boolean;
    todayCheckin: any;
    questionRules: { skipRevenue: boolean; skipTech: boolean };
    questions: any[];
  }>({
    isCompletedToday: false,
    todayCheckin: null,
    questionRules: { skipRevenue: false, skipTech: false },
    questions: [],
  });
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [advisorsSummary, setAdvisorsSummary] = useState("CEO, CFO, Marketing");

  useEffect(() => {
    const syncAdvisors = () => {
      try {
        const raw = localStorage.getItem("bizzpal_custom_advisors");
        if (raw) {
          const parsed = JSON.parse(raw);
          const ceo = parsed.ceo?.name && !LEGACY_NAMES.has(parsed.ceo.name.toLowerCase()) ? parsed.ceo.name : "CEO";
          const cfo = parsed.cfo?.name && !LEGACY_NAMES.has(parsed.cfo.name.toLowerCase()) ? parsed.cfo.name : "CFO";
          const mkt = parsed.marketing?.name && !LEGACY_NAMES.has(parsed.marketing.name.toLowerCase()) ? parsed.marketing.name : "Marketing";
          setAdvisorsSummary(`${ceo}, ${cfo}, ${mkt}`);
          return;
        }
      } catch {}
      setAdvisorsSummary("CEO, CFO, Marketing");
    };
    syncAdvisors();
    window.addEventListener("bizzpal_advisors_updated", syncAdvisors);
    window.addEventListener("storage", syncAdvisors);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncAdvisors);
      window.removeEventListener("storage", syncAdvisors);
    };
  }, []);

  // Close daily check-in modal on Escape
  useEscapeKey(() => setIsCheckInModalOpen(false), isCheckInModalOpen);

  // Fetch Live Tasks Count
  const refreshTasksCount = async () => {
    try {
      const activeBizId = typeof window !== "undefined" ? localStorage.getItem("bizzpal_active_business_id") : null;
      const url = activeBizId ? `/api/tasks?businessId=${encodeURIComponent(activeBizId)}` : "/api/tasks";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        const active = data.tasks.filter((t: any) => t.status !== "done").length;
        setActiveTaskCount(active);
      } else {
        setActiveTaskCount(0);
      }
    } catch {
      setActiveTaskCount(0);
    }
  };

  // Fetch Check-In Status
  const refreshCheckinStatus = async () => {
    try {
      const res = await fetch("/api/checkin");
      const data = await res.json();
      if (data.success) {
        setCheckinData({
          isCompletedToday: Boolean(data.isCompletedToday),
          todayCheckin: data.todayCheckin,
          questionRules: data.questionRules || { skipRevenue: false, skipTech: false },
          questions: data.questions || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch checkin status", err);
    }
  };

  const [featureFlags, setFeatureFlags] = useState({
    enableDailyCheckin: true,
  });

  const hasLoadedBackendWidgetsRef = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    refreshCheckinStatus();
    refreshTasksCount();

    const fetchConfig = () => {
      // Instant client-side hydration from Superadmin edits in localStorage
      if (typeof window !== "undefined") {
        try {
          const cachedFeatures = localStorage.getItem("bizzpal_dashboard_features");
          if (cachedFeatures) {
            setFeatureFlags(JSON.parse(cachedFeatures));
          }
          const cachedWidgets = localStorage.getItem("bizzpal_dashboard_widgets");
          if (cachedWidgets) {
            const wList = JSON.parse(cachedWidgets);
            if (Array.isArray(wList) && wList.length > 0) {
              hasLoadedBackendWidgetsRef.current = true;
              const disabledIds = new Set(
                wList.filter((w: any) => w.enabled === false).map((w: any) => w.id)
              );
              const savedLayout = localStorage.getItem(`bizzpal_layout_${selectedIndustry}`);
              if (savedLayout) {
                try {
                  const parsed = JSON.parse(savedLayout);
                  const existingIds = new Set(parsed.map((w: any) => w.id));
                  const missingDefaults = wList.filter((w: any) => !existingIds.has(w.id) && !disabledIds.has(w.id));
                  setActiveWidgets([...parsed.filter((w: any) => !disabledIds.has(w.id)), ...missingDefaults]);
                } catch {
                  setActiveWidgets(wList.filter((w: any) => w.enabled !== false));
                }
              } else {
                setActiveWidgets(wList.filter((w: any) => w.enabled !== false));
              }
            }
          }
        } catch {}
      }

      fetch("/api/public/config", { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          if (!mounted) return;
          if (d.success) {
            if (d.features) {
              setFeatureFlags(d.features);
            }
            if (Array.isArray(d.widgets) && d.widgets.length > 0) {
              hasLoadedBackendWidgetsRef.current = true;
              const disabledIds = new Set(
                d.widgets.filter((w: any) => w.enabled === false).map((w: any) => w.id)
              );
              const savedLayout = localStorage.getItem(`bizzpal_layout_${selectedIndustry}`);
              if (savedLayout) {
                try {
                  const parsed = JSON.parse(savedLayout);
                  const existingIds = new Set(parsed.map((w: any) => w.id));
                  const missingDefaults = d.widgets.filter((w: any) => !existingIds.has(w.id) && !disabledIds.has(w.id));
                  setActiveWidgets([...parsed.filter((w: any) => !disabledIds.has(w.id)), ...missingDefaults]);
                } catch {
                  setActiveWidgets(d.widgets.filter((w: any) => w.enabled !== false));
                }
              } else {
                setActiveWidgets(d.widgets.filter((w: any) => w.enabled !== false));
              }
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
  }, [selectedIndustry]);

  const applyProfileData = (saved: any) => {
    if (!saved) return;
    if (saved.industry) setSelectedIndustry(saved.industry);
    if (saved.logoUrl || saved.logo || saved.logo_url) {
      setCompanyLogo(saved.logoUrl || saved.logo || saved.logo_url);
    }
    if (saved.name) {
      if (saved.name.includes("Acme")) {
        setCompanyName("My Enterprise");
      } else if (saved.name.startsWith("GSTIN ") && (saved.tradeName || saved.legalName || saved.customBusinessType)) {
        setCompanyName(saved.tradeName || saved.legalName || saved.name.replace(/^GSTIN\s+/, ""));
      } else {
        setCompanyName(saved.name);
      }
    }
    if (saved.isUploadedData && saved.sourceFileName) {
      setUploadedFileName(saved.sourceFileName);
    } else {
      setUploadedFileName(null);
    }
    const cash = Number(saved.cash || saved.cashOnHand || 0);
    const burn = Number(saved.burn || saved.monthlyBurn || saved.monthlyNetBurn || 0);
    const rev = Number(saved.revenue || saved.monthlyRevenue || 0);
    const hasData = cash > 0 || burn > 0 || rev > 0;

    let rMonths = 0;
    let rMoStr = "0.0";
    if (burn > 0) {
      rMonths = Number((cash / burn).toFixed(1));
      rMoStr = rMonths.toFixed(1);
    } else if (cash > 0) {
      rMoStr = "18+";
      rMonths = 18;
    } else {
      rMoStr = "0.0";
    }
    setLiquidRunwayMo(rMoStr);
    setBaseLiquidRunwayMo(rMoStr);
    setMonthlyRevenue(rev);
    setMonthlyBurn(burn);
    setCashOnHand(cash);

    // Dynamically compute health score
    let computedScore = 50;
    if (!hasData) {
      computedScore = 50;
    } else {
      let score = 65;
      if (rMonths >= 12) score += 15;
      else if (rMonths >= 6) score += 10;
      else if (rMonths < 3 && burn > 0) score -= 15;

      if (rev > 500000) score += 12;
      else if (rev > 100000) score += 8;
      else if (rev > 0) score += 4;

      computedScore = Math.min(98, Math.max(40, score));
    }
    setOverallHealthScore(computedScore);
    setBaseHealthScore(computedScore);
  };

  // Read saved business profile if available from localStorage or backend SQLite database
  useEffect(() => {
    const handleProfileSync = () => {
      try {
        const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
        if (savedProfileStr) {
          const parsed = JSON.parse(savedProfileStr);
          if (parsed.name && parsed.name.includes("Acme")) {
            localStorage.removeItem("bizzpal_business_profile");
            localStorage.removeItem("bizzpal_user_session");
            fetch("/api/business/intake")
              .then(r => r.json())
              .then(d => {
                if (d.success && d.business) {
                  applyProfileData(d.business);
                  localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
                }
              })
              .catch(() => {});
            return;
          }
          applyProfileData(parsed);
        } else {
          // Fetch real enterprise record from database API
          fetch("/api/business/intake")
            .then(r => r.json())
            .then(d => {
              if (d.success && d.business) {
                applyProfileData(d.business);
                localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    };

    const handleGapsCount = (e: any) => {
      if (e.detail && typeof e.detail.count === "number") {
        setBottleneckGapCount(e.detail.count);
      }
    };

    const handleTasksRefresh = () => {
      refreshTasksCount();
    };

    handleProfileSync();
    window.addEventListener("storage", handleProfileSync);
    window.addEventListener("bizzpal_business_data_updated", handleProfileSync);
    window.addEventListener("bizzpal_gaps_count", handleGapsCount);
    window.addEventListener("bizzpal_task_created", handleTasksRefresh);
    window.addEventListener("bizzpal_task_updated", handleTasksRefresh);

    return () => {
      window.removeEventListener("storage", handleProfileSync);
      window.removeEventListener("bizzpal_business_data_updated", handleProfileSync);
      window.removeEventListener("bizzpal_gaps_count", handleGapsCount);
      window.removeEventListener("bizzpal_task_created", handleTasksRefresh);
      window.removeEventListener("bizzpal_task_updated", handleTasksRefresh);
    };
  }, []);

  useBusinessDataSync(metrics => {
    applyProfileData(metrics);
  });

  // Base dynamic config from registry
  const baseConfig = resolveTenantConfig({
    industry: selectedIndustry,
    businessModel: selectedModel,
    plan: "growth",
  });

  // User's custom layout state (allowing user to customize the website dashboard)
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  useEffect(() => {
    if (searchParams.get("customize") === "true") {
      setIsEditingLayout(true);
    }
    if (searchParams.get("quickInput") === "true") {
      setIsQuickInputModalOpen(true);
    }
  }, [searchParams]);
  const [activeWidgets, setActiveWidgets] = useState<WidgetDef[]>(baseConfig.widgets);
  const [toast, setToast] = useState<string | null>(null);

  // Load custom layout overrides from storage ONLY if customized and no backend widgets loaded yet
  useEffect(() => {
    if (hasLoadedBackendWidgetsRef.current) return;
    try {
      const savedLayout = localStorage.getItem(`bizzpal_layout_${selectedIndustry}`);
      if (savedLayout) {
        setActiveWidgets(JSON.parse(savedLayout));
      } else {
        setActiveWidgets(baseConfig.widgets);
      }
    } catch (e) {
      setActiveWidgets(baseConfig.widgets);
    }
  }, [selectedIndustry, baseConfig.version]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTimeframeChange = (tf: string) => {
    if (tf === "Custom") {
      setIsCustomPickerOpen(prev => !prev);
      return;
    }
    setIsCustomPickerOpen(false);
    setSelectedTimeframe(tf);

    if (tf === "Live Today") {
      setOverallHealthScore(baseHealthScore);
      setLiquidRunwayMo(baseLiquidRunwayMo);
      try {
        window.dispatchEvent(new CustomEvent("bizzpal_timeframe_changed", { detail: { timeframe: "Live Today", days: 1 } }));
      } catch {}
      notify("Switched to Live Today");
    } else if (tf === "7 Days") {
      const calibratedHealth = baseHealthScore > 50 ? Math.min(99, baseHealthScore + 1) : baseHealthScore;
      setOverallHealthScore(calibratedHealth);
      try {
        window.dispatchEvent(new CustomEvent("bizzpal_timeframe_changed", { detail: { timeframe: "7 Days", days: 7 } }));
      } catch {}
      notify("Switched to 7 Days trailing view");
    } else if (tf === "1 Month") {
      const calibratedHealth = baseHealthScore > 50 ? Math.min(99, baseHealthScore + 2) : baseHealthScore;
      setOverallHealthScore(calibratedHealth);
      try {
        window.dispatchEvent(new CustomEvent("bizzpal_timeframe_changed", { detail: { timeframe: "1 Month", days: 30 } }));
      } catch {}
      notify("Switched to 1 Month rolling view");
    }
  };

  const handleApplyCustomRange = (daysPreset?: number) => {
    let days = 14;
    let label = "";
    if (daysPreset) {
      days = daysPreset;
      const d = new Date();
      d.setDate(d.getDate() - daysPreset);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(new Date().toISOString().split("T")[0]);
      label = `Custom (${daysPreset}d)`;
    } else {
      const diff = Math.round((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24));
      days = Math.max(1, isNaN(diff) ? 14 : diff);
      label = `Custom (${days}d)`;
    }

    setSelectedTimeframe(label);
    setIsCustomPickerOpen(false);

    const delta = days > 30 ? 3 : days >= 7 ? 1 : 0;
    const calibratedHealth = baseHealthScore > 50 ? Math.min(99, baseHealthScore + delta) : baseHealthScore;
    setOverallHealthScore(calibratedHealth);

    try {
      window.dispatchEvent(new CustomEvent("bizzpal_timeframe_changed", { 
        detail: { timeframe: "Custom", days, startDate: customStartDate, endDate: customEndDate } 
      }));
    } catch {}
    notify(`Applied custom range: ${days} days`);
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (id: string) => {
    setActiveWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  // Change widget span
  const changeWidgetSpan = (id: string, span: 1 | 2 | 3 | 4) => {
    setActiveWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, defaultSpan: span } : w))
    );
  };

  // Save layout
  const handleSaveLayout = () => {
    localStorage.setItem(`bizzpal_layout_${selectedIndustry}`, JSON.stringify(activeWidgets));
    setIsEditingLayout(false);
    notify("Custom Dashboard Layout Saved!");
  };

  // Reset to default layout
  const handleResetLayout = () => {
    localStorage.removeItem(`bizzpal_layout_${selectedIndustry}`);
    setActiveWidgets(baseConfig.widgets);
    setIsEditingLayout(false);
    notify("Restored default dashboard layout");
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-surface border border-jade shadow-2xl text-xs font-semibold text-jade flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-jade" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header & Executive Command Center */}
      <div className="p-5 sm:p-7 space-y-5 rounded-3xl bg-surface border border-line shadow-theme relative">
        {/* Top Line: Company Name & Timeframe Selector (z-30 for popover stacking priority) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60 relative z-30">
          <div className="flex items-center gap-3.5 min-w-0">
            {companyLogo ? (
              <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brass/10 text-brass font-extrabold text-base flex items-center justify-center shrink-0 select-none tracking-tight">
                {companyName
                  .split(" ")
                  .filter(Boolean)
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "EP"}
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight font-sans truncate">
                  {companyName}
                </h1>
                {uploadedFileName && (
                  <span className="text-[11px] text-jade font-medium inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-jade/10 border border-jade/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-jade shrink-0" />
                    Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                <span>{formatIndustryName(selectedIndustry)}</span>
                <span className="text-text-muted/40">·</span>
                <span>Growth Plan</span>
              </p>
            </div>
          </div>

          {/* Timeframe Selector with Dynamic Options & Custom Range Picker */}
          <div className="relative inline-flex items-center p-1 bg-surface-2 rounded-xl border border-line text-xs max-w-full shrink-0">
            {["Live Today", "7 Days", "1 Month", "Custom"].map(tf => {
              const isActive = tf === "Custom"
                ? selectedTimeframe.startsWith("Custom") || isCustomPickerOpen
                : selectedTimeframe === tf;

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-surface text-text font-semibold shadow-xs border border-line/40"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {tf === "Custom" && selectedTimeframe.startsWith("Custom") ? selectedTimeframe : tf}
                </button>
              );
            })}

            {/* Custom Range Popover & Outside-Click Dismiss Backdrop */}
            {isCustomPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsCustomPickerOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-line shadow-2xl space-y-3.5">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-line/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
                      <span className="text-xs font-bold text-slate-900 dark:text-text">Select Date Range</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomPickerOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-text-muted dark:hover:text-text hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5">
                    {[7, 14, 30, 90].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleApplyCustomRange(d)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          customDaysDiff === d
                            ? "bg-amber-500/15 text-amber-900 dark:text-gold border-amber-500/40 font-semibold shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-surface-2 dark:hover:bg-white/10 text-slate-700 dark:text-text border-slate-200 dark:border-line/60"
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>

                  {/* Manual Inputs with Instant Calendar Triggers & Single Calendar Icon */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-600 dark:text-text-muted mb-1 font-semibold uppercase tracking-wider">
                        Start Date
                      </label>
                      <div className="relative flex items-center">
                        <input
                          ref={startInputRef}
                          type="date"
                          value={customStartDate}
                          onChange={e => {
                            setCustomStartDate(e.target.value);
                            if (e.target.value) {
                              setCalendarMonth(new Date(e.target.value));
                            }
                          }}
                          onClick={e => {
                            try {
                              (e.currentTarget as any).showPicker?.();
                            } catch {}
                          }}
                          className="w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-line text-slate-900 dark:text-text text-xs focus:outline-hidden focus:border-amber-500 dark:focus:border-gold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              startInputRef.current?.showPicker?.();
                            } catch {}
                          }}
                          className="absolute right-2 text-slate-400 hover:text-amber-600 dark:text-text-muted dark:hover:text-gold cursor-pointer p-0.5"
                          title="Open Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 dark:text-text-muted mb-1 font-semibold uppercase tracking-wider">
                        End Date
                      </label>
                      <div className="relative flex items-center">
                        <input
                          ref={endInputRef}
                          type="date"
                          value={customEndDate}
                          onChange={e => {
                            setCustomEndDate(e.target.value);
                            if (e.target.value) {
                              setCalendarMonth(new Date(e.target.value));
                            }
                          }}
                          onClick={e => {
                            try {
                              (e.currentTarget as any).showPicker?.();
                            } catch {}
                          }}
                          className="w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-line text-slate-900 dark:text-text text-xs focus:outline-hidden focus:border-amber-500 dark:focus:border-gold cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              endInputRef.current?.showPicker?.();
                            } catch {}
                          }}
                          className="absolute right-2 text-slate-400 hover:text-amber-600 dark:text-text-muted dark:hover:text-gold cursor-pointer p-0.5"
                          title="Open Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Visual Mini-Calendar Grid */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-2/70 border border-slate-200 dark:border-line/60 space-y-2">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-text px-1">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-text-muted dark:hover:text-text hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-text">{calendarData.monthName}</span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-text-muted dark:hover:text-text hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 dark:text-text-muted/80 font-semibold">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="py-0.5">{d}</div>
                      ))}
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                      {Array.from({ length: calendarData.firstDay }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-6" />
                      ))}
                      {Array.from({ length: calendarData.daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const status = getDateStatus(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleCalendarDaySelect(day)}
                            className={`h-6 w-full rounded-md flex items-center justify-center font-medium transition-colors cursor-pointer text-[11px] ${
                              status.isSelected
                                ? "bg-amber-500 text-white font-bold shadow-xs"
                                : status.isInRange
                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-medium"
                                : "text-slate-700 dark:text-text hover:bg-slate-200 dark:hover:bg-white/10"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    type="button"
                    onClick={() => handleApplyCustomRange()}
                    className="w-full py-2 rounded-xl text-xs font-semibold btn-gold-gradient shadow-sm hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Apply Range</span>
                    <span className="opacity-75 font-normal">({customDaysDiff} Days)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sub-line: Executive Status Overview & Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10 pt-1">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-text uppercase tracking-wider font-sans">
                Executive Status
              </span>
              <span className="text-text-muted/40">·</span>
              <span className="text-[11px] text-text-muted">Live Telemetry</span>
              <span className="text-text-muted/40">·</span>
              <span className="text-[11px] text-text-muted">Advisors: <strong className="text-text font-semibold">{advisorsSummary}</strong></span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed font-normal">
              {monthlyRevenue > 0 || monthlyBurn > 0 ? (
                <>
                  Operating at a verified <strong className="text-text font-semibold">{formatCurrencyCompact(monthlyRevenue)}/mo</strong> run-rate with an <strong className="text-text font-semibold">{liquidRunwayMo}-month runway buffer</strong> ({formatCurrencyCompact(cashOnHand)} in reserves). Corporate health is <strong className="text-text font-semibold">{overallHealthScore >= 75 ? "Optimal" : "Stable"} ({overallHealthScore}/100)</strong>, with <strong className="text-amber-600 dark:text-amber-400 font-semibold">{bottleneckGapCount} priority {bottleneckGapCount === 1 ? "gap" : "gaps"}</strong> flagged for review.
                </>
              ) : (
                <>
                  Operating on verified baseline telemetry. Enter current billings or upload accounting data to track live cash runway, monthly revenue, and corporate health.
                </>
              )}
            </p>
          </div>

          {/* Action Controls: Horizontal Side-by-Side */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Quick Business Input Button */}
            <button
              type="button"
              onClick={() => setIsQuickInputModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 btn-tactile cursor-pointer btn-gold-gradient hover:brightness-105 shadow-sm active:scale-[0.98] transition-all text-[#1a1206]"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>+ Quick Business Input</span>
            </button>

            {/* Upload Business Data Button */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors btn-tactile cursor-pointer bg-surface hover:bg-surface-2 border border-line text-text"
            >
              <UploadCloud className="w-3.5 h-3.5 text-text-muted" />
              <span>Upload Business Data</span>
              {uploadedFileName && (
                <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" title="Custom dataset active" />
              )}
            </button>
          </div>
        </div>

        {/* Quick-Glance Executive KPI Ribbon - Minimal, Clean Typographic Status Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1 relative z-0">
          <Link
            href="/analytics"
            className="p-4 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line flex flex-col justify-between space-y-2 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-medium group-hover:text-text transition-colors">
                Overall Health
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  overallHealthScore >= 75 ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <span className={`text-[11px] font-medium ${
                  overallHealthScore >= 75 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}>
                  {overallHealthScore >= 75 ? "Optimal" : "Monitor"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text font-mono tracking-tight">
                {overallHealthScore}
              </span>
              <span className="text-xs text-text-muted font-mono">/ 100</span>
            </div>
          </Link>

          <Link
            href="/simulator"
            className="p-4 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line flex flex-col justify-between space-y-2 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-medium group-hover:text-text transition-colors">
                Liquid Runway
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  Number(liquidRunwayMo) >= 6 ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <span className="text-[11px] font-medium text-text-muted">
                  {Number(liquidRunwayMo) >= 6 ? "Safe Zone" : "Caution"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text font-mono tracking-tight">
                {liquidRunwayMo}
              </span>
              <span className="text-xs text-text-muted font-mono">months</span>
            </div>
          </Link>

          <Link
            href="/tasks"
            className="p-4 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line flex flex-col justify-between space-y-2 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-medium group-hover:text-text transition-colors">
                Execution Queue
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  activeTaskCount > 0 ? "bg-blue-500" : "bg-emerald-500"
                }`} />
                <span className="text-[11px] font-medium text-text-muted">
                  {activeTaskCount > 0 ? `${activeTaskCount} Active` : "On Schedule"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text font-mono tracking-tight">
                {activeTaskCount}
              </span>
              <span className="text-xs text-text-muted font-mono">Active</span>
            </div>
          </Link>

          <Link
            href="/gaps"
            className="p-4 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line flex flex-col justify-between space-y-2 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-medium group-hover:text-text transition-colors">
                Bottleneck Gaps
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  bottleneckGapCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                }`} />
                <span className="text-[11px] font-medium text-text-muted">
                  {bottleneckGapCount > 0 ? "Action Ready" : "Clear"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-text font-mono tracking-tight">
                {bottleneckGapCount}
              </span>
              <span className="text-xs text-text-muted font-mono">Flagged</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Interactive Dashboard Customization Panel */}
      {isEditingLayout && (
        <div className="p-5 rounded-2xl border border-gold/40 bg-surface/95 backdrop-blur-xl shadow-2xl shadow-[0_16px_40px_-10px_var(--gold-glow)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-gold" />
                <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
                  Customize Executive Layout
                </h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Toggle widget visibility, adjust grid column spans, or reset to optimal preset.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleResetLayout} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                Reset Preset
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleSaveLayout} icon={<Save className="w-3.5 h-3.5" />}>
                Save Layout
              </Button>
            </div>
          </div>

          {/* Widget customization pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeWidgets.map(widget => (
              <div
                key={widget.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                  widget.enabled
                    ? "bg-surface-2/80 border-gold/40 shadow-xs"
                    : "bg-surface-2/20 border-line opacity-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      widget.enabled ? "text-gold bg-gold/15 hover:text-rust" : "text-text-muted hover:text-gold"
                    }`}
                    title={widget.enabled ? "Hide from dashboard" : "Show on dashboard"}
                  >
                    {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className="font-semibold text-text truncate">{widget.title}</span>
                </div>

                {widget.enabled && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-text-muted font-mono mr-1">Span:</span>
                    {([2, 4] as const).map(span => (
                      <button
                        key={span}
                        type="button"
                        onClick={() => changeWidgetSpan(widget.id, span)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                          widget.defaultSpan === span
                            ? "bg-gold text-[#1a1206] font-bold shadow-xs"
                            : "bg-surface border border-line text-text-muted hover:text-text"
                        }`}
                      >
                        {span === 4 ? "Full" : "Half"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Dashboard Grid (Masonry-style dense packing) */}
      <div className="pt-4 mt-2">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Layers className="w-4 h-4 text-gold" />
          <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
            Executive Operations & Active Tooling
          </h2>
        </div>
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-max grid-flow-row-dense"
        >
          {activeWidgets
            .filter(w => w.enabled)
            .map((widget, index) => (
              <motion.div
                key={widget.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="contents"
              >
                <RenderWidget widget={widget} />
              </motion.div>
            ))}
        </motion.div>
      </div>

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onCompleted={() => {
          refreshCheckinStatus();
          setToast("Daily Executive Check-In recorded! Telemetry synchronized.");
          setTimeout(() => setToast(null), 4000);
        }}
        questionRules={checkinData.questionRules}
        questions={checkinData.questions}
      />

      {/* Business Data Upload Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(metrics) => {
          notify(`Business Data applied: ${metrics.name || companyName}! Telemetry synchronized.`);
        }}
      />

      {/* Quick Business Input Modal */}
      <QuickBusinessInputModal
        isOpen={isQuickInputModalOpen}
        onClose={() => setIsQuickInputModalOpen(false)}
        onSuccess={() => {
          notify(`Daily Business Input recorded! Live metrics updated.`);
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
