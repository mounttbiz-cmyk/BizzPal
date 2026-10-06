"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Sliders,
  X,
  Layers,
  Users,
  Briefcase,
  Store,
  Stethoscope,
  Utensils,
  Building2,
  Laptop,
  ShoppingBag,
  Dumbbell,
  GraduationCap,
  Truck,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/datapal/constants";

export type DetectedSearchType = "Business" | "Professional" | "Audience";

interface SearchInputStepProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedCategories: string[];
  onOpenCategoryPicker: () => void;
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  selectedSubcategory?: string;
  onSelectSubcategory?: (subcategory: string) => void;
  audienceRefine: {
    ageRange?: string;
    gender?: string;
    interests?: string;
  };
  onAudienceRefineChange: (refine: { ageRange?: string; gender?: string; interests?: string }) => void;
  error?: string | null;
  className?: string;
}

const ROTATING_EXAMPLES = [
  "Lawyers in Mumbai",
  "Pan shops",
  "Gen Z fitness enthusiasts",
  "Dental & cosmetic clinics",
  "Chartered Accountants",
  "Specialty coffee roasters",
  "Working women aged 25-40",
  "Interior design studios",
  "First-time tech founders",
];

export function detectCategoryFromQuery(query: string): {
  categoryId: string;
  matchedSubcategory?: string;
} | null {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return null;

  // 1. Doctors & Healthcare (including typo 'dooctor', 'doct', 'doc', 'dr', 'physician', etc.)
  if (
    q.includes("doct") ||
    q.includes("dooc") ||
    q.includes("doc") ||
    q.includes("dr.") ||
    q.includes("physician") ||
    q.includes("medical") ||
    q.includes("health") ||
    q.includes("clinic") ||
    q.includes("hospital") ||
    q.includes("dent") ||
    q.includes("derm") ||
    q.includes("pediat") ||
    q.includes("ortho") ||
    q.includes("cardio") ||
    q.includes("eye") ||
    q.includes("ent ") ||
    q.includes("throat") ||
    q.includes("gynec") ||
    q.includes("psych") ||
    q.includes("physio") ||
    q.includes("ayurv") ||
    q.includes("homeo") ||
    q.includes("pharm") ||
    q.includes("patho")
  ) {
    if (q.includes("dent")) return { categoryId: "healthcare", matchedSubcategory: "Dentists & Dental Clinics" };
    if (q.includes("derm")) return { categoryId: "healthcare", matchedSubcategory: "Dermatologists & Skin Clinics" };
    if (q.includes("pediat") || q.includes("child")) return { categoryId: "healthcare", matchedSubcategory: "Pediatricians & Child Care" };
    if (q.includes("ortho") || q.includes("bone")) return { categoryId: "healthcare", matchedSubcategory: "Orthopedic & Bone Specialists" };
    if (q.includes("cardio") || q.includes("heart")) return { categoryId: "healthcare", matchedSubcategory: "Cardiologists & Heart Specialists" };
    if (q.includes("eye") || q.includes("ophthalm") || q.includes("optic")) return { categoryId: "healthcare", matchedSubcategory: "Eye Specialists & Ophthalmologists" };
    if (q.includes("ent") || q.includes("throat") || q.includes("ear") || q.includes("nose")) return { categoryId: "healthcare", matchedSubcategory: "ENT Specialists (Ear, Nose, Throat)" };
    if (q.includes("gynec") || q.includes("obgyn") || q.includes("obstet")) return { categoryId: "healthcare", matchedSubcategory: "Gynecologists & Obstetricians" };
    if (q.includes("psych") || q.includes("mental") || q.includes("therapy")) return { categoryId: "healthcare", matchedSubcategory: "Psychiatrists & Mental Health" };
    if (q.includes("physio") || q.includes("rehab")) return { categoryId: "healthcare", matchedSubcategory: "Physiotherapists & Rehab Clinics" };
    if (q.includes("ayurv") || q.includes("homeo")) return { categoryId: "healthcare", matchedSubcategory: "Ayurvedic & Homeopathy Centers" };
    if (q.includes("pharm") || q.includes("chemist") || q.includes("medicine")) return { categoryId: "healthcare", matchedSubcategory: "Pharmacies & Medical Stores" };
    if (q.includes("patho") || q.includes("diagnost") || q.includes("lab")) return { categoryId: "healthcare", matchedSubcategory: "Diagnostic Centers & Pathology" };
    if (q.includes("hospital")) return { categoryId: "healthcare", matchedSubcategory: "Hospitals & Multi-Specialty" };
    if (q.includes("general") || q.includes("family")) return { categoryId: "healthcare", matchedSubcategory: "General Physicians & Family Doctors" };

    return { categoryId: "healthcare" };
  }

  // 2. Food, Dining & Hospitality
  if (
    q.includes("food") ||
    q.includes("restaur") ||
    q.includes("cafe") ||
    q.includes("coffee") ||
    q.includes("bakery") ||
    q.includes("bakeries") ||
    q.includes("patisserie") ||
    q.includes("hotel") ||
    q.includes("resort") ||
    q.includes("bar") ||
    q.includes("lounge") ||
    q.includes("pub") ||
    q.includes("cater") ||
    q.includes("kitchen") ||
    q.includes("dining")
  ) {
    if (q.includes("cafe") || q.includes("coffee")) return { categoryId: "food_hospitality", matchedSubcategory: "Cafes & Coffee Shops" };
    if (q.includes("restaur") || q.includes("dining")) return { categoryId: "food_hospitality", matchedSubcategory: "Restaurants & Fine Dining" };
    if (q.includes("hotel") || q.includes("resort")) return { categoryId: "food_hospitality", matchedSubcategory: "Hotels & Boutique Resorts" };
    if (q.includes("bakery") || q.includes("patisserie") || q.includes("cake")) return { categoryId: "food_hospitality", matchedSubcategory: "Bakeries & Patisseries" };
    if (q.includes("bar") || q.includes("lounge") || q.includes("pub")) return { categoryId: "food_hospitality", matchedSubcategory: "Bars & Lounges" };
    if (q.includes("cater")) return { categoryId: "food_hospitality", matchedSubcategory: "Catering Services" };
    if (q.includes("cloud kitchen") || q.includes("food hub")) return { categoryId: "food_hospitality", matchedSubcategory: "Cloud Kitchens & Food Hubs" };
    return { categoryId: "food_hospitality" };
  }

  // 3. Real Estate & Construction
  if (
    q.includes("real estate") ||
    q.includes("property") ||
    q.includes("properties") ||
    q.includes("builder") ||
    q.includes("contractor") ||
    q.includes("architect") ||
    q.includes("interior") ||
    q.includes("broker") ||
    q.includes("commercial real estate")
  ) {
    if (q.includes("interior")) return { categoryId: "real_estate", matchedSubcategory: "Interior Designers" };
    if (q.includes("architect")) return { categoryId: "real_estate", matchedSubcategory: "Architects" };
    if (q.includes("builder") || q.includes("contractor")) return { categoryId: "real_estate", matchedSubcategory: "Builders & Contractors" };
    if (q.includes("developer")) return { categoryId: "real_estate", matchedSubcategory: "Real Estate Developers" };
    if (q.includes("broker")) return { categoryId: "real_estate", matchedSubcategory: "Real Estate Brokerages" };
    return { categoryId: "real_estate" };
  }

  // 4. Technology & IT
  if (
    q.includes("tech") ||
    q.includes("software") ||
    q.includes("it ") ||
    q.includes("saas") ||
    q.includes("developer") ||
    q.includes("web") ||
    q.includes("cyber") ||
    q.includes("cloud") ||
    q.includes("automation") ||
    q.includes("digital marketing")
  ) {
    if (q.includes("saas")) return { categoryId: "technology", matchedSubcategory: "SaaS Startups" };
    if (q.includes("web")) return { categoryId: "technology", matchedSubcategory: "Web Design & Development" };
    if (q.includes("cyber")) return { categoryId: "technology", matchedSubcategory: "Cybersecurity Firms" };
    if (q.includes("cloud")) return { categoryId: "technology", matchedSubcategory: "Cloud Solutions" };
    if (q.includes("ai") || q.includes("automation")) return { categoryId: "technology", matchedSubcategory: "AI & Automation Services" };
    if (q.includes("digital marketing") || q.includes("marketing agency")) return { categoryId: "technology", matchedSubcategory: "Digital Marketing Agencies" };
    return { categoryId: "technology" };
  }

  // 5. Retail & E-Commerce
  if (
    q.includes("retail") ||
    q.includes("shop") ||
    q.includes("store") ||
    q.includes("ecommerce") ||
    q.includes("e-commerce") ||
    q.includes("boutique") ||
    q.includes("supermarket") ||
    q.includes("grocery") ||
    q.includes("fashion") ||
    q.includes("apparel") ||
    q.includes("clothing") ||
    q.includes("electronic") ||
    q.includes("jewel") ||
    q.includes("pan shop")
  ) {
    if (q.includes("ecommerce") || q.includes("e-commerce")) return { categoryId: "retail_ecommerce", matchedSubcategory: "E-commerce Brands" };
    if (q.includes("supermarket") || q.includes("grocery")) return { categoryId: "retail_ecommerce", matchedSubcategory: "Supermarkets & Grocery" };
    if (q.includes("fashion") || q.includes("apparel") || q.includes("clothing")) return { categoryId: "retail_ecommerce", matchedSubcategory: "Fashion & Apparel" };
    if (q.includes("electronic")) return { categoryId: "retail_ecommerce", matchedSubcategory: "Electronics & Appliances" };
    if (q.includes("jewel")) return { categoryId: "retail_ecommerce", matchedSubcategory: "Jewelry & Watches" };
    if (q.includes("wholesale")) return { categoryId: "retail_ecommerce", matchedSubcategory: "Wholesalers & Distributors" };
    return { categoryId: "retail_ecommerce", matchedSubcategory: "Retail Stores & Boutiques" };
  }

  // 6. Professional & Legal Services
  if (
    q.includes("lawyer") ||
    q.includes("advocate") ||
    q.includes("legal") ||
    q.includes("accountant") ||
    q.includes("ca ") ||
    q.includes("cs ") ||
    q.includes("chartered") ||
    q.includes("consult") ||
    q.includes("tax") ||
    q.includes("gst") ||
    q.includes("pr agency") ||
    q.includes("financial advisor")
  ) {
    if (q.includes("lawyer") || q.includes("advocate") || q.includes("legal")) return { categoryId: "professional_services", matchedSubcategory: "Law Firms & Advocates" };
    if (q.includes("accountant") || q.includes("ca") || q.includes("cs") || q.includes("chartered")) return { categoryId: "professional_services", matchedSubcategory: "Chartered Accountants (CA/CS)" };
    if (q.includes("consult")) return { categoryId: "professional_services", matchedSubcategory: "Management Consulting" };
    if (q.includes("pr ") || q.includes("public relations")) return { categoryId: "professional_services", matchedSubcategory: "Public Relations (PR) Agencies" };
    if (q.includes("financial") || q.includes("investment")) return { categoryId: "professional_services", matchedSubcategory: "Financial & Investment Advisors" };
    if (q.includes("tax") || q.includes("gst")) return { categoryId: "professional_services", matchedSubcategory: "Tax & GST Consultants" };
    return { categoryId: "professional_services" };
  }

  // 7. Fitness, Beauty & Wellness
  if (
    q.includes("gym") ||
    q.includes("fitness") ||
    q.includes("yoga") ||
    q.includes("pilates") ||
    q.includes("salon") ||
    q.includes("hair") ||
    q.includes("spa") ||
    q.includes("wellness") ||
    q.includes("beauty")
  ) {
    if (q.includes("gym") || q.includes("fitness")) return { categoryId: "fitness_beauty", matchedSubcategory: "Gyms & Fitness Centers" };
    if (q.includes("yoga") || q.includes("pilates")) return { categoryId: "fitness_beauty", matchedSubcategory: "Yoga & Pilates Studios" };
    if (q.includes("salon") || q.includes("hair")) return { categoryId: "fitness_beauty", matchedSubcategory: "Luxury Salons & Hairdressers" };
    if (q.includes("spa") || q.includes("wellness")) return { categoryId: "fitness_beauty", matchedSubcategory: "Spas & Wellness Resorts" };
    if (q.includes("aesthetic") || q.includes("beauty")) return { categoryId: "fitness_beauty", matchedSubcategory: "Aesthetic & Dermatology Clinics" };
    return { categoryId: "fitness_beauty" };
  }

  // 8. Education & Academics
  if (
    q.includes("school") ||
    q.includes("college") ||
    q.includes("universit") ||
    q.includes("coaching") ||
    q.includes("tuition") ||
    q.includes("jee") ||
    q.includes("neet") ||
    q.includes("edtech") ||
    q.includes("academy") ||
    q.includes("institute") ||
    q.includes("educat")
  ) {
    if (q.includes("universit") || q.includes("college")) return { categoryId: "education", matchedSubcategory: "Universities & Colleges" };
    if (q.includes("school")) return { categoryId: "education", matchedSubcategory: "Private International Schools" };
    if (q.includes("coaching") || q.includes("jee") || q.includes("neet") || q.includes("tuition")) return { categoryId: "education", matchedSubcategory: "IIT-JEE & NEET Coaching Centers" };
    if (q.includes("edtech")) return { categoryId: "education", matchedSubcategory: "EdTech Academies" };
    if (q.includes("skill") || q.includes("vocational")) return { categoryId: "education", matchedSubcategory: "Vocational & Skill Institutes" };
    return { categoryId: "education" };
  }

  // 9. Logistics, Transport & Auto
  if (
    q.includes("auto") ||
    q.includes("garage") ||
    q.includes("car ") ||
    q.includes("cars") ||
    q.includes("mechanic") ||
    q.includes("transport") ||
    q.includes("logistics") ||
    q.includes("freight") ||
    q.includes("courier") ||
    q.includes("dealership") ||
    q.includes("manufacturing")
  ) {
    if (q.includes("garage") || q.includes("repair") || q.includes("mechanic") || q.includes("service center")) return { categoryId: "logistics_automotive", matchedSubcategory: "Auto Repair & Service Centers" };
    if (q.includes("dealership") || q.includes("dealer")) return { categoryId: "logistics_automotive", matchedSubcategory: "Automobile Dealerships" };
    if (q.includes("logistics") || q.includes("freight")) return { categoryId: "logistics_automotive", matchedSubcategory: "Logistics & Freight Forwarders" };
    if (q.includes("transport") || q.includes("fleet")) return { categoryId: "logistics_automotive", matchedSubcategory: "Transport Fleet Companies" };
    if (q.includes("manufactur")) return { categoryId: "logistics_automotive", matchedSubcategory: "Manufacturing Units" };
    return { categoryId: "logistics_automotive" };
  }

  return null;
}

export function getCategoryIcon(id: string) {
  switch (id) {
    case "healthcare":
      return <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    case "food_hospitality":
      return <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    case "real_estate":
      return <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    case "technology":
      return <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    case "retail_ecommerce":
      return <ShoppingBag className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />;
    case "professional_services":
      return <Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    case "fitness_beauty":
      return <Dumbbell className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />;
    case "education":
      return <GraduationCap className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />;
    case "logistics_automotive":
      return <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />;
    default:
      return <Store className="w-4 h-4 text-brass shrink-0" />;
  }
}

export function SearchInputStep({
  searchQuery,
  onSearchQueryChange,
  selectedCategories,
  onOpenCategoryPicker,
  selectedCategory = "",
  onSelectCategory,
  selectedSubcategory = "",
  onSelectSubcategory,
  audienceRefine,
  onAudienceRefineChange,
  error,
  className = "",
}: SearchInputStepProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userSelectedType, setUserSelectedType] = useState<DetectedSearchType | null>(null);
  const [showAudienceRefine, setShowAudienceRefine] = useState(false);

  // Dropdown states for Category & Sub-category
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState("");
  const [subcategorySearchText, setSubcategorySearchText] = useState("");

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const subcategoryContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (subcategoryContainerRef.current && !subcategoryContainerRef.current.contains(e.target as Node)) {
        setIsSubcategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsCategoryOpen(false);
        setIsSubcategoryOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Rotate placeholder smoothly every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-detect and sync category whenever search text matches a known category or specialization
  useEffect(() => {
    if (searchQuery.trim()) {
      const match = detectCategoryFromQuery(searchQuery);
      if (match && selectedCategory !== match.categoryId) {
        onSelectCategory?.(match.categoryId);
        if (match.matchedSubcategory) {
          onSelectSubcategory?.(match.matchedSubcategory);
        }
      }
    }
  }, [searchQuery, selectedCategory, onSelectCategory, onSelectSubcategory]);

  // Find active category item
  const selectedCategoryData = useMemo(() => {
    return BUSINESS_CATEGORIES.find(c => c.id === selectedCategory);
  }, [selectedCategory]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearchText.trim()) return BUSINESS_CATEGORIES;
    const q = categorySearchText.toLowerCase().trim();
    return BUSINESS_CATEGORIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some(s => s.toLowerCase().includes(q))
    );
  }, [categorySearchText]);

  // Filtered subcategories
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryData) return [];
    if (!subcategorySearchText.trim()) return selectedCategoryData.subcategories;
    const q = subcategorySearchText.toLowerCase().trim();
    return selectedCategoryData.subcategories.filter(s => s.toLowerCase().includes(q));
  }, [selectedCategoryData, subcategorySearchText]);

  // Auto-detect type based on search text keywords
  const detectedType: DetectedSearchType = useMemo(() => {
    if (userSelectedType) return userSelectedType;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return "Business";

    if (
      q.includes("gen z") ||
      q.includes("students") ||
      q.includes("women") ||
      q.includes("men") ||
      q.includes("enthusiasts") ||
      q.includes("audience") ||
      q.includes("aged") ||
      q.includes("people") ||
      q.includes("founders") ||
      q.includes("buyers") ||
      q.includes("investors")
    ) {
      return "Audience";
    }

    if (
      q.includes("lawyer") ||
      q.includes("advocate") ||
      q.includes("doctor") ||
      q.includes("physician") ||
      q.includes("dentist") ||
      q.includes("accountant") ||
      q.includes("ca") ||
      q.includes("consultant") ||
      q.includes("architect") ||
      q.includes("designer") ||
      q.includes("therapist") ||
      q.includes("engineer")
    ) {
      return "Professional";
    }

    return "Business";
  }, [searchQuery, userSelectedType]);

  // Cycle type tag on click
  const handleCycleType = () => {
    const types: DetectedSearchType[] = ["Business", "Professional", "Audience"];
    const nextIdx = (types.indexOf(detectedType) + 1) % types.length;
    setUserSelectedType(types[nextIdx]);
  };


  const handleSelectCategory = (catId: string) => {
    onSelectCategory?.(catId);
    if (!catId) {
      onSelectSubcategory?.("");
    } else {
      const cat = BUSINESS_CATEGORIES.find(c => c.id === catId);
      if (selectedSubcategory && cat && !cat.subcategories.includes(selectedSubcategory)) {
        onSelectSubcategory?.("");
      }
    }
    setIsCategoryOpen(false);
    setCategorySearchText("");
  };

  const handleSelectSubcategory = (sub: string) => {
    onSelectSubcategory?.(sub);
    setIsSubcategoryOpen(false);
    setSubcategorySearchText("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Hero Search Input */}
      <div className="relative">
        <label htmlFor="universal-search-input" className="sr-only">
          What data do you need?
        </label>
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-text-muted absolute left-4 pointer-events-none" />
          <input
            id="universal-search-input"
            type="text"
            value={searchQuery}
            onChange={e => {
              const val = e.target.value;
              onSearchQueryChange(val);
              setUserSelectedType(null); // allow auto-detection on text change
            }}
            placeholder={`e.g. "${ROTATING_EXAMPLES[placeholderIndex]}"`}
            className={`w-full pl-11 pr-28 sm:pr-32 py-3.5 sm:py-4 rounded-2xl bg-surface border text-sm sm:text-base text-text placeholder:text-text-muted/60 transition-all shadow-theme focus:outline-none focus:ring-2 focus:ring-brass ${
              error
                ? "border-rust ring-1 ring-rust/30"
                : "border-line hover:border-line-strong focus:border-brass"
            }`}
          />

          {/* Right side: Clear button & Auto-detected Type Tag */}
          <div className="absolute right-3 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCycleType}
              title="Click to cycle entity type hint (Business / Professional / Audience)"
              className="px-2.5 py-1 rounded-xl text-[11px] font-sans font-bold uppercase tracking-wider border cursor-pointer transition-all flex items-center gap-1 bg-surface-2 hover:bg-surface border-line text-text-muted hover:text-text"
            >
              {detectedType === "Business" && <Store className="w-3 h-3 text-brass" />}
              {detectedType === "Professional" && <Briefcase className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
              {detectedType === "Audience" && <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
              <span>{detectedType}</span>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rust mt-1.5 px-1 font-medium animate-fade-in" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* 2. Category & Sub-category Drilldown Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5 items-start">
        {/* Category Combobox */}
        <div className="relative flex flex-col gap-1.5" ref={categoryContainerRef}>
          <div className="flex items-center justify-between h-6">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brass shrink-0" />
              <span>Category</span>
            </label>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => handleSelectCategory("")}
                className="text-[11px] text-text-muted hover:text-brass transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(prev => !prev);
              setIsSubcategoryOpen(false);
            }}
            aria-expanded={isCategoryOpen}
            className={`h-11 min-h-[44px] w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none bg-surface text-left ${
              isCategoryOpen
                ? "border-brass ring-1 ring-brass"
                : selectedCategory
                ? "border-brass/60 bg-brass/5"
                : "border-line hover:border-line-strong"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedCategoryData ? (
                <>
                  <span className="shrink-0">{getCategoryIcon(selectedCategoryData.id)}</span>
                  <span className="text-xs sm:text-sm font-semibold text-text truncate">
                    {selectedCategoryData.name}
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-sm text-text-muted truncate">
                  All Categories
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-text-muted">
              {selectedCategory && (
                <span
                  role="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSelectCategory("");
                  }}
                  title="Clear category"
                  className="p-1 rounded-md hover:bg-surface-2 hover:text-text cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCategoryOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Category Dropdown Menu */}
          {isCategoryOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-xl border border-line bg-surface shadow-2xl overflow-hidden animate-fade-in">
              <div className="p-2 border-b border-line bg-surface-2/40">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={categorySearchText}
                    onChange={e => setCategorySearchText(e.target.value)}
                    placeholder="Search category (e.g. Doctor, Hospitality, IT)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface rounded-lg border border-line text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {/* Drawer View Option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryOpen(false);
                    onOpenCategoryPicker();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer hover:bg-surface-2 text-brass font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brass shrink-0" />
                    <span>Browse all categories ({selectedCategories.length > 0 ? `${selectedCategories.length} selected` : "80+"})</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-brass shrink-0" />
                </button>

                <div className="h-px bg-line my-1" />

                {/* General Option */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory("")}
                  className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !selectedCategory
                      ? "bg-brass/15 text-brass font-semibold"
                      : "hover:bg-surface-2 text-text"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-brass shrink-0" />
                    <span>All Categories</span>
                  </div>
                  {!selectedCategory && <Check className="w-3.5 h-3.5 text-brass shrink-0 ml-2" />}
                </button>

                <div className="h-px bg-line my-1" />

                {filteredCategories.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-brass/15 text-brass font-semibold"
                          : "hover:bg-surface-2 text-text"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getCategoryIcon(cat.id)}
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] text-text-muted font-normal shrink-0">
                          ({cat.subcategories.length})
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brass shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sub-category Combobox (Explicitly Optional) */}
        <div className="relative flex flex-col gap-1.5" ref={subcategoryContainerRef}>
          <div className="flex items-center justify-between h-6">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <span>Sub-category</span>
              <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-line">
                Optional
              </span>
              {selectedSubcategory && (
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-brass/15 text-brass">
                  Filtered
                </span>
              )}
            </label>
            {selectedSubcategory && (
              <button
                type="button"
                onClick={() => handleSelectSubcategory("")}
                className="text-[11px] text-text-muted hover:text-brass transition-colors cursor-pointer"
              >
                Reset to All
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedCategory}
            onClick={() => {
              if (selectedCategory) {
                setIsSubcategoryOpen(prev => !prev);
                setIsCategoryOpen(false);
              }
            }}
            aria-expanded={isSubcategoryOpen}
            className={`h-11 min-h-[44px] w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all select-none text-left ${
              !selectedCategory
                ? "bg-surface/50 border-line/60 text-text-muted opacity-60 cursor-not-allowed"
                : isSubcategoryOpen
                ? "border-brass ring-1 ring-brass bg-surface cursor-pointer"
                : selectedSubcategory
                ? "border-brass/70 bg-brass/5 cursor-pointer"
                : "border-line hover:border-line-strong bg-surface cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!selectedCategory ? (
                <span className="text-xs sm:text-sm text-text-muted">
                  Select a category first
                </span>
              ) : selectedSubcategory ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-brass shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-text truncate">
                    {selectedSubcategory}
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-sm text-text-muted truncate">
                  All {selectedCategoryData?.name} (Broad Search)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-text-muted">
              {selectedSubcategory && (
                <span
                  role="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSelectSubcategory("");
                  }}
                  title="Reset to broad search"
                  className="p-1 rounded-md hover:bg-surface-2 hover:text-text cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubcategoryOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Sub-category Dropdown Menu */}
          {isSubcategoryOpen && selectedCategoryData && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-xl border border-line bg-surface shadow-2xl overflow-hidden animate-fade-in">
              <div className="p-2 border-b border-line bg-surface-2/40">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={subcategorySearchText}
                    onChange={e => setSubcategorySearchText(e.target.value)}
                    placeholder={`Search within ${selectedCategoryData.name}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface rounded-lg border border-line text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {/* Option 1: Broad Search (No specific subcategory) */}
                <button
                  type="button"
                  onClick={() => handleSelectSubcategory("")}
                  className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !selectedSubcategory
                      ? "bg-brass/15 text-brass font-semibold"
                      : "hover:bg-surface-2 text-text"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-current" />
                    <span className="font-medium">All {selectedCategoryData.name} (Broad Search)</span>
                  </div>
                  {!selectedSubcategory && <Check className="w-3.5 h-3.5 text-brass shrink-0 ml-2" />}
                </button>

                <div className="h-px bg-line my-1" />

                {/* Subcategories */}
                {filteredSubcategories.length === 0 ? (
                  <p className="p-3 text-xs text-text-muted text-center">
                    No specialization found matching &quot;{subcategorySearchText}&quot;
                  </p>
                ) : (
                  filteredSubcategories.map(sub => {
                    const isSelected = selectedSubcategory === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleSelectSubcategory(sub)}
                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-brass/15 text-brass font-semibold"
                            : "hover:bg-surface-2 text-text"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-brass" : "bg-text-muted/40"}`} />
                          <span className="truncate">{sub}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brass shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Optional Collapsed "Refine" row for Audience Searches */}
      {detectedType === "Audience" && (
        <div className="rounded-xl border border-line bg-surface-2/30 p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAudienceRefine(prev => !prev)}
              className="text-xs font-semibold text-text flex items-center gap-1.5 cursor-pointer hover:text-brass transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-brass" />
              <span>Refine Audience Demographics (Optional)</span>
              {showAudienceRefine ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAudienceRefine && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in text-xs">
              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Age Range
                </label>
                <input
                  type="text"
                  value={audienceRefine.ageRange || ""}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, ageRange: e.target.value })}
                  placeholder="e.g. 18-25, 25-40"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Gender
                </label>
                <select
                  value={audienceRefine.gender || "All"}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, gender: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  <option value="All">All Genders</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Key Interests / Hobbies
                </label>
                <input
                  type="text"
                  value={audienceRefine.interests || ""}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, interests: e.target.value })}
                  placeholder="e.g. Fitness, Tech, Fashion"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
