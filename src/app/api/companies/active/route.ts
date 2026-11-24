import { NextResponse } from "next/server";
import { getUserBusinessId, setActiveBusiness } from "@/lib/db";
import { failure, readJson, requireGroup } from "@/lib/companiesApi";

export const dynamic = "force-dynamic";

/**
 * Switches the company the signed-in person works in. Teammates may switch too; what they can open inside a
 * company is still decided by their role.
 */
export async function POST(req: Request) {
  const g = requireGroup(req);
  if (g instanceof NextResponse) return g;
  try {
    const body = await readJson(req);
    const target = String(body.businessId || "");
    if (!target || !setActiveBusiness(g.auth.email, target)) {
      return NextResponse.json({ success: false, error: "That company is not part of your group." }, { status: 404 });
    }
    return NextResponse.json({ success: true, activeBusinessId: getUserBusinessId(g.auth.email) });
  } catch (err) {
    return failure(err);
  }
}
