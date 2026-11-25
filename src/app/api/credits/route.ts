import { NextResponse } from "next/server";
import { failure, requireAgentUser } from "@/lib/agents/api";
import { ledger, walletBalance } from "@/lib/platform/wallet";
import { dailyLimitInr, planIdFor, spentTodayInr, usageSummary } from "@/lib/platform/usage";

export const dynamic = "force-dynamic";

/** The account's credit wallet, its ledger, and what AI has cost today and over the last 30 days. */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const plan = planIdFor(a.auth.email);
    return NextResponse.json({
      success: true,
      wallet: walletBalance(a.walletBusinessId),
      ledger: a.auth.isOwner ? ledger(a.walletBusinessId, 100) : [],
      today: { spentInr: spentTodayInr(a.walletBusinessId), limitInr: dailyLimitInr(plan), plan },
      usage30d: usageSummary(a.walletBusinessId, 30),
    });
  } catch (err) {
    return failure(err);
  }
}
