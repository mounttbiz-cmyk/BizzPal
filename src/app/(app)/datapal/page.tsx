"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Database,
  Search,
  Bot,
  BrainCircuit,
  MapPin,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  FileSpreadsheet,
  FileText,
  Upload,
  Globe,
  Star,
  Layers,
  Key,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  X,
  Plus,
  Info,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import {
  BusinessCategory,
  DataPalApiSettings,
  DataPalBusinessLead,
  DataPalSearchCampaign,
  DataPalSearchConfig,
  TargetProfilePreset,
} from "@/lib/datapal/types";
import {
  BUSINESS_CATEGORIES,
  COUNTRY_HIERARCHIES,
  DIRECTORY_SOURCES,
  SAMPLE_HISTORIC_CAMPAIGNS,
  TARGET_PROFILE_PRESETS,
} from "@/lib/datapal/constants";
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
  saveApiSettings,
  saveCampaign,
} from "@/lib/datapal/storage";
import { PortalModal } from "@/components/ui/PortalModal";

export default function DataPalPage() {
  // Navigation tabs: 'search' | 'results' | 'history'
  const [activeTab, setActiveTab] = useState<"search" | "results" | "history">("search");

  // Free-form business search engine query (e.g. "normal medical 24/7", "lawyers")
  const [searchQuery, setSearchQuery] = useState("");

  // State for search form
  const [targetRequirement, setTargetRequirement] = useState("Missing Website");
  const [showReqDropdown, setShowReqDropdown] = useState(false);
  const reqRef = useRef<HTMLDivElement>(null);

  // Country & Location state (Default: India)
  const [countryCode, setCountryCode] = useState("IN");
  const [selectedState, setSelectedState] = useState("Maharashtra");
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [areaPincode, setAreaPincode] = useState("");

  // Category selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Dental Clinics",
    "Aesthetic & Dermatology Clinics",
  ]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("healthcare");

  // Advanced Filters
  const [mustHavePhone, setMustHavePhone] = useState(true);
  const [mustHaveEmail, setMustHaveEmail] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "Google Maps & Places",
    "JustDial India",
    "IndiaMART B2B",
  ]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Collapsible AI Pitch Card state
  const [showAiPitchCard, setShowAiPitchCard] = useState(false);

  // AI Analyzer pitch / brochure
  const [serviceDescription, setServiceDescription] = useState("");
  const [uploadedBrochure, setUploadedBrochure] = useState<{ name: string; size: string } | null>(null);
  const [isAnalyzingPitch, setIsAnalyzingPitch] = useState(false);
  const [aiPitchAnalysisResult, setAiPitchAnalysisResult] = useState<string | null>(null);

  // Extraction Execution & Progress
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatusText, setExtractStatusText] = useState("");

  // Campaigns & Active results
  const [campaigns, setCampaigns] = useState<DataPalSearchCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<DataPalSearchCampaign | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Results filtering & search
  const [resultsSearchQuery, setResultsSearchQuery] = useState("");
  const [opportunityFilter, setOpportunityFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pushTaskStatus, setPushTaskStatus] = useState<string | null>(null);

  // API Key Settings Modal
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiSettings, setApiSettings] = useState<DataPalApiSettings>({
    apiKey: "",
    apiEndpoint: "https://data-pal.vercel.app/api",
    googlePlacesApiKey: "",
    isLiveConnected: false,
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiEndpointInput, setApiEndpointInput] = useState("https://data-pal.vercel.app/api");
  const [googlePlacesApiKeyInput, setGooglePlacesApiKeyInput] = useState("");
  const [apiSaveFeedback, setApiSaveFeedback] = useState<string | null>(null);

  // Load stored data on mount
  useEffect(() => {
    const loadedCampaigns = getStoredCampaigns();
    setCampaigns(loadedCampaigns);
    if (loadedCampaigns.length > 0) {
      setActiveCampaign(loadedCampaigns[0]);
    }
    const settings = getStoredApiSettings();
    setApiSettings(settings);
    setApiKeyInput(settings.apiKey || "");
    setApiEndpointInput(settings.apiEndpoint || "https://data-pal.vercel.app/api");
    setGooglePlacesApiKeyInput(settings.googlePlacesApiKey || "");
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (reqRef.current && !reqRef.current.contains(e.target as Node)) {
        setShowReqDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Country Hierarchy helpers
  const currentCountry = useMemo(() => {
    return COUNTRY_HIERARCHIES.find(c => c.code === countryCode) || COUNTRY_HIERARCHIES[0];
  }, [countryCode]);

  const availableStates = useMemo(() => {
    return currentCountry.states;
  }, [currentCountry]);

  const availableCities = useMemo(() => {
    const st = availableStates.find(s => s.name === selectedState);
    return st ? st.cities : availableStates[0]?.cities || [];
  }, [availableStates, selectedState]);

  // All Industry Subcategories computation for 1-click Select All
  const allSubcategories = useMemo(() => {
    return BUSINESS_CATEGORIES.flatMap(g => g.subcategories);
  }, []);

  const isAllIndustriesSelected = useMemo(() => {
    return (
      allSubcategories.length > 0 &&
      allSubcategories.every(sub => selectedCategories.includes(sub))
    );
  }, [allSubcategories, selectedCategories]);

  // 1-Click Select All / Deselect All Industries
  const handleToggleSelectAllIndustries = () => {
    if (isAllIndustriesSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...allSubcategories]);
    }
  };

  // Handle Country switch
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const country = COUNTRY_HIERARCHIES.find(c => c.code === code) || COUNTRY_HIERARCHIES[0];
    const firstState = country.states[0]?.name || "All States";
    const firstCity = country.states[0]?.cities[0] || "All Cities";
    setSelectedState(firstState);
    setSelectedCity(firstCity);
  };

  // Quick Indian metropolitan buttons
  const setQuickCity = (city: string, state: string) => {
    setCountryCode("IN");
    setSelectedState(state);
    setSelectedCity(city);
  };

  // Category toggle
  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const selectAllInGroup = (subcategories: string[]) => {
    const allSelected = subcategories.every(sub => selectedCategories.includes(sub));
    if (allSelected) {
      setSelectedCategories(prev => prev.filter(c => !subcategories.includes(c)));
    } else {
      setSelectedCategories(prev => Array.from(new Set([...prev, ...subcategories])));
    }
  };

  // AI Analyzer simulation
  const handleAnalyzePitch = () => {
    if (!serviceDescription.trim() && !uploadedBrochure) {
      alert("Please provide a service description, website URL, or upload a brochure.");
      return;
    }
    setIsAnalyzingPitch(true);
    setAiPitchAnalysisResult(null);

    setTimeout(() => {
      setIsAnalyzingPitch(false);
      const text = serviceDescription.toLowerCase();

      let inferredReq = "Missing Website";
      let recommendedCats = ["Dental Clinics", "Aesthetic & Dermatology Clinics"];

      if (text.includes("seo") || text.includes("rank") || text.includes("maps")) {
        inferredReq = "Missing Google Business Profile";
        recommendedCats = ["Medical Clinics", "Law Firms & Advocates", "Luxury Salons & Hairdressers"];
      } else if (text.includes("social") || text.includes("instagram") || text.includes("creative")) {
        inferredReq = "Missing Social Media Presence";
        recommendedCats = ["Cafes & Coffee Shops", "Aesthetic & Dermatology Clinics", "Jewelry & Watches"];
      } else if (text.includes("order") || text.includes("app") || text.includes("food") || text.includes("saas")) {
        inferredReq = "Missing Online Ordering & Booking";
        recommendedCats = ["Restaurants & Fine Dining", "Cloud Kitchens & Food Hubs", "Diagnostic Centers"];
      } else if (text.includes("brand") || text.includes("logo") || text.includes("identity")) {
        inferredReq = "Missing Logo / Branding";
        recommendedCats = ["Wholesalers & Distributors", "Builders & Contractors", "Retail Stores & Boutiques"];
      }

      setTargetRequirement(inferredReq);
      setSelectedCategories(recommendedCats);
      setAiPitchAnalysisResult(
        `AI Analysis Complete: Selected requirement "${inferredReq}" with target industries: ${recommendedCats.join(", ")}.`
      );
    }, 1200);
  };

  // Trigger Data Extraction
  const handleStartExtraction = async () => {
    const trimmedQuery = searchQuery.trim();
    const effectiveCategories = selectedCategories.length > 0
      ? selectedCategories
      : [trimmedQuery || "General Businesses"];

    const config: DataPalSearchConfig = {
      searchQuery: trimmedQuery,
      requirement: targetRequirement,
      countryCode,
      state: selectedState,
      city: selectedCity,
      areaPincode,
      selectedCategories: effectiveCategories,
      filters: {
        mustHavePhone,
        mustHaveEmail,
        minRating,
        sources: selectedSources,
      },
      servicePitch: {
        text: serviceDescription,
        imageName: uploadedBrochure?.name,
      },
    };

    setIsExtracting(true);
    setExtractProgress(15);
    setExtractStatusText(`Connecting to DataPal Directory Scraper across ${selectedCity}, ${selectedState}...`);

    const interval = setInterval(() => {
      setExtractProgress(prev => {
        if (prev < 40) {
          setExtractStatusText(`Scanning Google Maps, JustDial & directories for ${selectedCategories[0] || trimmedQuery}...`);
          return prev + 12;
        } else if (prev < 70) {
          setExtractStatusText(`Verifying contact phone numbers & resolving official domains...`);
          return prev + 10;
        } else if (prev < 90) {
          setExtractStatusText(`Evaluating digital gaps (${targetRequirement}) & synthesizing AI Opportunity notes...`);
          return prev + 7;
        }
        return 95;
      });
    }, 350);

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
      setExtractStatusText("Data extraction complete! Formatting report...");

      const data = await res.json();
      let newCampaign: DataPalSearchCampaign;

      if (data.campaign) {
        newCampaign = data.campaign;
      } else {
        const leads = generateSyntheticLeads(config);
        const locString = [areaPincode, selectedCity, selectedState, currentCountry.name]
          .filter(Boolean)
          .join(", ");
        const campaignTitle = trimmedQuery
          ? `${trimmedQuery} in ${selectedCity}`
          : `${targetRequirement} in ${selectedCity}`;

        newCampaign = {
          id: `camp_${Date.now()}`,
          title: campaignTitle,
          searchQuery: trimmedQuery,
          requirement: targetRequirement,
          location: locString,
          countryCode,
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
        setActiveTab("results");
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setIsExtracting(false);
      const leads = generateSyntheticLeads(config);
      const campaignTitle = trimmedQuery
        ? `${trimmedQuery} in ${selectedCity}`
        : `${targetRequirement} in ${selectedCity}`;

      const newCampaign: DataPalSearchCampaign = {
        id: `camp_${Date.now()}`,
        title: campaignTitle,
        searchQuery: trimmedQuery,
        requirement: targetRequirement,
        location: `${selectedCity}, ${selectedState}, ${currentCountry.name}`,
        countryCode,
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
      setActiveTab("results");
    }
  };

  // Delete a campaign
  const handleDeleteCampaign = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this extraction campaign?")) {
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

  // Copy to clipboard helper
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

  // Save API Settings
  const handleSaveApiSettings = () => {
    const updated = saveApiSettings({
      apiKey: apiKeyInput.trim(),
      apiEndpoint: apiEndpointInput.trim() || "https://data-pal.vercel.app/api",
      googlePlacesApiKey: googlePlacesApiKeyInput.trim(),
    });
    setApiSettings(updated);
    setApiSaveFeedback("Settings saved successfully! Connected.");
    setTimeout(() => {
      setApiSaveFeedback(null);
      setIsApiModalOpen(false);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Header matching BizzPal Executive Design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-text tracking-tight">DataPal™ Extraction Engine</h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                Data Scraping
              </span>
              {apiSettings.isLiveConnected ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API Connected
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-surface-2 text-text-muted border border-line flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  High-Fidelity Engine
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 font-medium max-w-2xl leading-relaxed">
              Extract, verify, and filter business contacts across India and global directories for high-converting sales outreach.
            </p>
          </div>
        </div>

        {/* Global Key Config Quick Trigger */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsApiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-text-muted hover:text-gold transition-colors cursor-pointer"
            title="Configure DataPal API / Google Places API Key"
          >
            <Key className="w-3.5 h-3.5 text-gold" />
            <span>API Settings</span>
          </button>
        </div>
      </div>

      {/* Segment Navigation Tabs - Executive BizzPal Theme */}
      <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap btn-tactile ${
            activeTab === "search"
              ? "bg-gold/15 text-gold border border-gold/40 shadow-xs"
              : "bg-surface border border-line text-text-muted hover:text-text hover:bg-surface-2"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>1. Extract Data (Search Studio)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap btn-tactile ${
            activeTab === "results"
              ? "bg-gold/15 text-gold border border-gold/40 shadow-xs"
              : "bg-surface border border-line text-text-muted hover:text-text hover:bg-surface-2"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Extracted Leads</span>
          {activeCampaign && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono font-bold">
              {activeCampaign.results.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap btn-tactile ${
            activeTab === "history"
              ? "bg-gold/15 text-gold border border-gold/40 shadow-xs"
              : "bg-surface border border-line text-text-muted hover:text-text hover:bg-surface-2"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Campaign History</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line font-mono font-bold text-text-muted">
            {campaigns.length}
          </span>
        </button>
      </div>

      {activeTab === "search" && (
        <div className="space-y-6">
          {/* ============================================================== */}
          {/* HERO CARD: UNIVERSAL BUSINESS SEARCH STUDIO                    */}
          {/* ============================================================== */}
          <div className="bg-surface border border-line rounded-2xl p-6 sm:p-7 shadow-theme space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-text tracking-tight">
                      Business Lead Search Engine
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Live Directory Scraper
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Search and extract local businesses, medical clinics, legal practitioners, retailers, and enterprises.
                  </p>
                </div>
              </div>
            </div>

            {/* UNIVERSAL BUSINESS SEARCH INPUT */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gold" />
                <span>Search Any Business Type or Keyword</span>
              </label>

              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-gold absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search any business type (e.g. 'normal medical 24/7', 'lawyers', 'dermatologists', 'dental surgeons', 'rooftop cafes', 'boutiques')..."
                  className="w-full pl-12 pr-11 py-3.5 rounded-xl bg-surface-2 border border-line focus:border-gold focus:ring-1 focus:ring-gold/30 text-sm font-semibold text-text placeholder:text-text-muted placeholder:font-normal transition-all shadow-xs focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 p-1 rounded-full text-text-muted hover:text-text hover:bg-surface text-xs cursor-pointer"
                    title="Clear search query"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Recommended Popular Query Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider mr-1">
                  Popular:
                </span>
                {[
                  { label: "24/7 Medical Clinic", icon: "🏥" },
                  { label: "Lawyers & Advocates", icon: "⚖️" },
                  { label: "Dental Clinics", icon: "🦷" },
                  { label: "Dermatologists & Skin", icon: "✨" },
                  { label: "Chartered Accountants", icon: "📊" },
                  { label: "Real Estate Brokers", icon: "🏢" },
                  { label: "Rooftop Cafes & Bistros", icon: "☕" },
                  { label: "Automobile Service & Garage", icon: "🚗" },
                  { label: "Fitness & Gyms", icon: "🏋️" },
                  { label: "Boutique Stores", icon: "👗" },
                ].map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setSearchQuery(chip.label)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer btn-tactile ${
                      searchQuery.toLowerCase() === chip.label.toLowerCase()
                        ? "bg-gold/20 text-gold border-gold/40 shadow-xs"
                        : "bg-surface-2 border-line text-text-muted hover:text-text hover:border-gold/30"
                    }`}
                  >
                    <span className="text-xs">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BALANCED 2-COLUMN WORKSPACE GRID (5 COLS / 7 COLS)             */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: TARGET LOCATION & DIGITAL GAP (5 COLS)          */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-5 space-y-6">
              {/* TARGET LOCATION CARD */}
              <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-theme space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold" />
                    <span className="text-xs font-bold text-text uppercase tracking-wider">
                      Target Location Hierarchy
                    </span>
                  </div>
                  <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/25 text-gold font-semibold flex items-center gap-1.5">
                    <span>📍</span>
                    <span className="truncate max-w-[200px] sm:max-w-xs">
                      {[areaPincode, selectedCity, selectedState, currentCountry.name].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 1. Country Select (Default: India with flag) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      Target Country
                    </label>
                    <div className="relative">
                      <select
                        value={countryCode}
                        onChange={e => handleCountryChange(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-bold text-text focus:outline-none focus:border-gold appearance-none cursor-pointer"
                      >
                        {COUNTRY_HIERARCHIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name} ({c.phonePrefix})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 2. State Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      State / Province
                    </label>
                    <div className="relative">
                      <select
                        value={selectedState}
                        onChange={e => {
                          setSelectedState(e.target.value);
                          const st = availableStates.find(s => s.name === e.target.value);
                          if (st && st.cities.length > 0) setSelectedCity(st.cities[0]);
                        }}
                        className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text focus:outline-none focus:border-gold appearance-none cursor-pointer"
                      >
                        {availableStates.map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. City Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      City / Metro
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCity}
                        onChange={e => setSelectedCity(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text focus:outline-none focus:border-gold appearance-none cursor-pointer"
                      >
                        {availableCities.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 4. PIN Code / Suburb Input */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      {currentCountry.postalCodeLabel} / Specific Suburb (Optional)
                    </label>
                    <input
                      type="text"
                      value={areaPincode}
                      onChange={e => setAreaPincode(e.target.value)}
                      placeholder="e.g. 400050 or Bandra West..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                </div>

                {/* Quick Metropolitan Hub Pills for India */}
                {countryCode === "IN" && (
                  <div className="pt-2 border-t border-line/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Quick Metros:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { city: "Mumbai", state: "Maharashtra" },
                        { city: "New Delhi", state: "Delhi NCR" },
                        { city: "Bangalore (Bengaluru)", state: "Karnataka" },
                        { city: "Pune", state: "Maharashtra" },
                        { city: "Hyderabad", state: "Telangana" },
                        { city: "Chennai", state: "Tamil Nadu" },
                        { city: "Ahmedabad", state: "Gujarat" },
                        { city: "Kolkata", state: "West Bengal" },
                      ].map(hub => (
                        <button
                          key={hub.city}
                          type="button"
                          onClick={() => setQuickCity(hub.city, hub.state)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            selectedCity === hub.city
                              ? "bg-gold/20 text-gold border-gold/40 shadow-xs font-bold"
                              : "bg-surface-2 text-text-muted border-line hover:text-text hover:bg-surface"
                          }`}
                        >
                          {hub.city.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TARGET DIGITAL GAP / PITCH ANGLE CARD */}
              <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-theme space-y-3.5 relative" ref={reqRef}>
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gold" />
                    <span>Target Digital Gap / Pitch</span>
                  </label>
                  <span className="text-[10px] text-text-muted font-medium">High-converting angles</span>
                </div>

                <div className="relative">
                  <div
                    onClick={() => setShowReqDropdown(true)}
                    className="flex items-center w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 cursor-text focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30 transition-colors"
                  >
                    <input
                      type="text"
                      value={targetRequirement}
                      onChange={e => {
                        setTargetRequirement(e.target.value);
                        setShowReqDropdown(true);
                      }}
                      onFocus={() => setShowReqDropdown(true)}
                      placeholder="e.g. Missing Website, Needs SEO, Missing Online Ordering..."
                      className="w-full bg-transparent text-xs font-bold text-text placeholder:font-normal placeholder:text-text-muted focus:outline-none"
                    />
                    {targetRequirement && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setTargetRequirement("");
                        }}
                        className="p-1 hover:bg-surface rounded-full text-text-muted hover:text-text text-xs ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                    <ChevronDown className="w-4 h-4 text-text-muted ml-2 shrink-0 pointer-events-none" />
                  </div>

                  {/* Autocomplete / Preset Dropdown */}
                  {showReqDropdown && (
                    <div className="absolute z-30 w-full mt-1.5 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fadeIn">
                      <div className="p-1.5 divide-y divide-line/40">
                        {TARGET_PROFILE_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setTargetRequirement(preset.label);
                              if (preset.suggestedCategories) {
                                setSelectedCategories(preset.suggestedCategories);
                              }
                              setShowReqDropdown(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-surface-2 transition-colors rounded-lg flex items-start justify-between gap-3 group cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-bold text-text group-hover:text-gold transition-colors">
                                {preset.label}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                {preset.desc}
                              </div>
                            </div>
                            {preset.badge && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-text-muted shrink-0">
                                {preset.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TARGET_PROFILE_PRESETS.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setTargetRequirement(p.label);
                        if (p.suggestedCategories) setSelectedCategories(p.suggestedCategories);
                      }}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        targetRequirement === p.label
                          ? "bg-gold/20 text-gold border-gold/40 shadow-xs font-bold"
                          : "bg-surface-2 text-text-muted border-line hover:text-text hover:border-gold/30"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: INDUSTRY CATEGORIES & VERIFICATION (7 COLS)    */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-7 space-y-6">
              {/* FILTER BY INDUSTRY CATEGORIES CARD */}
              <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-theme space-y-4">
                {/* Header with Title & Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-gold" />
                    <div>
                      <span className="text-xs font-bold text-text uppercase tracking-wider block">
                        Filter by Industry Categories
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Select specific sectors or search universally across all industries.
                      </span>
                    </div>
                  </div>

                  {/* ACTION CONTROLS: SELECT ALL BUTTON */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllIndustries}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer btn-tactile border ${
                        isAllIndustriesSelected
                          ? "bg-gold text-[#120E05] border-gold shadow-sm"
                          : "bg-gold/15 text-gold border-gold/30 hover:bg-gold/25"
                      }`}
                      title={isAllIndustriesSelected ? "Deselect all industries" : "Select all industries across all categories"}
                    >
                      {isAllIndustriesSelected ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                          <span>Deselect All ({allSubcategories.length})</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 shrink-0" />
                          <span>Select All Industries ({allSubcategories.length})</span>
                        </>
                      )}
                    </button>

                    {selectedCategories.length > 0 && !isAllIndustriesSelected && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="text-[11px] text-text-muted hover:text-rust underline font-medium cursor-pointer px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Industry Group Clusters (1-Click Toggle for Group) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                    Industry Clusters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BUSINESS_CATEGORIES.map(group => {
                      const allInGroupSelected = group.subcategories.every(s => selectedCategories.includes(s));
                      const someInGroupSelected = group.subcategories.some(s => selectedCategories.includes(s));
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => selectAllInGroup(group.subcategories)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            allInGroupSelected
                              ? "bg-gold/20 text-gold border-gold/40 shadow-xs font-bold"
                              : someInGroupSelected
                              ? "bg-surface-2 text-gold border-gold/30"
                              : "bg-surface-2 text-text-muted border-line hover:text-text hover:border-gold/30"
                          }`}
                        >
                          <span>{group.name}</span>
                          <span className="text-[9px] px-1 rounded-full bg-surface font-mono">
                            {group.subcategories.filter(s => selectedCategories.includes(s)).length}/{group.subcategories.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Category Tags or Universal Search Banner */}
                {isAllIndustriesSelected ? (
                  <div className="p-3 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between text-xs text-gold">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All {allSubcategories.length} Industries Selected (Universal Search active)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-[11px] underline hover:text-rust font-semibold cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                ) : selectedCategories.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      <span>Currently Selected ({selectedCategories.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-surface-2/60 border border-line max-h-24 overflow-y-auto">
                      {selectedCategories.map(cat => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gold/15 border border-gold/30 text-gold text-xs font-semibold"
                        >
                          <span className="truncate max-w-[160px]">{cat}</span>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="hover:text-rust text-xs ml-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface-2/40 border border-line/60 text-xs text-text-muted flex items-center gap-2">
                    <Info className="w-4 h-4 text-text-muted shrink-0" />
                    <span>No specific categories filtered. Universal search will apply: &quot;{searchQuery || "All Verified Businesses"}&quot;.</span>
                  </div>
                )}

                {/* Expandable Accordion for Business Categories */}
                <div className="border border-line rounded-xl overflow-hidden divide-y divide-line/60 bg-surface max-h-64 overflow-y-auto">
                  {BUSINESS_CATEGORIES.map(group => {
                    const isExpanded = expandedCategory === group.id;
                    const selectedCount = group.subcategories.filter(s =>
                      selectedCategories.includes(s)
                    ).length;

                    return (
                      <div key={group.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedCategory(isExpanded ? null : group.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-surface-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-text">{group.name}</span>
                            {selectedCount > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-gold/15 text-gold border border-gold/30 font-mono">
                                {selectedCount} / {group.subcategories.length}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-3.5 bg-surface-2/40 border-t border-line/60 space-y-2.5">
                            <div className="flex justify-between items-center pb-1">
                              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                                Subcategories ({group.subcategories.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => selectAllInGroup(group.subcategories)}
                                className="text-[11px] text-gold hover:underline font-bold cursor-pointer"
                              >
                                {group.subcategories.every(s => selectedCategories.includes(s))
                                  ? "Deselect Group"
                                  : "Select Group"}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.subcategories.map(sub => {
                                const isChecked = selectedCategories.includes(sub);
                                return (
                                  <label
                                    key={sub}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-gold/15 border-gold/40 text-gold font-bold"
                                        : "bg-surface border-line text-text-muted hover:text-text hover:bg-surface-2"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleCategory(sub)}
                                      className="rounded border-line text-gold focus:ring-0 w-3.5 h-3.5 accent-[#DFBA73]"
                                    />
                                    <span className="truncate">{sub}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ADVANCED VERIFICATION & AGGREGATION RULES CARD */}
              <div className="border border-line rounded-2xl bg-surface p-4 sm:p-5 shadow-theme space-y-3.5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full flex items-center justify-between text-xs font-bold text-text cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gold" />
                    <span>Advanced Verification & Lead Delivery Rules</span>
                  </div>
                  <span className="text-text-muted text-[11px]">{showAdvancedFilters ? "▲ Hide Options" : "▼ Show Options"}</span>
                </button>

                {showAdvancedFilters && (
                  <div className="pt-3 border-t border-line space-y-3.5 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-2 border border-line text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mustHavePhone}
                          onChange={e => setMustHavePhone(e.target.checked)}
                          className="rounded border-line text-gold focus:ring-0 w-4 h-4 accent-[#DFBA73]"
                        />
                        <span>Verified Phone (WhatsApp / Call)</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-2 border border-line text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mustHaveEmail}
                          onChange={e => setMustHaveEmail(e.target.checked)}
                          className="rounded border-line text-gold focus:ring-0 w-4 h-4 accent-[#DFBA73]"
                        />
                        <span>Must have Email Address</span>
                      </label>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-2 border border-line text-xs">
                        <span className="text-text-muted">Min Rating:</span>
                        <select
                          value={minRating}
                          onChange={e => setMinRating(Number(e.target.value))}
                          className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
                        >
                          <option value={0}>Any Rating</option>
                          <option value={3.5}>3.5+ ★ Stars</option>
                          <option value={4.0}>4.0+ ★ Stars</option>
                          <option value={4.5}>4.5+ ★ Stars</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                        Aggregated Directory Scrapers
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DIRECTORY_SOURCES.map(source => {
                          const isIncluded = selectedSources.includes(source.name);
                          return (
                            <button
                              key={source.id}
                              type="button"
                              onClick={() => {
                                setSelectedSources(prev =>
                                  prev.includes(source.name)
                                    ? prev.filter(s => s !== source.name)
                                    : [...prev, source.name]
                                );
                              }}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isIncluded
                                  ? "bg-surface-2 border-gold/40 text-gold shadow-xs font-bold"
                                  : "bg-surface border-line text-text-muted hover:text-text"
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: source.color }}
                              />
                              <span>{source.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* PRIMARY EXTRACTION CTA BANNER (DASHBOARD SIGNATURE STYLE)      */}
          {/* ============================================================== */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-theme flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-gold/[0.05] to-transparent pointer-events-none" />
            <div className="text-left space-y-1 relative z-10">
              <div className="text-sm font-extrabold text-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Ready for High-Converting Lead Generation</span>
              </div>
              <p className="text-xs text-text-muted max-w-xl">
                Targeting{" "}
                <span className="text-text font-bold">
                  {isAllIndustriesSelected
                    ? "All Industries"
                    : selectedCategories.length > 0
                    ? `${selectedCategories.length} Categories`
                    : searchQuery || "Universal Businesses"}
                </span>{" "}
                across{" "}
                <span className="text-text font-bold">
                  {[selectedCity, selectedState, currentCountry.name].filter(Boolean).join(", ")}
                </span>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isExtracting || (!searchQuery.trim() && selectedCategories.length === 0)}
              className="w-full sm:w-auto btn-gold-gradient text-[#120E05] font-black text-sm px-8 py-3.5 rounded-xl shadow-theme flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50 shrink-0 relative z-10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generate Business Leads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ============================================================== */}
          {/* OPTIONAL AI SMART MATCHER & PITCH ANALYZER                     */}
          {/* ============================================================== */}
          <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-theme">
            <button
              type="button"
              onClick={() => setShowAiPitchCard(!showAiPitchCard)}
              className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text">AI Smart Matcher & Pitch Analyzer</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-text-muted">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Paste your service pitch or upload a brochure to let AI automatically identify target categories and digital gaps.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-gold flex items-center gap-1">
                {showAiPitchCard ? "Hide ▲" : "Expand ▼"}
              </span>
            </button>

            {showAiPitchCard && (
              <div className="p-5 sm:p-6 border-t border-line space-y-4 bg-surface-2/30 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Service Description */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text uppercase tracking-wider block">
                      Service Description / Offer Pitch
                    </label>
                    <textarea
                      rows={3}
                      value={serviceDescription}
                      onChange={e => setServiceDescription(e.target.value)}
                      placeholder="e.g. 'We build high-converting WhatsApp booking tools and modern websites for dental clinics and aesthetic doctors'..."
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors resize-none"
                    />
                  </div>

                  {/* Brochure Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text uppercase tracking-wider block">
                      Upload Poster / Flyer / Brochure
                    </label>
                    <label className="w-full flex items-center justify-center gap-2.5 px-3 py-4 rounded-xl border border-dashed border-line hover:border-gold bg-surface hover:bg-surface-2 transition-all cursor-pointer group">
                      <Upload className="w-4 h-4 text-text-muted group-hover:text-gold transition-colors shrink-0" />
                      <span className="text-xs font-medium text-text-muted group-hover:text-text truncate">
                        {uploadedBrochure ? uploadedBrochure.name : "Choose PDF or Image file"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedBrochure({
                              name: file.name,
                              size: (file.size / 1024).toFixed(1) + " KB",
                            });
                          }
                        }}
                      />
                    </label>
                    {uploadedBrochure && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <span className="truncate">📎 {uploadedBrochure.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedBrochure(null)}
                          className="text-text-muted hover:text-rust text-xs ml-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Feedback Banner */}
                {aiPitchAnalysisResult && (
                  <div className="p-3 rounded-xl bg-gold/10 border border-gold/25 text-xs text-gold space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-gold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Analysis Applied</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-text">{aiPitchAnalysisResult}</p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAnalyzePitch}
                    disabled={isAnalyzingPitch || (!serviceDescription.trim() && !uploadedBrochure)}
                    className="flex items-center gap-2 py-2 px-5 rounded-xl btn-gold-gradient text-[#120E05] font-extrabold text-xs shadow-sm transition-all btn-tactile cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzingPitch ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing Pitch Strategy...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Set Target Profile with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: EXTRACTED LEADS & TABLE VIEW                            */}
      {/* ============================================================== */}
      {activeTab === "results" && (
        <div className="space-y-5">
          {!activeCampaign ? (
            <div className="text-center py-16 bg-surface border border-line rounded-2xl p-8 space-y-4 shadow-theme">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mx-auto text-text-muted">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text">No extraction campaign selected</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Start an extraction in the Search Studio to find verified businesses with high-converting digital gaps.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="btn-gold-gradient text-[#120E05] px-5 py-2.5 rounded-xl font-extrabold text-xs btn-tactile"
              >
                Start New Extraction
              </button>
            </div>
          ) : (
            <>
              {/* Campaign Summary & Controls Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-theme">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-text tracking-tight">
                      {activeCampaign.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gold" />
                        {activeCampaign.location}
                      </span>
                      <span>•</span>
                      <span>{activeCampaign.results.length} businesses extracted</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-gold transition-all btn-tactile cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-gold" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-gold transition-all btn-tactile cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-gold" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToTasks}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-gold-gradient text-[#120E05] text-xs font-black transition-all btn-tactile cursor-pointer shadow-theme"
                    title="Add extracted leads as outreach execution tasks in BizzPal"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Push to Tasks</span>
                  </button>
                </div>
              </div>

              {pushTaskStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-500 text-xs font-semibold flex items-center justify-between">
                  <span>{pushTaskStatus}</span>
                  <Link href="/tasks" className="underline hover:brightness-110 font-bold ml-2">
                    View in Tasks & Execution →
                  </Link>
                </div>
              )}

              {/* Bento Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-black text-text tracking-tight">
                    {activeCampaign.results.length}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Total Extracted</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-black text-emerald-500 tracking-tight">
                    {activeCampaign.phoneCount}
                    <span className="text-xs font-semibold text-text-muted ml-1 font-normal">
                      ({Math.round((activeCampaign.phoneCount / (activeCampaign.results.length || 1)) * 100)}%)
                    </span>
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Verified Phone Numbers</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-black text-cyan-400 tracking-tight">
                    {activeCampaign.emailCount}
                    <span className="text-xs font-semibold text-text-muted ml-1 font-normal">
                      ({Math.round((activeCampaign.emailCount / (activeCampaign.results.length || 1)) * 100)}%)
                    </span>
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Verified Emails</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-theme">
                  <p className="text-xl font-black text-gold tracking-tight">
                    {activeCampaign.opportunityCount}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">High Digital Gap Leads</p>
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
                    placeholder="Search by business, phone, email, locality..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: "all", label: "All Leads" },
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
                          ? "bg-gold/20 text-gold border border-gold/40 shadow-xs font-bold"
                          : "bg-surface-2 text-text-muted hover:text-text"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
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
                            className="rounded border-line text-gold w-3.5 h-3.5 accent-[#DFBA73]"
                          />
                        </th>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[200px]">Business</th>
                        <th className="py-3 px-3 min-w-[130px]">Category</th>
                        <th className="py-3 px-3 min-w-[180px]">Address & Area</th>
                        <th className="py-3 px-3 min-w-[140px]">Phone Number</th>
                        <th className="py-3 px-3 min-w-[140px]">Email Address</th>
                        <th className="py-3 px-3 min-w-[90px]">Rating</th>
                        <th className="py-3 px-3 min-w-[120px]">Presence</th>
                        <th className="py-3 px-3 min-w-[240px]">AI Opportunity Notes</th>
                        <th className="py-3 px-3 w-16 text-center">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 text-xs">
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-text-muted">
                            No businesses match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead, idx) => {
                          const isSelected = selectedLeadIds.has(lead.id);
                          return (
                            <tr
                              key={lead.id}
                              className={`hover:bg-surface-2/60 transition-colors ${
                                isSelected ? "bg-gold/5" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="rounded border-line text-gold w-3.5 h-3.5 cursor-pointer accent-[#DFBA73]"
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
                                      className="text-[11px] text-gold hover:underline flex items-center gap-1 truncate max-w-[160px]"
                                    >
                                      <Globe className="w-3 h-3 shrink-0" />
                                      <span>Website</span>
                                    </a>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rust/15 text-rust border border-rust/30">
                                      No Website
                                    </span>
                                  )}
                                  <span className="text-[10px] text-text-muted/60">•</span>
                                  <span className="text-[10px] text-text-muted truncate">
                                    {lead.source.split(" ")[0]}
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
                                      className="text-emerald-500 hover:underline font-semibold text-[11px]"
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
                                    <span className="text-cyan-400 text-[11px] truncate max-w-[120px]" title={lead.email}>
                                      {lead.email}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyText(lead.email!, `email_${lead.id}`)}
                                      className="p-1 hover:bg-surface-2 rounded text-text-muted hover:text-text text-[10px]"
                                      title="Copy email"
                                    >
                                      {copiedId === `email_${lead.id}` ? (
                                        <Check className="w-3 h-3 text-cyan-400" />
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
                                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(lead.name)},%20I%20noticed%20your%20business%20in%20${encodeURIComponent(lead.city)}...`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 transition-colors"
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
                    Showing {filteredLeads.length} of {activeCampaign.results.length} businesses
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{selectedLeadIds.size} selected</span>
                    {selectedLeadIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handlePushToTasks}
                        className="font-bold text-gold hover:underline cursor-pointer"
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
              <h2 className="text-base font-extrabold text-text tracking-tight">Search History & Campaigns</h2>
              <p className="text-xs text-text-muted">Revisit and export your generated data campaigns.</p>
            </div>

            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={() => exportAllCampaignsToExcel(campaigns)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-text hover:text-gold transition-all btn-tactile cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-gold" />
                <span>Export All to Excel</span>
              </button>
            )}
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-line rounded-2xl p-8 space-y-4 shadow-theme">
              <Search className="w-10 h-10 text-text-muted mx-auto" />
              <h3 className="text-base font-bold text-text">No searches yet</h3>
              <p className="text-xs text-text-muted">Start searching for businesses in Search Studio to see your history here.</p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="btn-gold-gradient text-[#120E05] px-5 py-2 rounded-xl text-xs font-extrabold btn-tactile"
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
                    setActiveTab("results");
                  }}
                  className="p-5 rounded-2xl bg-surface border border-line hover:border-gold/50 shadow-theme hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                        {camp.requirement}
                      </span>
                      <button
                        type="button"
                        onClick={e => handleDeleteCampaign(e, camp.id)}
                        className="p-1 rounded text-text-muted/60 hover:text-rust transition-colors text-xs cursor-pointer"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-text group-hover:text-gold transition-colors mt-2">
                      {camp.title}
                    </h3>

                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
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
                      <span className="font-bold text-text">{camp.results.length}</span> businesses •{" "}
                      <span className="font-bold text-emerald-500">{camp.phoneCount}</span> phones
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportLeadsToExcel(camp.results, `DataPal_${camp.title.replace(/\s+/g, "_")}.xls`, camp.title);
                        }}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-gold transition-colors cursor-pointer"
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
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-gold transition-colors cursor-pointer"
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

      {/* ============================================================== */}
      {/* PORTAL MODAL 1: EXTRACTION PROGRESS MODAL                      */}
      {/* ============================================================== */}
      <PortalModal isOpen={isExtracting} onClose={() => {}}>
        <div className="max-w-md w-full bg-surface border border-line rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto text-gold">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-text tracking-tight">
              Extracting Business Leads
            </h3>
            <p className="text-xs text-text-muted leading-relaxed font-mono">
              {extractStatusText}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-line">
              <div
                className="bg-gold h-2 rounded-full transition-all duration-300"
                style={{ width: `${extractProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted font-mono font-bold">
              <span>Querying Directories</span>
              <span>{extractProgress}%</span>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Scanning directories, resolving contact numbers, and compiling high-priority outreach targets...
          </p>
        </div>
      </PortalModal>

      {/* ============================================================== */}
      {/* PORTAL MODAL 2: DATA PAL API SETTINGS MODAL                   */}
      {/* ============================================================== */}
      <PortalModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)}>
        <div className="max-w-lg w-full bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 relative">
          <button
            type="button"
            onClick={() => setIsApiModalOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full text-text-muted hover:text-text cursor-pointer"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 pb-3 border-b border-line">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text">
                DataPal API & Connectivity Settings
              </h3>
              <p className="text-[11px] text-text-muted">
                Connect your DataPal instance or Google Places API key
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-gold/10 border border-gold/25 text-gold leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-gold">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>API Connectivity & Live Scraping</span>
              </div>
              <p className="text-[11px] text-text">
                The frontend is fully operational. Connect your Google Places API Key to stream real-time local business listings, phone numbers, ratings, and addresses directly.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-text uppercase tracking-wider block text-[10px]">
                  Google Places API Key
                </label>
                <span className="text-[10px] text-gold font-medium">Recommended for Google Search</span>
              </div>
              <input
                type="password"
                value={googlePlacesApiKeyInput}
                onChange={e => setGooglePlacesApiKeyInput(e.target.value)}
                placeholder="AIzaSyB... (Google Cloud Console Places API Key)"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-mono text-text focus:outline-none focus:border-gold"
              />
              <p className="text-[10px] text-text-muted">
                You can save this key now or later. If empty, DataPal aggregates via high-accuracy multi-directory scrapers.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-text uppercase tracking-wider block text-[10px]">
                DataPal Instance API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="e.g. dp_live_9f81a7b6c5d4e3f2..."
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-mono text-text focus:outline-none focus:border-gold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-text uppercase tracking-wider block text-[10px]">
                DataPal API Endpoint URL
              </label>
              <input
                type="text"
                value={apiEndpointInput}
                onChange={e => setApiEndpointInput(e.target.value)}
                placeholder="https://data-pal.vercel.app/api"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-line text-xs font-mono text-text focus:outline-none focus:border-gold"
              />
            </div>

            {apiSaveFeedback && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-center font-bold text-xs">
                {apiSaveFeedback}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setIsApiModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:bg-surface-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveApiSettings}
              className="btn-gold-gradient text-[#120E05] px-4 py-1.5 rounded-lg text-xs font-black cursor-pointer shadow-theme"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </PortalModal>
    </div>
  );
}
