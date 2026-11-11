/**
 * Builds an executive briefing from the business's real numbers and tasks.
 * Nothing here is invented: if there is not enough data, the briefing says so.
 */
import { computeHealth } from "@/lib/health/score";

export interface BriefingContent {
  id: string;
  generatedAt: string; // ISO
  healthScore: number;
  healthLabel: string;
  annualRevenue: number;
  monthlyRevenue: number;
  cash: number;
  burn: number;
  runway: string; // "8.0" | "18+" | "—"
  teamSize: number;
  revenuePerHead: number;
  openTasks: number | null;
  doneTasks: number | null;
  hasData: boolean;
  signals: { title: string; desc: string }[];
  risks: { title: string; severity: "High" | "Medium" | "Low"; desc: string }[];
  opportunities: { title: string; desc: string }[];
  suggestedDecisions: {
    id: string;
    title: string;
    category: "finance" | "sales" | "operations" | "talent";
    recommendation: string;
    impact: string;
  }[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function buildBriefing(args: { profile: any; openTasks: number | null; doneTasks: number | null }): BriefingContent {
  const p = args.profile || {};
  const cash = Number(p.cash || p.cashOnHand || p.cash_on_hand || 0);
  const burn = Number(p.burn || p.monthlyBurn || p.monthly_burn || p.monthlyNetBurn || 0);
  const monthlyRevenue = Number(p.revenue || p.monthlyRevenue || p.monthly_revenue || 0);
  const annualRevenue = Number(p.annualRevenue || p.annual_revenue || monthlyRevenue * 12 || 0);
  const teamSize = Number(p.teamSize || p.team_size || (monthlyRevenue > 0 ? 1 : 0));
  const hasData = cash > 0 || burn > 0 || monthlyRevenue > 0;

  const health = computeHealth(p);
  const runwayNum = burn > 0 ? cash / burn : null;
  const runway = burn > 0 ? runwayNum!.toFixed(1) : cash > 0 ? "18+" : "—";
  const healthLabel = !hasData ? "Not enough data" : health.overall >= 75 ? "Healthy" : health.overall >= 50 ? "Needs attention" : "At risk";

  const signals: BriefingContent["signals"] = [];
  const risks: BriefingContent["risks"] = [];
  const opportunities: BriefingContent["opportunities"] = [];
  const suggestedDecisions: BriefingContent["suggestedDecisions"] = [];

  if (!hasData) {
    risks.push({
      title: "No numbers added yet",
      severity: "Medium",
      desc: "Add your revenue, monthly costs and cash with Quick business input so this briefing can measure runway and health.",
    });
    suggestedDecisions.push({
      id: "auto-add-numbers",
      title: "Add your business numbers",
      category: "finance",
      recommendation: "Without revenue, costs and cash we can't measure runway or flag risks.",
      impact: "Unlocks runway, health score and risk checks.",
    });
  } else {
    signals.push({
      title: "Revenue",
      desc: monthlyRevenue > 0 ? `You earn ${inr(monthlyRevenue)} a month (${inr(annualRevenue)} a year).` : "No monthly revenue has been entered.",
    });
    signals.push({
      title: "Cash and spending",
      desc:
        burn > 0
          ? `You have ${inr(cash)} in the bank and spend ${inr(burn)} a month, which gives about ${runway} months of runway.`
          : cash > 0
          ? `You have ${inr(cash)} in the bank. No monthly spending has been entered, so runway can't be calculated.`
          : "No cash balance has been entered.",
    });
    if (args.openTasks !== null) {
      signals.push({
        title: "Tasks",
        desc: `${args.openTasks} open ${args.openTasks === 1 ? "task" : "tasks"}${
          args.doneTasks !== null ? ` and ${args.doneTasks} completed` : ""
        }.`,
      });
    }
    if (teamSize > 0 && annualRevenue > 0) {
      signals.push({
        title: "Revenue per team member",
        desc: `${inr(annualRevenue / teamSize)} a year across ${teamSize} ${teamSize === 1 ? "person" : "people"}.`,
      });
    }

    if (runwayNum !== null && runwayNum < 6) {
      risks.push({
        title: "Cash is running low",
        severity: "High",
        desc: `Runway is ${runway} months, below the 6-month safety level. Cutting costs or raising cash should come first.`,
      });
      suggestedDecisions.push({
        id: "auto-extend-runway",
        title: "Extend your cash runway",
        category: "finance",
        recommendation: "Review non-essential monthly costs and chase any unpaid invoices.",
        impact: "Brings runway back above 6 months.",
      });
    } else if (runwayNum !== null && runwayNum < 12) {
      risks.push({
        title: "Runway is under a year",
        severity: "Medium",
        desc: `Runway is ${runway} months. A buffer of 12 months or more is safer.`,
      });
    }

    if (monthlyRevenue > 0 && burn > monthlyRevenue) {
      risks.push({
        title: "Spending is higher than income",
        severity: "High",
        desc: `You spend ${inr(burn)} a month against ${inr(monthlyRevenue)} of revenue, a gap of ${inr(burn - monthlyRevenue)} each month.`,
      });
      suggestedDecisions.push({
        id: "auto-cut-costs",
        title: "Bring monthly costs below revenue",
        category: "finance",
        recommendation: `Find about ${inr(burn - monthlyRevenue)} a month in savings or extra revenue.`,
        impact: "Stops cash from falling each month.",
      });
    }

    if (args.openTasks !== null && args.openTasks > 10) {
      risks.push({
        title: "Many open tasks",
        severity: "Medium",
        desc: `${args.openTasks} tasks are still open. Consider closing or delegating some.`,
      });
      suggestedDecisions.push({
        id: "auto-clear-tasks",
        title: "Clear or delegate open tasks",
        category: "operations",
        recommendation: "Review the task list and close, delegate or drop tasks that no longer matter.",
        impact: "Keeps the team focused on what matters.",
      });
    }

    if (monthlyRevenue > 0 && burn > 0 && monthlyRevenue > burn) {
      opportunities.push({
        title: "Income is higher than spending",
        desc: `You earn ${inr(monthlyRevenue - burn)} more than you spend each month. Decide how much to keep as a buffer and how much to put into growth.`,
      });
    }
    if (runwayNum !== null && runwayNum >= 12) {
      opportunities.push({
        title: "Strong cash buffer",
        desc: `With ${runway} months of runway you have room to test a hire, a price change or a marketing push. Try the Decision simulator.`,
      });
    }
  }

  return {
    id: `brief-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    healthScore: hasData ? health.overall : 0,
    healthLabel,
    annualRevenue,
    monthlyRevenue,
    cash,
    burn,
    runway,
    teamSize,
    revenuePerHead: teamSize > 0 ? Math.round(annualRevenue / teamSize) : 0,
    openTasks: args.openTasks,
    doneTasks: args.doneTasks,
    hasData,
    signals,
    risks,
    opportunities,
    suggestedDecisions,
  };
}
