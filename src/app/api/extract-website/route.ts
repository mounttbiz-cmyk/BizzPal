import { requireUser } from "@/lib/auth/requireUser";
import { safeGet } from "@/lib/safeFetch";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const targetUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const page = await safeGet(targetUrl, "html", 1_500_000);
    if (!page) {
      return NextResponse.json({ error: "Could not open that website (private, blocked, or invalid URL)." }, { status: 422 });
    }

    const html = page.body.toString("utf8");

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Company";

    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    return NextResponse.json({
      success: true,
      data: {
        title,
        description,
        verifiedDomain: page.url.hostname,
      },
    });
  } catch (error) {
    console.error("Website extraction error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
