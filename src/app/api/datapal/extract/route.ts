import { NextRequest, NextResponse } from "next/server";
import { extractRealBusinessLeads } from "@/lib/datapal/realExtractor";
import { makeLeadSignature } from "@/lib/datapal/signature";
import { DataPalBusinessLead, DataPalSearchConfig } from "@/lib/datapal/types";
import { logDataPalUsage, getDataPalCredits, consumeDataPalCredits, isUserRegistered } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Every search can cost real money (Google Places), so it needs an account and is rate limited.
    const ipLimit = rateLimit(`dp-ip:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: "Too many searches. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { config, apiKey, apiEndpoint, account, excludeSignatures } = body as {
      config: DataPalSearchConfig;
      apiKey?: string;
      apiEndpoint?: string;
      account?: { email?: string; name?: string };
      excludeSignatures?: string[];
    };

    if (!config) {
      return NextResponse.json({ error: "Search configuration is required" }, { status: 400 });
    }

    const email = String(account?.email || "").trim().toLowerCase();
    if (!email.includes("@") || !isUserRegistered(email)) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const userLimit = rateLimit(`dp-user:${email}`, 8, 5 * 60 * 1000);
    if (!userLimit.ok) {
      return NextResponse.json(
        { error: "You are searching too fast. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSec) } }
      );
    }

    // Credits are kept on the server, so they cannot be edited in the browser.
    const credits = getDataPalCredits(email);
    if (credits.remaining <= 0) {
      return NextResponse.json(
        { error: "You have used all your DataPal records. Upgrade your plan to get more.", code: "no_credits" },
        { status: 402 }
      );
    }

    // 1. If an external DataPal scraper API key is provided, proxy to DataPal backend
    if (apiKey && apiKey.trim().length > 5) {
      const endpoint = apiEndpoint || "https://data-pal.vercel.app/api/scraper/bulkSearch";
      try {
        const upstreamResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-DataPal-Key": apiKey,
          },
          body: JSON.stringify({
            businessTypes: config.selectedCategories,
            location: [config.areaPincode, config.city, config.state, config.countryCode].filter(Boolean).join(", "),
            requirement: config.requirement,
          }),
        });

        if (upstreamResponse.ok) {
          const upstreamData = await upstreamResponse.json();
          return NextResponse.json({ mode: "live", data: upstreamData, timestamp: new Date().toISOString() });
        }
      } catch (upstreamErr) {
        console.warn("DataPal live API unreachable, using the built-in directory extractor:", upstreamErr);
      }
    }

    // 2. Real businesses only (Google Places / OpenStreetMap). Nothing is invented.
    const { leads: realLeads, sourceMode, googleRequests } = await extractRealBusinessLeads(config, apiKey);

    const asked = config.requestedCount && config.requestedCount > 0 ? config.requestedCount : 25;
    const targetCount = Math.min(asked, credits.remaining);

    // Leave out businesses this account already has, if asked to, before anything is charged
    const exclude = new Set<string>(Array.isArray(excludeSignatures) ? excludeSignatures.slice(0, 50000) : []);
    const fresh = exclude.size
      ? realLeads.filter(l => !exclude.has(makeLeadSignature({ name: l.name, city: l.city, phone: l.phone, website: l.website })))
      : realLeads;
    const leads: DataPalBusinessLead[] = fresh.slice(0, targetCount);
    const alreadyHad = realLeads.length - fresh.length;

    logDataPalUsage({
      email,
      name: account?.name,
      requested: targetCount,
      returned: leads.length,
      realLeads: leads.length,
      sourceMode,
      googleRequests,
    });

    // Only records that were really delivered use up credits
    const after = consumeDataPalCredits(email, leads.length);

    const locationString = [config.areaPincode, config.city, config.state, config.countryCode === "IN" ? "India" : config.countryCode]
      .filter(Boolean)
      .join(", ");

    const campaign = {
      id: `camp_${Date.now()}`,
      title: config.searchQuery?.trim()
        ? `${config.searchQuery.trim()} in ${config.city || "All Regions"}`
        : `${config.requirement || "Business Leads"} in ${config.city || "All Regions"}`,
      searchQuery: config.searchQuery,
      requirement: config.requirement,
      location: locationString,
      countryCode: config.countryCode,
      businessTypes: config.selectedCategories,
      totalExtracted: leads.length,
      phoneCount: leads.filter(l => l.phone).length,
      emailCount: leads.filter(l => l.email).length,
      websiteCount: leads.filter(l => l.website).length,
      opportunityCount: leads.filter(l => l.opportunityLevel === "Critical" || l.opportunityLevel === "High").length,
      createdAt: new Date().toISOString(),
      status: "completed",
      results: leads,
      duplicatesRemoved: alreadyHad,
    };

    return NextResponse.json({
      mode: sourceMode === "fallback" ? "no_results" : sourceMode,
      campaign,
      credits: {
        planTier: after.planTier,
        baseQuota: after.baseQuota,
        usedData: after.used,
        addonCredits: after.addon,
        totalAllowed: after.totalAllowed,
        remainingData: after.remaining,
        usedLeads: after.used,
        remainingQuota: after.remaining,
      },
      message:
        leads.length > 0
          ? `Found ${leads.length} real businesses.`
          : "No matching businesses were found. Try a wider area or a different category. You were not charged.",
    });
  } catch (error: any) {
    console.error("DataPal extraction error:", error);
    return NextResponse.json({ error: "Failed to process data extraction" }, { status: 500 });
  }
}
