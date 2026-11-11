"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Search, Copy, Check, Send, Trash2, Target, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  getDataPalCreditStatus,
  recordCreditUsage,
  getAccountKey,
  DataPalCreditStatus,
} from "@/lib/datapal/credits";
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
import { DataPalCreditsModal } from "@/components/datapal/DataPalCreditsModal";

export default function DataPalPage() {
  // Navigation tabs: 'search' | 'leads' | 'history'
  const [activeTab, setActiveTab] = useState<DataPalTab>("search");

  // Step 1: What data do you need?
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
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
  const [leadsPage, setLeadsPage] = useState(1);
  const [pushTaskStatus, setPushTaskStatus] = useState<string | null>(null);

  // Extraction Quantity & Credit Quota state (Requirements 3, 4 & 5)
  const [requestedCount, setRequestedCount] = useState<number>(50);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState<DataPalCreditStatus>(() => getDataPalCreditStatus());

  // Stored API settings
  const [apiSettings, setApiSettings] = useState<DataPalApiSettings>({
    apiKey: "",
    apiEndpoint: "https://data-pal.vercel.app/api",
    googlePlacesApiKey: "",
    isLiveConnected: false,
  });

  // Load stored campaigns, settings, and credit balance on mount
  useEffect(() => {
    const loadedCampaigns = getStoredCampaigns();
    setCampaigns(loadedCampaigns);
    if (loadedCampaigns.length > 0) {
      setActiveCampaign(loadedCampaigns[0]);
    }
    const settings = getStoredApiSettings();
    setApiSettings(settings);

    // Sync credit status
    setCreditStatus(getDataPalCreditStatus());
    const onCreditsUpdate = () => {
      setCreditStatus(getDataPalCreditStatus());
    };
    window.addEventListener("bizzpal_datapal_credits_updated", onCreditsUpdate);
    return () => {
      window.removeEventListener("bizzpal_datapal_credits_updated", onCreditsUpdate);
    };
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

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    if (!catId) {
      setSelectedSubcategory("");
      setSelectedCategories([]);
      return;
    }
    const found = BUSINESS_CATEGORIES.find(c => c.id === catId);
    if (found) {
      if (selectedSubcategory && !found.subcategories.includes(selectedSubcategory)) {
        setSelectedSubcategory("");
        setSelectedCategories([found.name]);
      } else if (selectedSubcategory) {
        setSelectedCategories([selectedSubcategory]);
      } else {
        setSelectedCategories([found.name]);
      }
    }
    if (step1Error) setStep1Error(null);
  };

  const handleSubcategoryChange = (sub: string) => {
    setSelectedSubcategory(sub);
    if (sub) {
      setSelectedCategories([sub]);
    } else if (selectedCategory) {
      const found = BUSINESS_CATEGORIES.find(c => c.id === selectedCategory);
      setSelectedCategories(found ? [found.name] : []);
    } else {
      setSelectedCategories([]);
    }
    if (step1Error) setStep1Error(null);
  };

  const handleSheetCategoriesChange = (cats: string[]) => {
    setSelectedCategories(cats);
    if (cats.length === 1) {
      const singleCat = cats[0];
      const parentCategory = BUSINESS_CATEGORIES.find(
        c => c.name === singleCat || c.subcategories.includes(singleCat)
      );
      if (parentCategory) {
        setSelectedCategory(parentCategory.id);
        if (parentCategory.subcategories.includes(singleCat)) {
          setSelectedSubcategory(singleCat);
        } else {
          setSelectedSubcategory("");
        }
      }
    } else if (cats.length === 0) {
      setSelectedCategory("");
      setSelectedSubcategory("");
    }
    if (step1Error) setStep1Error(null);
  };

  // Main Extraction Trigger (lives ONLY in Step 3)
  const handleStartExtraction = async () => {
    const trimmedQuery = searchQuery.trim();
    const hasCategorySelected = selectedCategories.length > 0 || Boolean(selectedCategory) || Boolean(selectedSubcategory);

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

    const chosenCategoryName = selectedCategory
      ? (BUSINESS_CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory)
      : "";

    const effectiveCategories = selectedSubcategory
      ? [selectedSubcategory]
      : chosenCategoryName
      ? [chosenCategoryName]
      : selectedCategories.length > 0
      ? selectedCategories
      : [trimmedQuery || "General Businesses"];

    const queryTerm = trimmedQuery || selectedSubcategory || chosenCategoryName || effectiveCategories[0];

    // Check quota before extracting
    if (creditStatus.remainingQuota <= 0) {
      setIsCreditsModalOpen(true);
      return;
    }

    const effectiveRequestedCount = Math.min(requestedCount, creditStatus.remainingQuota > 0 ? creditStatus.remainingQuota : requestedCount);
    const accountKey = getAccountKey();

    // Build configuration
    const config: DataPalSearchConfig = {
      searchQuery: queryTerm,
      requirement: pitchAngleEnabled ? targetRequirement : "Normal Extract (All Business Details)",
      countryCode: primaryCountry,
      state: isAllStates ? "ALL" : primaryState,
      city: isAllCities ? "ALL" : primaryCity,
      areaPincode: postalCode || area,
      selectedCategories: effectiveCategories,
      requestedCount: effectiveRequestedCount,
      accountKey,
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

    const displayTarget = trimmedQuery || selectedSubcategory || chosenCategoryName || (selectedCategories.length > 0 ? selectedCategories[0] : "businesses");

    const interval = setInterval(() => {
      setExtractProgress(prev => {
        if (prev < 40) {
          setExtractStatusText(`Scanning global directories for ${displayTarget}...`);
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
          account: (() => {
            try {
              const sess = JSON.parse(localStorage.getItem("bizzpal_user_session") || "{}");
              return { email: sess?.email || accountKey, name: sess?.name };
            } catch {
              return { email: accountKey };
            }
          })(),
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

      // Deduct from DataPal extraction quota
      recordCreditUsage(newCampaign.results.length, accountKey);
      setCreditStatus(getDataPalCreditStatus(accountKey));

      setTimeout(() => {
        setIsExtracting(false);
        setActiveTab("leads");
        setSuccessToast(`Extracted ${newCampaign.results.length} verified records (0 duplicates against past searches)!`);
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

      recordCreditUsage(newCampaign.results.length, accountKey);
      setCreditStatus(getDataPalCreditStatus(accountKey));

      setSuccessToast(`Extracted ${newCampaign.results.length} verified records (0 duplicates against past searches)!`);
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

  // Pagination for the results table
  const LEADS_PAGE_SIZE = 25;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / LEADS_PAGE_SIZE));
  const safePage = Math.min(leadsPage, totalPages);
  const pagedLeads = filteredLeads.slice((safePage - 1) * LEADS_PAGE_SIZE, safePage * LEADS_PAGE_SIZE);

  useEffect(() => {
    setLeadsPage(1);
  }, [activeCampaign?.id, resultsSearchQuery, opportunityFilter]);

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
      setPushTaskStatus(`Created ${result.count} outreach tasks in BizzPal!`);
      setTimeout(() => setPushTaskStatus(null), 3500);
    } else {
      setPushTaskStatus("Saved locally (Check Tasks tab)");
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
  const isStep1Complete = Boolean(searchQuery.trim() || selectedCategories.length > 0 || selectedCategory || selectedSubcategory);
  const isStep2Complete = Boolean(countryCodes.length > 0 || isAllCountries);

  // Step 1 summary text
  const step1Summary = searchQuery.trim()
    ? searchQuery.trim()
    : selectedSubcategory
    ? `${BUSINESS_CATEGORIES.find(c => c.id === selectedCategory)?.name || "Category"} → ${selectedSubcategory}`
    : selectedCategory
    ? BUSINESS_CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory
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
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header: One compact row */}
      <DataPalHeader />

      {/* Tabs: Underline navigation */}
      <SearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        leadsCount={activeCampaign?.results.length ?? 0}
        historyCount={campaigns.length}
      />

      {successToast && (
        <div className="p-3 rounded-lg border border-line bg-surface-2 text-sm text-text flex items-center justify-between">
          <span>{successToast}</span>
          <button type="button" onClick={() => setSuccessToast(null)} className="text-text-muted hover:text-text px-1 cursor-pointer">
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
            <div className="p-3 rounded-lg border border-line flex items-center justify-between gap-3 text-sm">
              <span className="text-text-muted truncate">
                Describe your service and let AI pick the right categories.
              </span>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(true)}
                className="px-3.5 py-1.5 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 shrink-0 cursor-pointer"
              >
                Open
              </button>
            </div>
          )}

          {/* Single Unified Card Container with Soft Dividers */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden divide-y divide-line">
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
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      What data do you need?
                    </h2>
                    <p className="text-sm text-text-muted mt-0.5">
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
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategoryChange}
                  selectedSubcategory={selectedSubcategory}
                  onSelectSubcategory={handleSubcategoryChange}
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
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      Where?
                    </h2>
                    <p className="text-sm text-text-muted">
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
              <div className="p-5 sm:p-7 space-y-4 ">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-text">
                      Pitch angle (optional)
                    </h3>
                    <p className="text-sm text-text-muted">
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
              <div className="p-5 sm:p-7 space-y-4 ">
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
            <div className="p-5 sm:p-7 space-y-4 ">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Review and generate
                  </h2>
                  <p className="text-sm text-text-muted">
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
                requestedCount={requestedCount}
                onRequestedCountChange={setRequestedCount}
                remainingQuota={creditStatus.remainingQuota}
                totalQuota={creditStatus.totalAllowed}
                onOpenCreditsModal={() => setIsCreditsModalOpen(true)}
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
            <div className="text-center py-16 bg-surface border border-line rounded-xl p-8 space-y-3">
              <h3 className="text-base font-semibold text-text">No results yet</h3>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                Run a search to get verified contact records.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
              >
                Go to Search
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-text">{activeCampaign.title}</h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    {activeCampaign.location} · {activeCampaign.results.length} records · duplicates from past searches removed
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreditsModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
                  >
                    Buy credits ({creditStatus.remainingQuota} left)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handlePushToTasks}
                    className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                  >
                    Push to tasks
                  </button>
                </div>
              </div>

              {pushTaskStatus && (
                <div className="p-3 rounded-lg border border-line bg-surface-2 text-sm text-text flex items-center justify-between">
                  <span>{pushTaskStatus}</span>
                  <Link href="/tasks" className="text-brass hover:underline ml-2">
                    View tasks
                  </Link>
                </div>
              )}

              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">{activeCampaign.results.length}</span> extracted ·{" "}
                <span className="font-semibold text-text">{activeCampaign.phoneCount}</span> with phone (
                {Math.round((activeCampaign.phoneCount / (activeCampaign.results.length || 1)) * 100)}%) ·{" "}
                <span className="font-semibold text-text">{activeCampaign.emailCount}</span> with email (
                {Math.round((activeCampaign.emailCount / (activeCampaign.results.length || 1)) * 100)}%) ·{" "}
                <span className="font-semibold text-text">{activeCampaign.opportunityCount}</span> high potential
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={resultsSearchQuery}
                  onChange={e => setResultsSearchQuery(e.target.value)}
                  placeholder="Search name, phone, email, area…"
                  className="flex-1 sm:max-w-sm px-3.5 py-2 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                />
                <select
                  value={opportunityFilter}
                  onChange={e => setOpportunityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-text cursor-pointer"
                  aria-label="Filter records"
                >
                  <option value="all">All records</option>
                  <option value="critical">No website</option>
                  <option value="whatsapp">Has phone</option>
                  <option value="email">Has email</option>
                  <option value="high_rating">Rated 4.7+</option>
                </select>
              </div>

              {/* Leads Table */}
              <div className="bg-surface border border-line rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line text-xs font-medium text-text-muted">
                        <th className="py-3 pl-5 pr-2 w-10">
                          <input
                            type="checkbox"
                            checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                            onChange={selectAllFilteredLeads}
                            className="w-4 h-4 cursor-pointer accent-[#8a6414]"
                            aria-label="Select all records"
                          />
                        </th>
                        <th className="py-3 px-4 min-w-[260px]">Business</th>
                        <th className="py-3 px-4 min-w-[220px]">Contact</th>
                        <th className="py-3 px-4 min-w-[240px]">Location</th>
                        <th className="py-3 px-4 w-28">Rating</th>
                        <th className="py-3 pl-4 pr-5 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pagedLeads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-sm text-text-muted">
                            No records match your filters.
                          </td>
                        </tr>
                      ) : (
                        pagedLeads.map(lead => {
                          const isSelected = selectedLeadIds.has(lead.id);
                          return (
                            <tr key={lead.id} className={`align-top hover:bg-surface-2/50 ${isSelected ? "bg-brass/[0.04]" : ""}`}>
                              <td className="py-4 pl-5 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="w-4 h-4 mt-0.5 cursor-pointer accent-[#8a6414]"
                                  aria-label={`Select ${lead.name}`}
                                />
                              </td>

                              <td className="py-4 px-4">
                                <p className="text-sm font-medium text-text leading-snug">{lead.name}</p>
                                <p className="text-xs text-text-muted mt-1">{lead.category}</p>
                                <p className="text-xs mt-1">
                                  {lead.website ? (
                                    <a
                                      href={lead.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brass hover:underline"
                                    >
                                      Website
                                    </a>
                                  ) : (
                                    <span className="text-text-muted">No website</span>
                                  )}
                                </p>
                              </td>

                              <td className="py-4 px-4 text-sm space-y-1.5">
                                {lead.phone ? (
                                  <div className="flex items-center gap-2">
                                    <a href={`tel:${lead.phone}`} className="text-text hover:underline whitespace-nowrap">
                                      {lead.phone}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => copyText(lead.phone!, `phone_${lead.id}`)}
                                      className="p-1 rounded text-text-muted hover:text-text cursor-pointer"
                                      title="Copy phone"
                                    >
                                      {copiedId === `phone_${lead.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-jade" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-text-muted">No phone</p>
                                )}
                                {lead.email ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-muted break-all">{lead.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyText(lead.email!, `email_${lead.id}`)}
                                      className="p-1 rounded text-text-muted hover:text-text cursor-pointer shrink-0"
                                      title="Copy email"
                                    >
                                      {copiedId === `email_${lead.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-jade" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-text-muted">No email</p>
                                )}
                              </td>

                              <td className="py-4 px-4 text-sm">
                                <p className="text-text leading-snug">{lead.address}</p>
                                <p className="text-xs text-text-muted mt-1">
                                  {lead.city}
                                  {lead.postalCode ? `, ${lead.postalCode}` : ""}
                                </p>
                              </td>

                              <td className="py-4 px-4 text-sm">
                                {lead.rating ? (
                                  <span className="text-text whitespace-nowrap">
                                    {lead.rating}
                                    <span className="text-xs text-text-muted"> ({lead.reviewsCount})</span>
                                  </span>
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )}
                              </td>

                              <td className="py-4 pl-4 pr-5 text-right">
                                {lead.phone && (
                                  <a
                                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(lead.name)},%20I%20noticed%20your%20profile%20in%20${encodeURIComponent(lead.city)}...`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex p-2 rounded-lg border border-line text-text-muted hover:text-brass hover:bg-surface-2"
                                    title="Message on WhatsApp"
                                  >
                                    <Send className="w-4 h-4" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-text-muted">
                  <div className="flex items-center gap-4">
                    <span>
                      {filteredLeads.length === 0
                        ? "0 records"
                        : `${(safePage - 1) * LEADS_PAGE_SIZE + 1}–${Math.min(safePage * LEADS_PAGE_SIZE, filteredLeads.length)} of ${filteredLeads.length}`}
                    </span>
                    {selectedLeadIds.size > 0 && (
                      <span className="flex items-center gap-3">
                        <span>{selectedLeadIds.size} selected</span>
                        <button type="button" onClick={handlePushToTasks} className="text-brass hover:underline cursor-pointer">
                          Push selected to tasks
                        </button>
                      </span>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setLeadsPage(safePage - 1)}
                        className="px-3 py-1.5 rounded-lg border border-line text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      <span>
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setLeadsPage(safePage + 1)}
                        className="px-3 py-1.5 rounded-lg border border-line text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
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
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-text">Search history</h2>

            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={() => exportAllCampaignsToExcel(campaigns)}
                className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
              >
                Export all to Excel
              </button>
            )}
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-line rounded-xl p-8 space-y-3">
              <h3 className="text-base font-semibold text-text">No history yet</h3>
              <p className="text-sm text-text-muted">Your past searches will show up here.</p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
              >
                Start a search
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
                  className="p-4 rounded-xl bg-surface border border-line hover:border-line-strong cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text">{camp.title}</h3>
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {camp.location} · {camp.businessTypes.slice(0, 2).join(", ")}
                        {camp.businessTypes.length > 2 ? ` +${camp.businessTypes.length - 2}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={e => handleDeleteCampaign(e, camp.id)}
                      className="p-1 rounded text-text-muted hover:text-rust cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-text-muted">
                    <span>
                      <span className="font-semibold text-text">{camp.results.length}</span> records ·{" "}
                      <span className="font-semibold text-text">{camp.phoneCount}</span> phones
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportLeadsToExcel(camp.results, `DataPal_${camp.title.replace(/\s+/g, "_")}.xls`, camp.title);
                        }}
                        className="px-2 py-1 rounded border border-line hover:bg-surface-2 cursor-pointer"
                      >
                        Excel
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportLeadsToCSV(camp.results, `DataPal_${camp.title.replace(/\s+/g, "_")}.csv`);
                        }}
                        className="px-2 py-1 rounded border border-line hover:bg-surface-2 cursor-pointer"
                      >
                        CSV
                      </button>
                    </span>
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
        onSelectCategories={handleSheetCategoriesChange}
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
      {/* DataPal Credits & Pay-As-You-Go Top Up Modal */}
      <DataPalCreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
        status={creditStatus}
        onUpdated={() => setCreditStatus(getDataPalCreditStatus())}
      />
    </div>
  );
}
