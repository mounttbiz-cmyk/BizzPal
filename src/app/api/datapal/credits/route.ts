import { NextResponse } from "next/server";
import { getDataPalCredits, isUserRegistered } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email.includes("@") || !isUserRegistered(email)) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const c = getDataPalCredits(email);
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
