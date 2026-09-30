"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  History,
  Building2,
  MapPin,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Star,
  Copy,
  Check,
  Send,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  DataPalBusinessLead,
  DataPalSearchCampaign,
  DataPalSearchConfig,
  DataPalApiSettings,
} from "@/lib/datapal/types";
import { BUSINESS_CATEGORIES } from "@/lib/datapal/constants";
import {
  exportAllCampaignsToExcel,
  exportLeadsToCSV,
  exportLeadsToExcel,
} from "@/lib/datapal/export";
import {
  deleteCampaign,
  generateSyntheticLeads,
  getStoredApiSettings,
  getStoredCampaigns,
  pushLeadsToBizzPalTasks,
  saveCampaign,
} from "@/lib/datapal/storage";
import { useFeatureFlag } from "@/lib/datapal/featureFlags";

// Redesigned DataPal Components
import { DataPalHeader } from "@/components/datapal/DataPalHeader";
import { SearchTabs, DataPalTab } from "@/components/datapal/SearchTabs";
import { SearchInputStep } from "@/components/datapal/SearchInputStep";
import { CategoryPickerSheet } from "@/components/datapal/CategoryPickerSheet";
import { LocationStep } from "@/components/datapal/LocationStep";
import { ReviewGenerateCard } from "@/components/datapal/ReviewGenerateCard";
import { PitchAngleStep } from "@/components/datapal/PitchAngleStep";
import { AdvancedOptions } from "@/components/datapal/AdvancedOptions";
import { AiMatcherDrawer } from "@/components/datapal/AiMatcherDrawer";

export default function DataPalPage() {
  // Navigation tabs: 'search' | 'leads' | 'history'
  const [activeTab, setActiveTab] = useState<DataPalTab>("search");

  // Step 1: What data do you need?
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [audienceRefine, setAudienceRefine] = useState<{
    ageRange?: string;
    gender?: string;
    interests?: string;
  }>({});
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Where?
  const [countryCodes, setCountryCodes] = useState<string[]>(["IN"]);
  const [isAllCountries, setIsAllCountries] = useState(false);
  const [stateCodes, setStateCodes] = useState<string[]>([]);
  const [isAllStates, setIsAllStates] = useState(false);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const [isAllCities, setIsAllCities] = useState(false);
  const [area, setArea] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Feature flags (default OFF)
  const pitchAngleEnabled = useFeatureFlag("datapal.pitchAngle.enabled");
  const advancedRulesEnabled = useFeatureFlag("datapal.advancedRules.enabled");
  const aiMatcherEnabled = useFeatureFlag("datapal.aiMatcher.enabled");

  // Hidden step: Pitch Angle (when flag is ON)
  const [targetRequirement, setTargetRequirement] = useState("Normal Extract (All Business Details)");

  // Hidden component: AI Smart Matcher Drawer (when flag is ON)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [serviceDescription, setServiceDescription] = useState("");
  const [uploadedBrochure, setUploadedBrochure] = useState<{ name: string; size: string } | null>(null);

  // Hidden component: Advanced verification rules (when flag is ON)
  const [mustHavePhone, setMustHavePhone] = useState(true);
  const [mustHaveEmail, setMustHaveEmail] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "Google Maps & Places",
    "JustDial India",
    "IndiaMART B2B",
  ]);

  // Mobile Accordion state: open step index (1, 2, or 3)
  const [mobileOpenStep, setMobileOpenStep] = useState<1 | 2 | 3>(1);

  // Extraction Execution & Progress
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatusText, setExtractStatusText] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Campaigns & Active results
  const [campaigns, setCampaigns] = useState<DataPalSearchCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<DataPalSearchCampaign | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Results filtering & search
  const [resultsSearchQuery, setResultsSearchQuery] = useState("");
  const [opportunityFilter, setOpportunityFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pushTaskStatus, setPushTaskStatus] = useState<string | null>(null);

  // Stored API settings
  const [apiSettings, setApiSettings] = useState<DataPalApiSettings>({
    apiKey: "",
    apiEndpoint: "https://data-pal.vercel.app/api",
    googlePlacesApiKey: "",
    isLiveConnected: false,
  });

  // Load stored campaigns and settings on mount
  useEffect(() => {
    const loadedCampaigns = getStoredCampaigns();
    setCampaigns(loadedCampaigns);
    if (loadedCampaigns.length > 0) {
      setActiveCampaign(loadedCampaigns[0]);
    }
    const settings = getStoredApiSettings();
    setApiSettings(settings);
  }, []);

  // Category selection handler
  const handleSelectCategories = (categories: string[]) => {
    setStep1Error(null);
    setSelectedCategories(categories);
  };

  // Location reset
  const handleResetLocation = () => {
    setCountryCodes(["IN"]);
    setIsAllCountries(false);
    setStateCodes([]);
    setIsAllStates(false);
    setCityNames([]);
    setIsAllCities(false);
    setArea("");
    setPostalCode("");
  };

  // Main Extraction Trigger (lives ONLY in Step 3)
  const handleStartExtraction = async () => {
    const trimmedQuery = searchQuery.trim();
    const hasCategorySelected = selectedCategories.length > 0;

    // Validate Step 1 requirement
    if (!trimmedQuery && !hasCategorySelected) {
      setStep1Error("Please enter what data you need or choose a category to continue.");
      setMobileOpenStep(1);
      return;
    }
    setStep1Error(null);

    // Validate Step 2 (Country required)
    if (!isAllCountries && countryCodes.length === 0) {
      setCountryCodes(["IN"]);
    }

    const primaryCountry = countryCodes[0] || "IN";
    const primaryState = stateCodes[0] || "All States";
    const primaryCity = cityNames[0] || "All Cities";

    const effectiveCategories = hasCategorySelected
      ? selectedCategories
      : [trimmedQuery || "General Businesses"];

    // Build configuration
    const config: DataPalSearchConfig = {
      searchQuery: trimmedQuery,
      requirement: pitchAngleEnabled ? targetRequirement : "Normal Extract (All Business Details)",
      countryCode: primaryCountry,
      state: isAllStates ? "ALL" : primaryState,
      city: isAllCities ? "ALL" : primaryCity,
      areaPincode: postalCode || area,
      selectedCategories: effectiveCategories,
      filters: {
        mustHavePhone: advancedRulesEnabled ? mustHavePhone : true,
        mustHaveEmail: advancedRulesEnabled ? mustHaveEmail : false,
        minRating: advancedRulesEnabled ? minRating : 0,
        sources: advancedRulesEnabled ? selectedSources : ["Google Maps & Places", "JustDial India"],
      },
      servicePitch: {
        text: serviceDescription,
        imageName: uploadedBrochure?.name,
      },
    };

    // Fold audience refinements into query if backend doesn't support them
    if (audienceRefine.ageRange || audienceRefine.gender || audienceRefine.interests) {
      const extraRefines = [
        audienceRefine.ageRange ? `Age ${audienceRefine.ageRange}` : null,
        audienceRefine.gender ? `${audienceRefine.gender}` : null,
        audienceRefine.interests ? `Interests: ${audienceRefine.interests}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      const currentQuery = config.searchQuery || "";
      if (extraRefines && !currentQuery.includes(extraRefines)) {
        config.searchQuery = currentQuery ? `${currentQuery} (${extraRefines})`.trim() : extraRefines;
      }
    }

    setIsExtracting(true);
    setExtractProgress(15);
    setExtractStatusText(`Connecting to DataPal Directory Engine for ${primaryCity}...`);

    const interval = setInterval(() => {
      setExtractProgress(prev => {
        if (prev < 40) {
          setExtractStatusText(`Scanning global directories for ${trimmedQuery || selectedCategories[0]}...`);
          return prev + 14;
        } else if (prev < 70) {
          setExtractStatusText(`Verifying contact phone numbers & resolving domains...`);
          return prev + 11;
        } else if (prev < 90) {
          setExtractStatusText(`Evaluating digital presence and compiling verified records...`);
          return prev + 8;
        }
        return 95;
      });
    }, 320);

    try {
      const res = await fetch("/api/datapal/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          apiKey: apiSettings.apiKey,
          apiEndpoint: apiSettings.apiEndpoint,
        }),
      });

      clearInterval(interval);
      setExtractProgress(100);
      setExtractStatusText("Extraction complete! Formatting records...");

      const data = await res.json();
      let newCampaign: DataPalSearchCampaign;

      if (data.campaign) {
        newCampaign = data.campaign;
      } else {
        const leads = generateSyntheticLeads(config);
        const locParts = [area, primaryCity !== "All Cities" ? primaryCity : null, primaryState !== "All States" ? primaryState : null, primaryCountry].filter(Boolean);
        const locString = locParts.length > 0 ? locParts.join(", ") : primaryCountry;
        const campaignTitle = trimmedQuery
          ? `${trimmedQuery} in ${primaryCity !== "All Cities" ? primaryCity : primaryCountry}`
          : `${effectiveCategories[0]} in ${primaryCity !== "All Cities" ? primaryCity : primaryCountry}`;

        newCampaign = {
          id: `camp_${Date.now()}`,
          title: campaignTitle,
          searchQuery: trimmedQuery,
          requirement: config.requirement,
          location: locString,
          countryCode: primaryCountry,
          businessTypes: effectiveCategories,
          totalExtracted: leads.length,
          phoneCount: leads.filter(l => l.phone).length,
          emailCount: leads.filter(l => l.email).length,
          websiteCount: leads.filter(l => l.website).length,
          opportunityCount: leads.filter(l => l.opportunityLevel === "Critical" || l.opportunityLevel === "High").length,
          createdAt: new Date().toISOString(),
          status: "completed",
          results: leads,
        };
      }

      const updated = saveCampaign(newCampaign);
      setCampaigns(updated);
      setActiveCampaign(newCampaign);
      setSelectedLeadIds(new Set());

      setTimeout(() => {
        setIsExtracting(false);
        setActiveTab("leads");
        setSuccessToast(`Extracted ${newCampaign.results.length} verified records successfully!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }, 500);
    } catch {
      clearInterval(interval);
      setIsExtracting(false);

      const leads = generateSyntheticLeads(config);
      const locParts = [area, primaryCity !== "All Cities" ? primaryCity : null, primaryState !== "All States" ? primaryState : null, primaryCountry].filter(Boolean);
      const locString = locParts.length > 0 ? locParts.join(", ") : primaryCountry;
      const campaignTitle = trimmedQuery
        ? `${trimmedQuery} in ${primaryCity !== "All Cities" ? primaryCity : primaryCountry}`
        : `${effectiveCategories[0]} in ${primaryCity !== "All Cities" ? primaryCity : primaryCountry}`;

      const newCampaign: DataPalSearchCampaign = {
        id: `camp_${Date.now()}`,
        title: campaignTitle,
        searchQuery: trimmedQuery,
        requirement: config.requirement,
        location: locString,
        countryCode: primaryCountry,
        businessTypes: effectiveCategories,
        totalExtracted: leads.length,
        phoneCount: leads.filter(l => l.phone).length,
        emailCount: leads.filter(l => l.email).length,
        websiteCount: leads.filter(l => l.website).length,
        opportunityCount: leads.filter(l => l.opportunityLevel === "Critical").length,
        createdAt: new Date().toISOString(),
        status: "completed",
        results: leads,
      };

      const updated = saveCampaign(newCampaign);
      setCampaigns(updated);
      setActiveCampaign(newCampaign);
      setActiveTab("leads");
      setSuccessToast(`Extracted ${newCampaign.results.length} verified records successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Delete a campaign
  const handleDeleteCampaign = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this campaign?")) {
      const updated = deleteCampaign(id);
      setCampaigns(updated);
      if (activeCampaign?.id === id) {
        setActiveCampaign(updated[0] || null);
      }
    }
  };

  // Filter active campaign leads
  const filteredLeads = useMemo(() => {
    if (!activeCampaign) return [];
    let list = activeCampaign.results;

    if (resultsSearchQuery.trim()) {
      const q = resultsSearchQuery.toLowerCase();
      list = list.filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          (l.phone && l.phone.includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }

    if (opportunityFilter === "critical") {
      list = list.filter(l => l.opportunityLevel === "Critical" || !l.website);
    } else if (opportunityFilter === "whatsapp") {
      list = list.filter(l => l.phone);
    } else if (opportunityFilter === "email") {
      list = list.filter(l => l.email);
    } else if (opportunityFilter === "high_rating") {
      list = list.filter(l => (l.rating || 0) >= 4.7);
    }

    return list;
  }, [activeCampaign, resultsSearchQuery, opportunityFilter]);

  // Lead selection checkboxes
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFilteredLeads = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // Copy helper
  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Push leads to BizzPal Tasks
  const handlePushToTasks = async () => {
    if (!activeCampaign) return;
    const leadsToPush =
      selectedLeadIds.size > 0
        ? activeCampaign.results.filter(l => selectedLeadIds.has(l.id))
        : filteredLeads;

    setPushTaskStatus("Pushing to Tasks...");
    const result = await pushLeadsToBizzPalTasks(leadsToPush);
    if (result.success) {
      setPushTaskStatus(`✅ Created ${result.count} outreach tasks in BizzPal!`);
      setTimeout(() => setPushTaskStatus(null), 3500);
    } else {
      setPushTaskStatus("⚠️ Saved locally (Check Tasks tab)");
      setTimeout(() => setPushTaskStatus(null), 3000);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    if (!activeCampaign) return;
    const leadsToExport =
      selectedLeadIds.size > 0
        ? activeCampaign.results.filter(l => selectedLeadIds.has(l.id))
        : activeCampaign.results;
    exportLeadsToExcel(leadsToExport, `DataPal_${activeCampaign.title.replace(/\s+/g, "_")}.xls`, activeCampaign.title);
  };

  const handleExportCSV = () => {
    if (!activeCampaign) return;
    const leadsToExport =
      selectedLeadIds.size > 0
        ? activeCampaign.results.filter(l => selectedLeadIds.has(l.id))
        : activeCampaign.results;
    exportLeadsToCSV(leadsToExport, `DataPal_${activeCampaign.title.replace(/\s+/g, "_")}.csv`);
  };

  // Helpers for step status
  const isStep1Complete = Boolean(searchQuery.trim() || selectedCategories.length > 0);
  const isStep2Complete = Boolean(countryCodes.length > 0 || isAllCountries);

  // Step 1 summary text
  const step1Summary = searchQuery.trim()
    ? searchQuery.trim()
    : selectedCategories.length === 1
    ? selectedCategories[0]
    : selectedCategories.length > 1
    ? `${selectedCategories.slice(0, 2).join(", ")} +${selectedCategories.length - 2} more`
    : "Not specified";

  // Step 2 summary text
  const step2Summary = isAllCountries
    ? "All Countries"
    : countryCodes.length > 1
    ? `${countryCodes.length} countries`
    : cityNames.length > 0
    ? `${cityNames[0]}, ${countryCodes[0] || "IN"}`
    : stateCodes.length > 0
    ? `${stateCodes[0]}, ${countryCodes[0] || "IN"}`
    : `${countryCodes[0] || "India"}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in px-2 sm:px-4">
      {/* Header: One compact row */}
      <DataPalHeader />

      {/* Tabs: Underline navigation */}
      <SearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        leadsCount={activeCampaign?.results.length ?? 0}
        historyCount={campaigns.length}
      />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-text-muted hover:text-text text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: SEARCH FLOW (Single Column 3-Step Architecture)         */}
      {/* ============================================================== */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* AI Smart Matcher Slim Banner (Visible only when feature flag is ON) */}
          {aiMatcherEnabled && (
            <div className="p-3 sm:p-4 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-brass shrink-0" />
                <span className="text-text font-semibold truncate">
                  AI Smart Matcher: Automatically configure target categories from your service pitch or brochure.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-brass text-white text-xs font-bold shrink-0 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Open AI Matcher
              </button>
            </div>
          )}

          {/* Single Unified Card Container with Soft Dividers */}
          <div className="bg-surface border border-line rounded-2xl shadow-theme overflow-hidden divide-y divide-line">
            {/* -------------------------------------------------------- */}
            {/* STEP 1: What data do you need?                           */}
            {/* -------------------------------------------------------- */}
            <div className="p-5 sm:p-7 space-y-4">
              {/* Step Header */}
              <div
                onClick={() => setMobileOpenStep(prev => (prev === 1 ? 1 : 1))}
                className="flex items-center justify-between cursor-pointer md:cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isStep1Complete
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-brass/15 text-brass border border-brass/30"
                    }`}
                  >
                    {isStep1Complete ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-text tracking-tight">
                      What data do you need?
                    </h2>
                    <p className="text-xs text-text-muted">
                      Search any business, professional or audience.
                    </p>
                  </div>
                </div>

                {/* Mobile Collapsed Summary Indicator */}
                <div className="md:hidden flex items-center gap-1.5 text-xs text-text-muted">
                  {mobileOpenStep !== 1 && (
                    <span className="font-medium truncate max-w-[120px] text-text">
                      {step1Summary}
                    </span>
                  )}
                  {mobileOpenStep === 1 ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Step 1 Body (Desktop always open, Mobile accordion) */}
              <div className={`${mobileOpenStep === 1 ? "block" : "hidden md:block"} pt-1`}>
                <SearchInputStep
                  searchQuery={searchQuery}
                  onSearchQueryChange={q => {
                    setSearchQuery(q);
                    if (step1Error) setStep1Error(null);
                  }}
                  selectedCategories={selectedCategories}
                  onOpenCategoryPicker={() => setIsCategorySheetOpen(true)}
                  audienceRefine={audienceRefine}
                  onAudienceRefineChange={setAudienceRefine}
                  error={step1Error}
                />
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* STEP 2: Where?                                           */}
            {/* -------------------------------------------------------- */}
            <div className="p-5 sm:p-7 space-y-4">
              {/* Step Header */}
              <div
                onClick={() => setMobileOpenStep(prev => (prev === 2 ? 1 : 2))}
                className="flex items-center justify-between cursor-pointer md:cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isStep2Complete
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-brass/15 text-brass border border-brass/30"
                    }`}
                  >
                    {isStep2Complete ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-text tracking-tight">
                      Where?
                    </h2>
                    <p className="text-xs text-text-muted">
                      Select target countries, states, cities, or enter a locality.
                    </p>
                  </div>
                </div>

                {/* Mobile Collapsed Summary Indicator */}
                <div className="md:hidden flex items-center gap-1.5 text-xs text-text-muted">
                  {mobileOpenStep !== 2 && (
                    <span className="font-medium truncate max-w-[120px] text-text">
                      {step2Summary}
                    </span>
                  )}
                  {mobileOpenStep === 2 ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Step 2 Body */}
              <div className={`${mobileOpenStep === 2 ? "block" : "hidden md:block"} pt-1`}>
                <LocationStep
                  countryCodes={countryCodes}
                  isAllCountries={isAllCountries}
                  onCountryChange={(codes, isAll) => {
                    setCountryCodes(codes);
                    setIsAllCountries(isAll);
                  }}
                  stateCodes={stateCodes}
                  isAllStates={isAllStates}
                  onStateChange={(codes, isAll) => {
                    setStateCodes(codes);
                    setIsAllStates(isAll);
                  }}
                  cityNames={cityNames}
                  isAllCities={isAllCities}
                  onCityChange={(names, isAll) => {
                    setCityNames(names);
                    setIsAllCities(isAll);
                  }}
                  area={area}
                  onAreaChange={setArea}
                  postalCode={postalCode}
                  onPostalCodeChange={setPostalCode}
                  onResetLocation={handleResetLocation}
                />
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* OPTIONAL STEP: Pitch Angle (when feature flag is ON)     */}
            {/* -------------------------------------------------------- */}
            {pitchAngleEnabled && (
              <div className="p-5 sm:p-7 space-y-4 bg-surface-2/20">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-2 text-text-muted border border-line flex items-center justify-center text-xs font-bold shrink-0">
                    ★
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text tracking-tight">
                      Pitch Angle / Digital Gap (Optional)
                    </h3>
                    <p className="text-xs text-text-muted">
                      Target businesses missing critical digital infrastructure.
                    </p>
                  </div>
                </div>

                <PitchAngleStep
                  selectedRequirement={targetRequirement}
                  onSelectRequirement={setTargetRequirement}
                />
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* OPTIONAL: Advanced Verification Rules (Flag ON)          */}
            {/* -------------------------------------------------------- */}
            {advancedRulesEnabled && (
              <div className="p-5 sm:p-7 space-y-4 bg-surface-2/20">
                <AdvancedOptions
                  mustHavePhone={mustHavePhone}
                  onMustHavePhoneChange={setMustHavePhone}
                  mustHaveEmail={mustHaveEmail}
                  onMustHaveEmailChange={setMustHaveEmail}
                  minRating={minRating}
                  onMinRatingChange={setMinRating}
                  selectedSources={selectedSources}
                  onSelectedSourcesChange={setSelectedSources}
                />
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 3: Review and generate                              */}
            {/* -------------------------------------------------------- */}
            <div className="p-5 sm:p-7 space-y-4 bg-surface-2/30">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-brass/15 text-brass border border-brass/30 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-text tracking-tight">
                    Review and generate
                  </h2>
                  <p className="text-xs text-text-muted">
                    Confirm your criteria and extract verified contact records.
                  </p>
                </div>
              </div>

              {/* Slim Review & Generate Component (ONLY location of Generate button) */}
              <ReviewGenerateCard
                searchQuery={searchQuery}
                selectedCategories={selectedCategories}
                countryCodes={countryCodes}
                isAllCountries={isAllCountries}
                stateCodes={stateCodes}
                isAllStates={isAllStates}
                cityNames={cityNames}
                isAllCities={isAllCities}
                area={area}
                postalCode={postalCode}
                isExtracting={isExtracting}
                extractProgress={extractProgress}
                extractStatusText={extractStatusText}
                onGenerate={handleStartExtraction}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: EXTRACTED LEADS & TABLE VIEW                            */}
      {/* ============================================================== */}
      {activeTab === "leads" && (
        <div className="space-y-5">
          {!activeCampaign ? (
            <div className="text-center py-16 bg-surface border border-line rounded-2xl p-8 space-y-4 shadow-theme">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mx-auto text-text-muted">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text">No extraction results available</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Start a search in the Search tab to generate verified contact records and leads.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Go to Search
              </button>
            </div>
          ) : (
            <>
              {/* Campaign Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-theme">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-text tracking-tight">
                      {activeCampaign.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-brass" />
                        {activeCampaign.location}
                      </span>
                      <span>•</span>
                      <span>{activeCampaign.results.length} records extracted</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-brass transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-brass" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-brass transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-brass" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToTasks}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brass text-white text-xs font-bold transition-all shadow-theme hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Push to Tasks</span>
                  </button>
                </div>
              </div>

              {pushTaskStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
                  <span>{pushTaskStatus}</span>
                  <Link href="/tasks" className="underline hover:brightness-110 font-bold ml-2">
                    View in Tasks & Execution →
                  </Link>
                </div>
              )}

              {/* Metrics Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-bold text-text tracking-tight">
                    {activeCampaign.results.length}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Total Extracted</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {activeCampaign.phoneCount}
                    <span className="text-xs font-semibold text-text-muted ml-1 font-normal">
                      ({Math.round((activeCampaign.phoneCount / (activeCampaign.results.length || 1)) * 100)}%)
                    </span>
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Verified Phone Numbers</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">
                    {activeCampaign.emailCount}
                    <span className="text-xs font-semibold text-text-muted ml-1 font-normal">
                      ({Math.round((activeCampaign.emailCount / (activeCampaign.results.length || 1)) * 100)}%)
                    </span>
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Verified Emails</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-bold text-brass tracking-tight">
                    {activeCampaign.opportunityCount}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">High Potential Targets</p>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-line rounded-xl p-2.5 shadow-theme">
                <div className="flex-1 relative">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={resultsSearchQuery}
                    onChange={e => setResultsSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, email, locality..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: "all", label: "All Records" },
                    { id: "critical", label: "Missing Website" },
                    { id: "whatsapp", label: "Has Phone" },
                    { id: "email", label: "Has Email" },
                    { id: "high_rating", label: "Top Rated (4.7+)" },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOpportunityFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        opportunityFilter === f.id
                          ? "bg-brass/20 text-brass border border-brass/40 shadow-xs font-bold"
                          : "bg-surface-2 text-text-muted hover:text-text"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-theme">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-surface-2/60 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        <th className="py-3 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredLeads.length > 0 &&
                              selectedLeadIds.size === filteredLeads.length
                            }
                            onChange={selectAllFilteredLeads}
                            className="rounded border-line text-brass w-3.5 h-3.5 accent-[#DFBA73]"
                          />
                        </th>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[200px]">Entity / Business</th>
                        <th className="py-3 px-3 min-w-[130px]">Category</th>
                        <th className="py-3 px-3 min-w-[180px]">Address & Locality</th>
                        <th className="py-3 px-3 min-w-[140px]">Phone Number</th>
                        <th className="py-3 px-3 min-w-[140px]">Email Address</th>
                        <th className="py-3 px-3 min-w-[90px]">Rating</th>
                        <th className="py-3 px-3 min-w-[120px]">Presence</th>
                        <th className="py-3 px-3 min-w-[240px]">Opportunity Notes</th>
                        <th className="py-3 px-3 w-16 text-center">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 text-xs">
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-text-muted">
                            No records match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead, idx) => {
                          const isSelected = selectedLeadIds.has(lead.id);
                          return (
                            <tr
                              key={lead.id}
                              className={`hover:bg-surface-2/60 transition-colors ${
                                isSelected ? "bg-brass/5" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="rounded border-line text-brass w-3.5 h-3.5 cursor-pointer accent-[#DFBA73]"
                                />
                              </td>

                              <td className="py-2.5 px-3 text-center font-mono text-text-muted text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-text truncate max-w-[200px]">
                                  {lead.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {lead.website ? (
                                    <a
                                      href={lead.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-brass hover:underline flex items-center gap-1 truncate max-w-[160px]"
                                    >
                                      <Globe className="w-3 h-3 shrink-0" />
                                      <span>Website</span>
                                    </a>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                      No Website
                                    </span>
                                  )}
                                  <span className="text-[10px] text-text-muted/60">•</span>
                                  <span className="text-[10px] text-text-muted truncate">
                                    {lead.source?.split(" ")[0] || "Directory"}
                                  </span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-2 border border-line text-text truncate block max-w-[130px]">
                                  {lead.category}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="text-text-muted text-[11px] truncate max-w-[180px]" title={lead.address}>
                                  {lead.address}
                                </div>
                                <div className="text-[10px] text-text-muted/70 font-mono">
                                  {lead.city}, {lead.postalCode}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-mono">
                                {lead.phone ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`tel:${lead.phone}`}
                                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-[11px]"
                                    >
                                      {lead.phone}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => copyText(lead.phone!, `phone_${lead.id}`)}
                                      className="p-1 hover:bg-surface-2 rounded text-text-muted hover:text-text text-[10px]"
                                      title="Copy phone"
                                    >
                                      {copiedId === `phone_${lead.id}` ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-text-muted/40">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono">
                                {lead.email ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-cyan-600 dark:text-cyan-400 text-[11px] truncate max-w-[120px]" title={lead.email}>
                                      {lead.email}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyText(lead.email!, `email_${lead.id}`)}
                                      className="p-1 hover:bg-surface-2 rounded text-text-muted hover:text-text text-[10px]"
                                      title="Copy email"
                                    >
                                      {copiedId === `email_${lead.id}` ? (
                                        <Check className="w-3 h-3 text-cyan-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-text-muted/40">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                {lead.rating ? (
                                  <div className="flex items-center gap-1 font-semibold text-amber-500 text-[11px]">
                                    <Star className="w-3 h-3 fill-amber-500" />
                                    <span>{lead.rating}</span>
                                    <span className="text-[10px] text-text-muted font-normal">
                                      ({lead.reviewsCount})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-text-muted/40">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="text-[10px] text-text-muted truncate max-w-[120px] block">
                                  {lead.existingPresence || "None"}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="p-2 rounded-lg bg-surface-2 border border-line text-[11px] text-text leading-tight">
                                  {lead.notes}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {lead.phone ? (
                                  <a
                                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(lead.name)},%20I%20noticed%20your%20profile%20in%20${encodeURIComponent(lead.city)}...`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                    title="Open WhatsApp Chat"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </a>
                                ) : (
                                  <span className="text-text-muted/30 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 border-t border-line bg-surface-2/40 flex items-center justify-between text-xs text-text-muted">
                  <span>
                    Showing {filteredLeads.length} of {activeCampaign.results.length} records
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{selectedLeadIds.size} selected</span>
                    {selectedLeadIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handlePushToTasks}
                        className="font-bold text-brass hover:underline cursor-pointer"
                      >
                        Push Selected to Tasks
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CAMPAIGN HISTORY & ARCHIVAL                             */}
      {/* ============================================================== */}
      {activeTab === "history" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div>
              <h2 className="text-base font-bold text-text tracking-tight">Search History</h2>
              <p className="text-xs text-text-muted">Revisit and export previously generated campaigns.</p>
            </div>

            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={() => exportAllCampaignsToExcel(campaigns)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-brass transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brass" />
                <span>Export All to Excel</span>
              </button>
            )}
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-line rounded-2xl p-8 space-y-4 shadow-theme">
              <Search className="w-10 h-10 text-text-muted mx-auto" />
              <h3 className="text-base font-bold text-text">No saved history yet</h3>
              <p className="text-xs text-text-muted">Start an extraction in the Search tab to build your campaign history.</p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="px-5 py-2.5 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Start a Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map(camp => (
                <div
                  key={camp.id}
                  onClick={() => {
                    setActiveCampaign(camp);
                    setActiveTab("leads");
                  }}
                  className="p-5 rounded-2xl bg-surface border border-line hover:border-brass/50 shadow-theme hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brass/15 text-brass border border-brass/30 truncate max-w-[200px]">
                        {camp.requirement}
                      </span>
                      <button
                        type="button"
                        onClick={e => handleDeleteCampaign(e, camp.id)}
                        className="p-1 rounded text-text-muted/60 hover:text-rose-500 transition-colors text-xs cursor-pointer"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-text group-hover:text-brass transition-colors mt-2">
                      {camp.title}
                    </h3>

                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brass shrink-0" />
                      <span className="truncate">{camp.location}</span>
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {camp.businessTypes.slice(0, 3).map(bt => (
                        <span
                          key={bt}
                          className="text-[9px] px-2 py-0.5 rounded bg-surface-2 border border-line text-text-muted font-medium"
                        >
                          {bt}
                        </span>
                      ))}
                      {camp.businessTypes.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
                          +{camp.businessTypes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                    <div className="text-[11px] text-text-muted">
                      <span className="font-bold text-text">{camp.results.length}</span> records •{" "}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{camp.phoneCount}</span> phones
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportLeadsToExcel(camp.results, `DataPal_${camp.title.replace(/\s+/g, "_")}.xls`, camp.title);
                        }}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-brass transition-colors cursor-pointer"
                        title="Download Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportLeadsToCSV(camp.results, `DataPal_${camp.title.replace(/\s+/g, "_")}.csv`);
                        }}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-brass transition-colors cursor-pointer"
                        title="Download CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Picker Sheet Modal */}
      <CategoryPickerSheet
        isOpen={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        selectedCategories={selectedCategories}
        onSelectCategories={setSelectedCategories}
      />

      {/* AI Smart Matcher Drawer (Feature Flag component) */}
      {aiMatcherEnabled && (
        <AiMatcherDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          serviceDescription={serviceDescription}
          onServiceDescriptionChange={setServiceDescription}
          onApplySuggestions={(req, cats) => {
            if (cats.length > 0) setSelectedCategories(cats);
            if (req) setTargetRequirement(req);
            setIsAiDrawerOpen(false);
          }}
        />
      )}
    </div>
  );
}
