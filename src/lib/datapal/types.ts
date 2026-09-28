export interface BusinessSubcategory {
  id: string;
  name: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

export interface StateHierarchy {
  name: string;
  cities: string[];
}

export interface CountryHierarchy {
  code: string;
  name: string;
  flag: string;
  phonePrefix: string;
  postalCodeLabel: string;
  states: StateHierarchy[];
}

export interface TargetProfilePreset {
  id: string;
  label: string;
  desc: string;
  badge?: string;
  suggestedCategories?: string[];
}

export interface DataPalBusinessLead {
  id: string;
  name: string;
  category: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  rating?: number | null;
  reviewsCount?: number;
  existingPresence?: string;
  source: string;
  notes?: string;
  verified: boolean;
  opportunityLevel: "Critical" | "High" | "Medium" | "Low";
  tags?: string[];
  extractedAt: string;
}

export interface DataPalSearchFilters {
  mustHavePhone: boolean;
  mustHaveEmail: boolean;
  minRating: number;
  sources: string[];
}

export interface DataPalSearchConfig {
  searchQuery?: string;
  requirement: string;
  requirementId?: string;
  countryCode: string;
  state: string;
  city: string;
  areaPincode?: string;
  selectedCategories: string[];
  filters: DataPalSearchFilters;
  servicePitch?: {
    text?: string;
    imageName?: string;
    imageBase64?: string;
  };
}

export interface DataPalSearchCampaign {
  id: string;
  title: string;
  searchQuery?: string;
  requirement: string;
  location: string;
  countryCode: string;
  businessTypes: string[];
  totalExtracted: number;
  phoneCount: number;
  emailCount: number;
  websiteCount: number;
  opportunityCount: number;
  createdAt: string;
  status: "completed" | "running" | "failed";
  results: DataPalBusinessLead[];
}

export interface DataPalApiSettings {
  apiKey: string;
  apiEndpoint: string;
  googlePlacesApiKey?: string;
  isLiveConnected: boolean;
  lastConnectedAt?: string;
  remainingCredits?: number;
}
