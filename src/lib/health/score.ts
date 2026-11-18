/**
 * One place for the business health score, so the Dashboard header and the health tile always show the same number.
 *
 * It is worked out only from figures the business has entered: cash and burn (runway), the gross margin, and revenue
 * per team member. A part with no figures behind it is left out, not guessed. With no figures at all there is no score.
 * The thresholds are a rule of thumb to read the figures by, not an audit.
 */

export interface HealthBreakdown {
  /** From cash runway. null when cash or burn is not known */
  financial: number | null;
  /** From the gross margin the owner entered. null when it was not entered */
  margin: number | null;
  /** From revenue per team member. null when revenue or team size is not known */
  team: number | null;
  /** Weighted score of the parts that have figures, 0–100. null when none do */
  overall: number | null;
  runwayMonths: string | null;
  revenuePerHead: string | null;
  /** True when the business has not entered any numbers yet */
  isFresh: boolean;
}

export const HEALTH_WEIGHTS = { financial: 0.5, margin: 0.25, team: 0.25 } as const;

export function weightedHealth(s: { financial: number | null; margin: number | null; team: number | null }): number | null {
  let sum = 0;
  let weight = 0;
  for (const key of ["financial", "margin", "team"] as const) {
    const v = s[key];
    if (v !== null && v !== undefined) {
      sum += v * HEALTH_WEIGHTS[key];
      weight += HEALTH_WEIGHTS[key];
    }
  }
  return weight > 0 ? Math.round(sum / weight) : null;
}

export function computeHealth(saved: any): HealthBreakdown {
  const cash = Number(saved?.cash || saved?.cashOnHand || 0);
  const burn = Number(saved?.burn || saved?.monthlyBurn || saved?.monthlyNetBurn || 0);
  const mRev = Number(saved?.revenue || saved?.monthlyRevenue || 0);
  const annRev = Number(saved?.annualRevenue || (mRev > 0 ? mRev * 12 : 0));
  const team = Number(saved?.teamSize || 0);
  const margin = Number(saved?.grossMargin || 0);
  const isFresh = !(cash > 0 || burn > 0 || mRev > 0 || team > 0 || margin > 0);

  let financial: number | null = null;
  let runwayMonths: string | null = null;
  if (burn > 0 && cash > 0) {
    const r = Number((cash / burn).toFixed(1));
    runwayMonths = String(r);
    financial = r >= 18 ? 95 : r >= 12 ? 90 : r >= 8 ? 82 : r >= 5 ? 70 : r >= 3 ? 55 : 35;
  }

  const marginScore: number | null = margin > 0 ? (margin >= 75 ? 90 : margin >= 50 ? 75 : margin >= 30 ? 60 : 40) : null;

  let teamScore: number | null = null;
  let revenuePerHead: string | null = null;
  if (annRev > 0 && team > 0) {
    const rph = Math.round(annRev / team);
    revenuePerHead = rph >= 10000000 ? `₹${(rph / 10000000).toFixed(1)}Cr` : rph >= 100000 ? `₹${(rph / 100000).toFixed(1)}L` : `₹${rph.toLocaleString("en-IN")}`;
    teamScore = rph >= 10000000 ? 92 : rph >= 2500000 ? 90 : rph >= 1000000 ? 82 : rph >= 100000 ? 72 : 65;
  }

  return {
    financial,
    margin: marginScore,
    team: teamScore,
    overall: weightedHealth({ financial, margin: marginScore, team: teamScore }),
    runwayMonths,
    revenuePerHead,
    isFresh,
  };
}
