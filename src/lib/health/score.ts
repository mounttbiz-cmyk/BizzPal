/**
 * One place for the business health score, so the Dashboard header and the
 * health tile always show the same number.
 */

export interface HealthBreakdown {
  financial: number;
  growth: number;
  customer: number;
  operations: number;
  team: number;
  /** Weighted overall score, 0–100 */
  overall: number;
  runwayMonths: string;
  revenuePerHead: string;
  /** True when the business has not entered any numbers yet */
  isFresh: boolean;
}

export const HEALTH_WEIGHTS = { financial: 0.25, growth: 0.2, customer: 0.2, operations: 0.2, team: 0.15 } as const;

export function weightedHealth(s: { financial: number; growth: number; customer: number; operations: number; team: number }): number {
  return Math.round(
    s.financial * HEALTH_WEIGHTS.financial +
      s.growth * HEALTH_WEIGHTS.growth +
      s.customer * HEALTH_WEIGHTS.customer +
      s.operations * HEALTH_WEIGHTS.operations +
      s.team * HEALTH_WEIGHTS.team
  );
}

export function computeHealth(saved: any): HealthBreakdown {
  const cash = Number(saved?.cash || saved?.cashOnHand || 0);
  const burn = Number(saved?.burn || saved?.monthlyBurn || saved?.monthlyNetBurn || 0);
  const mRev = Number(saved?.revenue || saved?.monthlyRevenue || 0);
  const annRev = Number(saved?.annualRevenue || (mRev > 0 ? mRev * 12 : 0));
  const team = Number(saved?.teamSize || (mRev > 0 ? 1 : 0));
  const margin = Number(saved?.grossMargin || 0);

  const hasAnyData = cash > 0 || burn > 0 || mRev > 0 || team > 0;

  // 1. Financial vector (cash runway)
  let runwayMonths = "0.0";
  let financial = 50;
  if (burn > 0) {
    const r = Number((cash / burn).toFixed(1));
    runwayMonths = String(r);
    financial = r >= 18 ? 95 : r >= 12 ? 90 : r >= 8 ? 82 : r >= 5 ? 70 : r >= 3 ? 55 : 35;
  } else if (cash > 0) {
    runwayMonths = "18+";
    financial = 92;
  }

  // 2. Growth vector (revenue)
  const growth = mRev >= 1000000 ? 92 : mRev >= 500000 ? 85 : mRev >= 100000 ? 76 : mRev > 0 ? 68 : 50;

  // 3. Customer vector
  const customer = mRev >= 500000 ? 88 : mRev > 0 ? 78 : 50;

  // 4. Operations vector (margin)
  const operations = margin >= 75 ? 88 : margin >= 50 ? 78 : mRev > 0 ? 70 : 50;

  // 5. Team vector (revenue per head)
  let teamScore = 50;
  let revenuePerHead = team > 0 ? `${team} FTE` : "0 FTE";
  if (annRev > 0 && team > 0) {
    const rph = Math.round(annRev / Math.max(1, team));
    if (rph >= 10000000) {
      revenuePerHead = `₹${(rph / 10000000).toFixed(1)}Cr`;
      teamScore = 92;
    } else if (rph >= 100000) {
      revenuePerHead = `₹${(rph / 100000).toFixed(1)}L`;
      teamScore = rph >= 2500000 ? 90 : rph >= 1000000 ? 82 : 72;
    } else {
      revenuePerHead = `₹${rph.toLocaleString("en-IN")}`;
      teamScore = 65;
    }
  } else if (team > 0) {
    teamScore = 60;
  }

  const parts = { financial, growth, customer, operations, team: teamScore };
  return {
    ...parts,
    overall: weightedHealth(parts),
    runwayMonths,
    revenuePerHead,
    isFresh: !hasAnyData,
  };
}
