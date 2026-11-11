"use client";

import React, { useState, useEffect } from "react";
import { resolveTenantConfig, TenantContext } from "@/config/resolver";
import { RenderWidget } from "@/components/widgets/WidgetRegistry";
import { WidgetDef } from "@/config/schemas/widget";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { UploadDataModal } from "@/components/upload/UploadDataModal";
import { QuickBusinessInputModal } from "@/components/intake/QuickBusinessInputModal";
import { useBusinessDataSync } from "@/lib/upload/events";
import { usePlanName } from "@/lib/hooks/usePlanName";
import { computeHealth } from "@/lib/health/score";

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
  const planName = usePlanName();
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
  const [activeTaskCount, setActiveTaskCount] = useState<number | null>(null);
  const [bottleneckGapCount, setBottleneckGapCount] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isQuickInputModalOpen, setIsQuickInputModalOpen] = useState(false);

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
      }
    } catch {
      // keep whatever we last knew; never show a made-up zero
    }
  };

  const hasLoadedBackendWidgetsRef = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    refreshTasksCount();

    const fetchConfig = () => {
      // Instant client-side hydration from Superadmin edits in localStorage
      if (typeof window !== "undefined") {
        try {
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

    // Same formula as the health score tile
    const computedScore = computeHealth(saved).overall;
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

  const healthLabel = overallHealthScore >= 75 ? "Healthy" : "Needs data";
  const runwayLabel = Number(liquidRunwayMo) >= 6 ? "Safe" : "Short";

  const stats = [
    {
      href: "/analytics",
      label: "Business health",
      value: String(overallHealthScore),
      unit: "/ 100",
      note: healthLabel,
      good: overallHealthScore >= 75,
    },
    {
      href: "/simulator",
      label: "Cash runway",
      value: liquidRunwayMo,
      unit: "months",
      note: runwayLabel,
      good: Number(liquidRunwayMo) >= 6,
    },
    {
      href: "/tasks",
      label: "Open tasks",
      value: activeTaskCount === null ? "—" : String(activeTaskCount),
      unit: activeTaskCount === 1 ? "task" : "tasks",
      note: activeTaskCount === null ? "Loading" : activeTaskCount > 0 ? "In progress" : "All caught up",
      good: activeTaskCount === 0,
    },
    {
      href: "/gaps",
      label: "Gaps found",
      value: String(bottleneckGapCount),
      unit: bottleneckGapCount === 1 ? "gap" : "gaps",
      note: bottleneckGapCount > 0 ? "Needs review" : "None right now",
      good: bottleneckGapCount === 0,
    },
  ];

  const calendarInput =
    "w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-text text-sm focus:outline-hidden focus:border-brass cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden";

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-surface border border-line shadow-lg text-sm text-text">
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface shadow-sm p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-30">
          <div className="flex items-center gap-4 min-w-0">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-12 h-12 object-contain shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-2 text-text-muted text-base font-medium flex items-center justify-center shrink-0 select-none">
                {companyName
                  .split(" ")
                  .filter(Boolean)
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "EP"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold text-text truncate">{companyName}</h1>
              <p className="text-sm text-text-muted mt-0.5">
                {formatIndustryName(selectedIndustry)} · {planName}
                {uploadedFileName ? ` · Data from ${uploadedFileName}` : ""}
              </p>
            </div>
          </div>

          <div className="relative flex sm:inline-flex items-center p-1 bg-surface-2 rounded-xl w-full sm:w-auto sm:shrink-0">
            {["Live Today", "7 Days", "1 Month", "Custom"].map(tf => {
              const isActive =
                tf === "Custom"
                  ? selectedTimeframe.startsWith("Custom") || isCustomPickerOpen
                  : selectedTimeframe === tf;

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeChange(tf)}
                  className={`flex-1 sm:flex-none px-2 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-colors ${
                    isActive ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
                  }`}
                >
                  {tf === "Custom" && selectedTimeframe.startsWith("Custom") ? selectedTimeframe : tf}
                </button>
              );
            })}

            {isCustomPickerOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsCustomPickerOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 p-4 rounded-2xl bg-surface border border-line shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text">Select date range</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomPickerOpen(false)}
                      aria-label="Close"
                      className="p-1 text-text-muted hover:text-text cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[7, 14, 30, 90].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleApplyCustomRange(d)}
                        className={`flex-1 py-1 rounded-lg text-xs cursor-pointer border ${
                          customDaysDiff === d
                            ? "border-line-strong bg-surface-2 text-text font-medium"
                            : "border-line text-text-muted hover:text-text hover:bg-surface-2"
                        }`}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Start</span>
                      <input
                        ref={startInputRef}
                        type="date"
                        value={customStartDate}
                        onChange={e => {
                          setCustomStartDate(e.target.value);
                          if (e.target.value) setCalendarMonth(new Date(e.target.value));
                        }}
                        onClick={e => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        className={calendarInput}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">End</span>
                      <input
                        ref={endInputRef}
                        type="date"
                        value={customEndDate}
                        onChange={e => {
                          setCustomEndDate(e.target.value);
                          if (e.target.value) setCalendarMonth(new Date(e.target.value));
                        }}
                        onClick={e => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        className={calendarInput}
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        aria-label="Previous month"
                        className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-text">{calendarData.monthName}</span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        aria-label="Next month"
                        className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="py-0.5">
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: calendarData.firstDay }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-7" />
                      ))}
                      {Array.from({ length: calendarData.daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const status = getDateStatus(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleCalendarDaySelect(day)}
                            className={`h-7 w-full rounded-md flex items-center justify-center cursor-pointer ${
                              status.isSelected
                                ? "bg-brass text-white font-medium"
                                : status.isInRange
                                ? "bg-brass/15 text-text"
                                : "text-text hover:bg-surface-2"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyCustomRange()}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-brass text-white hover:brightness-110 cursor-pointer"
                  >
                    Apply ({customDaysDiff} days)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">
            {monthlyRevenue > 0 || monthlyBurn > 0 ? (
              <>
                Revenue is <span className="text-text font-medium">{formatCurrencyCompact(monthlyRevenue)} a month</span>{" "}
                and you have <span className="text-text font-medium">{liquidRunwayMo} months</span> of cash left (
                {formatCurrencyCompact(cashOnHand)} in the bank). Your health score is{" "}
                <span className="text-text font-medium">{overallHealthScore} out of 100</span>
                {bottleneckGapCount > 0 && (
                  <>
                    , with{" "}
                    <span className="text-text font-medium">
                      {bottleneckGapCount} {bottleneckGapCount === 1 ? "gap" : "gaps"}
                    </span>{" "}
                    to review
                  </>
                )}
                .
              </>
            ) : (
              <>Add your monthly billings or upload your accounting data to see cash runway, revenue and health score.</>
            )}
          </p>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsQuickInputModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-brass text-white hover:brightness-110 cursor-pointer"
            >
              Quick business input
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-line text-text hover:bg-surface-2 cursor-pointer"
            >
              Upload data
            </button>
            <button
              type="button"
              onClick={() => setIsEditingLayout(prev => !prev)}
              className="px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            >
              {isEditingLayout ? "Close customize" : "Customize"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(s => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl bg-surface-2/60 p-5 hover:bg-surface-2 transition-colors"
            >
              <p className="text-sm text-text-muted">{s.label}</p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-text">{s.value}</span>
                <span className="text-sm text-text-muted">{s.unit}</span>
              </p>
              <p className={`mt-1 text-xs ${s.good ? "text-jade" : "text-text-muted"}`}>{s.note}</p>
            </Link>
          ))}
        </div>
      </div>

      {isEditingLayout && (
        <div className="rounded-2xl border border-line bg-surface shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Customize dashboard</h2>
              <p className="text-sm text-text-muted mt-0.5">Show or hide sections and choose how wide each one is.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetLayout}
                className="px-3.5 py-2 rounded-lg text-sm border border-line text-text hover:bg-surface-2 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="px-3.5 py-2 rounded-lg text-sm font-medium bg-brass text-white hover:brightness-110 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeWidgets.map(widget => (
              <div
                key={widget.id}
                className={`px-3.5 py-3 rounded-xl bg-surface-2/60 flex items-center justify-between gap-3 ${
                  widget.enabled ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    aria-label={widget.enabled ? "Hide from dashboard" : "Show on dashboard"}
                    className="p-1 text-text-muted hover:text-text cursor-pointer"
                  >
                    {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className="text-sm text-text truncate">{widget.title}</span>
                </div>

                {widget.enabled && (
                  <div className="flex items-center p-0.5 bg-surface-2 rounded-md shrink-0">
                    {([2, 4] as const).map(span => (
                      <button
                        key={span}
                        type="button"
                        onClick={() => changeWidgetSpan(widget.id, span)}
                        className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                          widget.defaultSpan === span ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-max grid-flow-row-dense">
        {activeWidgets
          .filter(w => w.enabled)
          .map(widget => (
            <RenderWidget key={widget.id} widget={widget} />
          ))}
      </div>

      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={metrics => {
          notify(`Data applied: ${metrics.name || companyName}`);
        }}
      />

      <QuickBusinessInputModal
        isOpen={isQuickInputModalOpen}
        onClose={() => setIsQuickInputModalOpen(false)}
        onSuccess={() => {
          notify("Business input saved");
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
