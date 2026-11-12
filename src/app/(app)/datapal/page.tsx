"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Search, Trash2, Target, ChevronDown, ChevronUp } from "lucide-react";
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
  applyDuplicatePolicy,
  getStoredApiSettings,
  getStoredCampaigns,
  purgeFakeRecords,
  saveCampaign,
} from "@/lib/datapal/storage";
import {
  fetchDataPalCredits,
  getSeenLeadSignatures,
  EMPTY_CREDIT_STATUS,
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
import { ResultsView } from "@/components/datapal/ResultsView";

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

  // Results filtering & search

  // Extraction Quantity & Credit Quota state (Requirements 3, 4 & 5)
  const [requestedCount, setRequestedCount] = useState<number>(50);
  const [includePrevious, setIncludePrevious] = useState<boolean>(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState<DataPalCreditStatus>(EMPTY_CREDIT_STATUS);
  const [creditsLoaded, setCreditsLoaded] = useState(false);

  // Stored API settings
  const [apiSettings, setApiSettings] = useState<DataPalApiSettings>({
    apiKey: "",
    apiEndpoint: "https://data-pal.vercel.app/api",
    googlePlacesApiKey: "",
    isLiveConnected: false,
  });

  // Load stored campaigns, settings, and credit balance on mount
  useEffect(() => {
    // Remove any generated (not real) records saved by older versions
    const removedFake = purgeFakeRecords();
    if (removedFake > 0) {
      setSuccessToast(`Removed ${removedFake} saved records that were not from real sources.`);
      setTimeout(() => setSuccessToast(null), 8000);
    }
    const loadedCampaigns = getStoredCampaigns();
    setCampaigns(loadedCampaigns);
    if (loadedCampaigns.length > 0) {
      setActiveCampaign(loadedCampaigns[0]);
    }
    const settings = getStoredApiSettings();
    setApiSettings(settings);

    // The balance lives on the server
    fetchDataPalCredits().then(status => {
      if (status) {
        setCreditStatus(status);
        setCreditsLoaded(true);
      }
    });
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
    if (creditsLoaded && creditStatus.remainingQuota <= 0) {
      setIsCreditsModalOpen(true);
      return;
    }

    const effectiveRequestedCount = creditsLoaded ? Math.min(requestedCount, creditStatus.remainingQuota) : requestedCount;
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
      includePrevious,
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
      // Businesses this account already has are left out on the server before anything is charged
      const seen = includePrevious ? [] : Array.from(getSeenLeadSignatures(accountKey));
      const res = await fetch("/api/datapal/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          apiKey: apiSettings.apiKey,
          apiEndpoint: apiSettings.apiEndpoint,
          excludeSignatures: seen,
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
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.campaign) {
        setIsExtracting(false);
        if (res.status === 402) setIsCreditsModalOpen(true);
        setSuccessToast(data?.error || "Something went wrong. You were not charged. Please try again.");
        setTimeout(() => setSuccessToast(null), 6000);
        return;
      }

      setExtractProgress(100);
      setExtractStatusText("Done");

      const newCampaign: DataPalSearchCampaign = applyDuplicatePolicy(data.campaign, includePrevious, accountKey);
      if (data.credits) {
        setCreditStatus(data.credits);
        setCreditsLoaded(true);
      }

      const updated = saveCampaign(newCampaign);
      setCampaigns(updated);
      setActiveCampaign(newCampaign);

      setTimeout(() => {
        setIsExtracting(false);
        setActiveTab("leads");
        setSuccessToast(
          newCampaign.results.length === 0
            ? data.message || "No matching businesses were found. You were not charged."
            : `Got ${newCampaign.results.length} ${includePrevious ? "records" : "new records"}${
                data.campaign.duplicatesRemoved ? ` (${data.campaign.duplicatesRemoved} you already had were left out)` : ""
              }.`
        );
        setTimeout(() => setSuccessToast(null), 5000);
      }, 500);
    } catch {
      clearInterval(interval);
      setIsExtracting(false);
      setSuccessToast("Could not reach the server. You were not charged. Please try again.");
      setTimeout(() => setSuccessToast(null), 6000);
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
                includePrevious={includePrevious}
                onIncludePreviousChange={setIncludePrevious}
                remainingQuota={creditStatus.remainingQuota}
                creditsLoaded={creditsLoaded}
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
        <ResultsView
          campaign={activeCampaign}
          creditsLeft={creditStatus.remainingQuota}
          onOpenCredits={() => setIsCreditsModalOpen(true)}
          onGoSearch={() => setActiveTab("search")}
        />
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
        onUpdated={() => fetchDataPalCredits().then(st => st && setCreditStatus(st))}
      />
    </div>
  );
}
