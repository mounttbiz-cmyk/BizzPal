import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { iconForWebsite } from "@/lib/companyIcon";
import { requireGroup } from "@/lib/companiesApi";

export const dynamic = "force-dynamic";

/** The website icon of the group or one of its companies, for the company lists. 404 when there is none. */
export async function GET(req: Request) {
  const g = requireGroup(req);
  if (g instanceof NextResponse) return g;
  const id = new URL(req.url).searchParams.get("id") || "";
  const row = db
    .prepare("SELECT website FROM businesses WHERE id = ? AND (id = ? OR group_id = ?)")
    .get(id, g.groupId, g.groupId) as any;
  if (!row?.website) return new NextResponse(null, { status: 404 });

  const icon = await iconForWebsite(String(row.website));
  if (!icon) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, max-age=3600" } });
  return new NextResponse(new Uint8Array(icon.body), {
    headers: {
      "Content-Type": icon.type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      // An SVG icon is only ever shown as an image; nothing in it may run
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
