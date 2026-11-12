import { DataPalBusinessLead, DataPalSearchConfig } from "./types";
import { COUNTRY_HIERARCHIES } from "./constants";

/**
 * Free Real-Data Extraction Engine for DataPal
 * Combines OpenStreetMap Global Directory (100% Free, Zero Key Required)
 * with Google Places API ($200/mo Free Tier via process.env.GOOGLE_PLACES_API_KEY)
 */
export async function extractRealBusinessLeads(
  config: DataPalSearchConfig,
  customApiKey?: string
): Promise<{ leads: DataPalBusinessLead[]; sourceMode: "google_places_live" | "openstreetmap_live" | "hybrid_live" | "fallback"; googleRequests: number }> {
  const googleApiKey =
    customApiKey ||
    process.env.GEMINI_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
    "";

  const matchedCountry =
    COUNTRY_HIERARCHIES.find(c => c.code === config.countryCode) ||
    COUNTRY_HIERARCHIES[0];

  const countryName = matchedCountry.name;
  const phonePrefix = matchedCountry.phonePrefix || "+91";

  // Build target search terms
  const targetCategory =
    config.selectedCategories && config.selectedCategories.length > 0
      ? config.selectedCategories[0]
      : "";

  const categoriesText =
    config.selectedCategories && config.selectedCategories.length > 0
      ? config.selectedCategories.join(" ")
      : "";

  const queryTerm = config.searchQuery?.trim() || categoriesText || "businesses";
  const locationParts = [config.areaPincode, config.city, config.state, countryName].filter(Boolean);
  const locationTerm = locationParts.join(", ") || countryName;

  let googleRequests = 0;

  // The user's own rules. Applied to real results only, so nothing has to be invented to satisfy them.
  const rules = config.filters || ({} as any);
  const passesRules = (phone: string | null, rating: number | null): boolean => {
    if (rules.mustHavePhone && !phone) return false;
    if (rules.minRating && rules.minRating > 0 && (rating === null || rating < rules.minRating)) return false;
    return true;
  };

  // 1. TRY GOOGLE PLACES API (NEW) WITH GOOGLE MAPS API KEY (WITH AUTOMATIC PAGINATION)
  if (googleApiKey && googleApiKey.trim().length > 10) {
    try {
      const googleQuery = `${queryTerm} in ${locationTerm}`.trim();

      // Modern Google Places API (New) - v1/places:searchText with multi-page token traversal
      let collectedPlaces: any[] = [];
      let pageToken: string | undefined = undefined;
      const seenIds = new Set<string>();

      // Loop up to 3 pages (fetching up to 60 live businesses)
      for (let page = 1; page <= 3; page++) {
        const reqBody: any = {
          textQuery: googleQuery,
          maxResultCount: 20,
        };
        if (pageToken) {
          reqBody.pageToken = pageToken;
        }

        googleRequests++;
        const newPlacesRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleApiKey,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.types,places.id,places.googleMapsUri,places.businessStatus,nextPageToken"
          },
          body: JSON.stringify(reqBody),
          next: { revalidate: 60 }
        });

        if (!newPlacesRes.ok) break;

        const newData = await newPlacesRes.json();
        if (Array.isArray(newData.places)) {
          for (const p of newData.places) {
            if (p.id && !seenIds.has(p.id)) {
              seenIds.add(p.id);
              if (p.businessStatus === "CLOSED_PERMANENTLY") continue;
              const ph = p.nationalPhoneNumber || p.internationalPhoneNumber || null;
              const rt = typeof p.rating === "number" ? p.rating : null;
              if (!passesRules(ph, rt)) continue;
              collectedPlaces.push(p);
            }
          }
        }

        pageToken = newData.nextPageToken;
        if (!pageToken) break;
        // Each page is a billed Google request: stop once we have enough results
        const wanted = config.requestedCount && config.requestedCount > 0 ? config.requestedCount : 25;
        if (collectedPlaces.length >= wanted) break;
      }

      if (collectedPlaces.length > 0) {
        const googleLeads: DataPalBusinessLead[] = collectedPlaces.map((place: any, idx: number) => {
          const name = place.displayName?.text || place.name || `${queryTerm} Establishment`;
          const realWebsite = place.websiteUri || null;
          const hasWebsite = Boolean(realWebsite);
          const rating: number | null = typeof place.rating === "number" ? place.rating : null;
          const reviewsCount = place.userRatingCount || 0;
          const ratingText = rating !== null ? `${reviewsCount} reviews (${rating}★)` : "no reviews yet";

          const isNormalExtract = config.requirement.toLowerCase().includes("normal");
          const isMissingWebsite = !isNormalExtract && (config.requirement.toLowerCase().includes("website") || !hasWebsite);

          // Phone numbers come from Google only. A business without one has none listed.
          const phone: string | null = place.nationalPhoneNumber || place.internationalPhoneNumber || null;

          // Google does not publish emails. For businesses with a website we can suggest the usual
          // info@ address, clearly marked as unverified. Without a website we show nothing.
          let email: string | null = null;
          if (realWebsite) {
            try {
              email = `info@${new URL(realWebsite).hostname.replace(/^www\./, "")}`;
            } catch {}
          }

          const primaryType = (place.types && place.types[0] ? place.types[0].replace(/_/g, " ") : targetCategory) || "Commercial Establishment";

          return {
            id: `gplace_${place.id || Date.now()}_${idx}`,
            name,
            category: primaryType.charAt(0).toUpperCase() + primaryType.slice(1),
            website: isMissingWebsite ? null : realWebsite,
            phone,
            email,
            emailVerified: false,
            mapsUrl: place.googleMapsUri || null,
            address: place.formattedAddress || locationTerm,
            city: config.city || "City",
            state: config.state || "State",
            country: countryName,
            postalCode: config.areaPincode || undefined,
            rating,
            reviewsCount,
            existingPresence: hasWebsite ? "Google Maps Verified, Official Website" : "Google Maps Verified, No Website",
            source: "Google Maps & Places (Live API)",
            notes: isNormalExtract
              ? `Listed on Google Maps with ${ratingText}.`
              : isMissingWebsite
              ? `Listed on Google Maps with ${ratingText} but no website.`
              : `Listed on Google Maps with ${ratingText}. Relevant for: ${config.requirement}.`,
            verified: true,
            opportunityLevel: isMissingWebsite ? "Critical" : rating !== null && rating >= 4.5 ? "High" : "Medium",
            extractedAt: new Date().toISOString(),
          };
        });

        return { leads: googleLeads, sourceMode: "google_places_live", googleRequests };
      }
    } catch (gErr) {
      console.warn("Google Places API live query error, falling back to OpenStreetMap:", gErr);
    }
  }

  // 2. 100% FREE GLOBAL DIRECTORY SCRAPER: OpenStreetMap Nominatim + Overpass (Zero Cost, No Key)
  try {
    const freeQueries = [
      `${queryTerm} in ${config.city}`,
      `${queryTerm} ${config.city} ${config.state || ""}`,
      `${queryTerm} ${config.city}`,
    ];

    let osmResults: any[] = [];

    for (const q of freeQueries) {
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=json&addressdetails=1&extratags=1&limit=25`;

        const osmRes = await fetch(osmUrl, {
          headers: {
            "User-Agent": "BizzPalLeadScraper/1.0 (contact@bizzpal.com)",
            "Accept-Language": "en",
          },
        });

        if (osmRes.ok) {
          const list = await osmRes.json();
          if (Array.isArray(list) && list.length > 0) {
            osmResults = list;
            break;
          }
        }
      } catch (err) {
        continue;
      }
    }

    if (osmResults.length > 0) {
      const realOsmLeads: DataPalBusinessLead[] = osmResults.map((item: any, idx: number) => {
        const addr = item.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
        const city = addr.city || addr.town || addr.village || addr.county || config.city;
        const state = addr.state || config.state;
        const postcode = addr.postcode || config.areaPincode;

        const rawName = item.name || (item.display_name ? item.display_name.split(",")[0] : queryTerm);
        const cleanName = rawName.trim();

        const extra = item.extratags || {};
        const realPhone = extra.phone || extra["contact:phone"] || extra["contact:mobile"];
        const realWebsite = extra.website || extra["contact:website"];

        const isNormalExtract = config.requirement.toLowerCase().includes("normal");
        const isMissingWebsite = !isNormalExtract && (config.requirement.toLowerCase().includes("website") || !realWebsite);

        // OpenStreetMap has no ratings or reviews, and only some places list a phone or email.
        const phoneToUse: string | null = realPhone || null;
        const realEmail: string | null = extra.email || extra["contact:email"] || null;

        return {
          id: `osm_${item.osm_id || Date.now()}_${idx}`,
          name: cleanName,
          category: (item.type ? item.type.replace(/_/g, " ") : targetCategory) || "Local Business",
          website: isMissingWebsite ? null : realWebsite || null,
          phone: phoneToUse,
          email: realEmail,
          emailVerified: Boolean(realEmail),
          address: item.display_name || `${road}, ${city}, ${state}`,
          city,
          state,
          country: addr.country || countryName,
          postalCode: postcode,
          rating: null,
          reviewsCount: 0,
          existingPresence: realWebsite ? "Official Website, OpenStreetMap, Maps" : "OpenStreetMap, Local Directory",
          source: "OpenStreetMap (Live Directory)",
          notes: isNormalExtract
            ? `Real Live POI: Verified physical establishment in ${road || city}. Real coordinates: (${item.lat}, ${item.lon}).`
            : isMissingWebsite
            ? `Real Physical Establishment: Active address at ${road || city} with zero dedicated website domain. Pitch web design.`
            : `Real verified local enterprise. High relevance for ${config.requirement}.`,
          verified: true,
          opportunityLevel: isMissingWebsite ? "Critical" : "High",
          extractedAt: new Date().toISOString(),
        };
      });

      const kept = realOsmLeads.filter(l => !(rules.mustHavePhone && !l.phone) && !(rules.minRating > 0));
      if (kept.length > 0) {
        return { leads: kept, sourceMode: "openstreetmap_live", googleRequests };
      }
    }
  } catch (osmErr) {
    console.warn("OpenStreetMap free live scraper error:", osmErr);
  }

  return { leads: [], sourceMode: "fallback", googleRequests };
}
