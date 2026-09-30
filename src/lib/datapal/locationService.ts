import { Country, State, City, ICountry, IState, ICity } from "country-state-city";

export interface LocationItem {
  code: string;
  name: string;
  dialCode?: string;
  parentCode?: string;
}

// Popular countries prioritized at the top
const POPULAR_COUNTRY_CODES = ["IN", "US", "GB", "AE", "CA", "AU", "SG", "DE"];

class LocationService {
  private countriesCache: LocationItem[] | null = null;
  private statesCache: Map<string, LocationItem[]> = new Map();
  private citiesCache: Map<string, LocationItem[]> = new Map();

  /**
   * Get all countries worldwide with popular countries grouped at top.
   */
  getCountries(): { popular: LocationItem[]; all: LocationItem[] } {
    if (!this.countriesCache) {
      const allRaw = Country.getAllCountries();
      this.countriesCache = allRaw.map(c => ({
        code: c.isoCode,
        name: c.name,
        dialCode: c.phonecode ? (c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`) : undefined,
      }));
    }

    const popular = POPULAR_COUNTRY_CODES
      .map(code => this.countriesCache!.find(c => c.code === code))
      .filter((c): c is LocationItem => Boolean(c));

    return {
      popular,
      all: this.countriesCache,
    };
  }

  /**
   * Get states/provinces of a country (cached).
   */
  getStates(countryCode: string): LocationItem[] {
    const code = (countryCode || "").toUpperCase();
    if (!code) return [];

    if (this.statesCache.has(code)) {
      return this.statesCache.get(code)!;
    }

    const statesRaw = State.getStatesOfCountry(code);
    const result = statesRaw.map(s => ({
      code: s.isoCode,
      name: s.name,
      parentCode: code,
    }));

    this.statesCache.set(code, result);
    return result;
  }

  /**
   * Get cities of a specific state or entire country (cached).
   */
  getCities(countryCode: string, stateCode?: string): LocationItem[] {
    const cCode = (countryCode || "").toUpperCase();
    if (!cCode) return [];

    const cacheKey = stateCode ? `${cCode}_${stateCode}` : `${cCode}_ALL`;
    if (this.citiesCache.has(cacheKey)) {
      return this.citiesCache.get(cacheKey)!;
    }

    let citiesRaw: ICity[] = [];
    if (stateCode && stateCode !== "ALL") {
      citiesRaw = City.getCitiesOfState(cCode, stateCode);
    } else {
      citiesRaw = City.getCitiesOfCountry(cCode) || [];
    }

    // Deduplicate by city name to prevent duplicates
    const seen = new Set<string>();
    const result: LocationItem[] = [];

    for (const city of citiesRaw) {
      if (!seen.has(city.name)) {
        seen.add(city.name);
        result.push({
          code: city.name,
          name: city.name,
          parentCode: city.stateCode || cCode,
        });
      }
    }

    this.citiesCache.set(cacheKey, result);
    return result;
  }

  /**
   * Return real sample localities for a given city to guide user input.
   */
  getSampleLocalities(cityName: string): string {
    const city = (cityName || "").toLowerCase().trim();
    if (city.includes("mumbai")) return "Bandra, Andheri, Colaba, BKC, Powai";
    if (city.includes("delhi")) return "Connaught Place, South Ex, Hauz Khas, Saket";
    if (city.includes("bengaluru") || city.includes("bangalore")) return "Koramangala, Indiranagar, Whitefield, HSR Layout";
    if (city.includes("pune")) return "Kothrud, Viman Nagar, Hinjewadi, Baner";
    if (city.includes("hyderabad")) return "Hitec City, Banjara Hills, Jubilee Hills, Gachibowli";
    if (city.includes("chennai")) return "T Nagar, Anna Nagar, Adyar, Velachery";
    if (city.includes("kolkata")) return "Salt Lake, Park Street, New Town, Alipore";
    if (city.includes("ahmedabad")) return "SG Highway, Prahlad Nagar, Bodakdev, Satellite";
    if (city.includes("jaipur")) return "C Scheme, Malviya Nagar, Vaishali Nagar";
    if (city.includes("new york")) return "Manhattan, Brooklyn, Queens, Soho";
    if (city.includes("london")) return "Westminster, Camden, Kensington, City of London";
    if (city.includes("dubai")) return "Downtown, Marina, Business Bay, Deira";
    if (city.includes("toronto")) return "Downtown, Yorkville, Scarborough, North York";
    if (city.includes("sydney")) return "CBD, Bondi, Parramatta, Surry Hills";
    return "Neighborhood, district or commercial area";
  }
}

export const locationService = new LocationService();
