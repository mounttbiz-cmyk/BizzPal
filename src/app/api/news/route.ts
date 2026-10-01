import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "BizzPal/1.0 (Business Intelligence Platform)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// Google News RSS feeds by business category
const FEEDS: Record<
  string,
  { url: string; categoryLabel: string; badgeColor: string; advisor: string }
> = {
  economy: {
    url: "https://news.google.com/rss/search?q=india+economy+business+RBI+monetary+policy&hl=en-IN&gl=IN&ceid=IN:en",
    categoryLabel: "Economy & Markets",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    advisor: "Marcus (CFO AI)",
  },
  tax_compliance: {
    url: "https://news.google.com/rss/search?q=GST+india+tax+compliance+CBIC&hl=en-IN&gl=IN&ceid=IN:en",
    categoryLabel: "Tax & GST Compliance",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    advisor: "Marcus (CFO AI)",
  },
  funding: {
    url: "https://news.google.com/rss/search?q=startup+funding+india+venture+capital+valuation&hl=en-IN&gl=IN&ceid=IN:en",
    categoryLabel: "Funding & Valuation",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    advisor: "Astra (CEO AI)",
  },
  tech_ai: {
    url: "https://news.google.com/rss/search?q=AI+regulation+data+protection+enterprise+technology+india&hl=en-IN&gl=IN&ceid=IN:en",
    categoryLabel: "Tech & AI Regulations",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    advisor: "Elena (Marketing AI)",
  },
  saas_trends: {
    url: "https://news.google.com/rss/search?q=B2B+SaaS+enterprise+software+india+trends&hl=en-IN&gl=IN&ceid=IN:en",
    categoryLabel: "Industry Trends",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    advisor: "David (Operations AI)",
  },
};

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

function extractSource(content: string | undefined): string {
  if (!content) return "Google News";
  // Google News RSS often has source in content like "<a href=...>Source Name</a>"
  const match = content.match(/<a[^>]*>([^<]+)<\/a>/);
  return match ? match[1].trim() : "Google News";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "4"), 10);

    const feedKeys =
      category === "all" ? Object.keys(FEEDS) : category in FEEDS ? [category] : Object.keys(FEEDS);

    const allItems: Array<{
      id: string;
      title: string;
      category: string;
      categoryLabel: string;
      source: string;
      publishedAt: string;
      summary: string;
      businessImpact: string;
      keyTakeaways: string[];
      url: string;
      badgeColor: string;
      executiveAdvisor: string;
      rawDate: string;
    }> = [];

    // Fetch all feeds in parallel
    const feedResults = await Promise.allSettled(
      feedKeys.map(async (key) => {
        const feedConfig = FEEDS[key];
        try {
          const feed = await parser.parseURL(feedConfig.url);
          const items = (feed.items || []).slice(0, limit);

          return items.map((item, idx) => ({
            id: `rss-${key}-${idx}-${Date.now()}`,
            title: item.title || "Untitled",
            category: key,
            categoryLabel: feedConfig.categoryLabel,
            source: extractSource(item.content || item["content:encoded"]),
            publishedAt: timeAgo(item.pubDate || item.isoDate || ""),
            summary:
              item.contentSnippet?.replace(/<[^>]*>/g, "").slice(0, 280) ||
              item.title ||
              "",
            businessImpact: `This development has direct relevance for executive decision-making in the ${feedConfig.categoryLabel.toLowerCase()} domain.`,
            keyTakeaways: [
              "Monitor this development for strategic opportunities.",
              "Assess operational impact within the next quarter.",
              "Brief executive leadership on potential implications.",
            ],
            url: item.link || "",
            badgeColor: feedConfig.badgeColor,
            executiveAdvisor: feedConfig.advisor,
            rawDate: item.pubDate || item.isoDate || new Date().toISOString(),
          }));
        } catch (err) {
          console.warn(`Failed to fetch feed for ${key}:`, err);
          return [];
        }
      })
    );

    for (const result of feedResults) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Sort by date, newest first
    allItems.sort(
      (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );

    // Strip rawDate from response
    const cleaned = allItems.map(({ rawDate, ...rest }) => rest);

    return NextResponse.json(
      {
        success: true,
        news: cleaned,
        fetchedAt: new Date().toISOString(),
        sources: feedKeys.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      { success: false, news: [], error: "Failed to fetch news feeds" },
      { status: 500 }
    );
  }
}
