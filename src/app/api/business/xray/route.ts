import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { db, getUserBusinessId } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { CrawlError, normaliseStart } from "@/lib/xray/crawl";
import { getXRay, listXRays, startXRay } from "@/lib/xray/store";

export const dynamic = "force-dynamic";

function business(email: string) {
  const id = getUserBusinessId(email);
  const row = db.prepare("SELECT name, website FROM businesses WHERE id = ?").get(id) as any;
  return { id, name: row?.name || "", website: row?.website || "" };
}

/** The latest X-Ray of the company the person is working in, and the list of earlier ones. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const biz = business(auth.email);
  const history = listXRays(biz.id);
  const latest = history[0] ? getXRay(biz.id, history[0].id) : null;
  return NextResponse.json({
    success: true,
    businessName: biz.name,
    website: biz.website,
    canRun: auth.isOwner,
    latest,
    history,
  });
}

/** Starts an X-Ray of a website (the business's own by default). Teammates can view X-Rays but not start them. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const biz = business(auth.email);
  const raw = typeof body?.url === "string" && body.url.trim() ? body.url.trim().slice(0, 300) : biz.website;
  let url: string;
  try {
    url = normaliseStart(raw).toString();
  } catch (err) {
    const message = err instanceof CrawlError ? err.message : "Enter the company website, for example yourcompany.com.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
  if (!rateLimit(`xray:${auth.email}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "You have run several X-Rays in the last hour. Please try again a little later." }, { status: 429 });
  }
  const { id, alreadyRunning } = startXRay({ businessId: biz.id, businessName: biz.name, url, email: auth.email });
  return NextResponse.json({ success: true, id, alreadyRunning }, { status: 202 });
}
