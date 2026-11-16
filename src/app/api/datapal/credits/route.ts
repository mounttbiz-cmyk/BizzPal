import { NextResponse } from "next/server";
import { getDataPalCredits } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const c = getDataPalCredits(auth.email);
  return NextResponse.json({
    status: {
      planTier: c.planTier,
      baseQuota: c.baseQuota,
      usedData: c.used,
      addonCredits: c.addon,
      totalAllowed: c.totalAllowed,
      remainingData: c.remaining,
      usedLeads: c.used,
      remainingQuota: c.remaining,
    },
  });
}
