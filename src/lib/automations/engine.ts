/**
 * Checks an automation rule against the business's real numbers.
 * It only reports what it can actually measure. Anything that needs a connected
 * tool (invoices, payments, email) is reported as "not checked", never invented.
 */

export type RunStatus = "success" | "triggered" | "warning";

export interface RunResult {
  status: RunStatus;
  detail: string;
  /** When set, a real task should be created because the condition was met. */
  task?: { title: string; priority: "high" | "medium"; gap: string };
}

export interface RunContext {
  profile: any | null;
  openTasks: number | null;
  gapCount?: number | null;
}

export interface RunLog {
  id: string;
  automationId: string;
  automationName: string;
  status: RunStatus;
  /** ISO timestamp of the real run */
  at: string;
  detail: string;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function numberFrom(text: string, pattern: RegExp, fallback: number): number {
  const m = text.match(pattern);
  return m ? Number(m[1]) : fallback;
}

export function runAutomation(rule: { name: string; trigger: string; action: string }, ctx: RunContext): RunResult {
  const text = `${rule.name} ${rule.trigger}`.toLowerCase();
  const p = ctx.profile || {};
  const cash = Number(p.cash || p.cashOnHand || 0);
  const burn = Number(p.burn || p.monthlyBurn || p.monthlyNetBurn || 0);
  const revenue = Number(p.revenue || p.monthlyRevenue || 0);
  const hasFinance = cash > 0 || burn > 0 || revenue > 0;

  // Cash runway
  if (text.includes("runway")) {
    if (!hasFinance || burn <= 0) {
      return {
        status: "warning",
        detail: "Not checked: add your cash and monthly costs (Quick business input) so runway can be measured.",
      };
    }
    const runway = cash / burn;
    const limit = numberFrom(text, /(\d+(?:\.\d+)?)\s*months?/, 6);
    if (runway < limit) {
      return {
        status: "triggered",
        detail: `Runway is ${runway.toFixed(1)} months (${inr(cash)} cash, ${inr(burn)} spent a month). That is below the ${limit}-month limit.`,
        task: { title: `Runway is ${runway.toFixed(1)} months: ${rule.action}`, priority: "high", gap: "Runway & Risk" },
      };
    }
    return {
      status: "success",
      detail: `Runway is ${runway.toFixed(1)} months (${inr(cash)} cash, ${inr(burn)} spent a month). Above the ${limit}-month limit, so nothing to do.`,
    };
  }

  // Spending versus income
  if (text.includes("burn") || text.includes("spend") || text.includes("expense")) {
    if (!hasFinance) {
      return { status: "warning", detail: "Not checked: add your revenue and monthly costs first." };
    }
    if (revenue > 0 && burn > revenue) {
      return {
        status: "triggered",
        detail: `You spend ${inr(burn)} a month against ${inr(revenue)} of revenue, so spending is higher than income.`,
        task: { title: `Spending is above revenue: ${rule.action}`, priority: "high", gap: "Cost control" },
      };
    }
    return {
      status: "success",
      detail: `You spend ${inr(burn)} a month against ${inr(revenue)} of revenue. Spending is within income.`,
    };
  }

  // Workload / tasks
  if (text.includes("task") || text.includes("workload") || text.includes("bottleneck")) {
    if (ctx.openTasks === null) return { status: "warning", detail: "Not checked: could not load your tasks." };
    const limit = numberFrom(text, /[>≥]\s*(\d+)|more than (\d+)|over (\d+)/, 5);
    if (ctx.openTasks > limit) {
      return {
        status: "triggered",
        detail: `You have ${ctx.openTasks} open tasks, which is more than the limit of ${limit}.`,
        task: { title: `${ctx.openTasks} open tasks: ${rule.action}`, priority: "medium", gap: "Workload" },
      };
    }
    return { status: "success", detail: `You have ${ctx.openTasks} open tasks, within the limit of ${limit}.` };
  }

  // Summaries / digests
  if (text.includes("briefing") || text.includes("digest") || text.includes("check-in") || text.includes("summary")) {
    const parts: string[] = [];
    if (hasFinance) {
      parts.push(`revenue ${inr(revenue)} a month`);
      if (burn > 0) parts.push(`runway ${(cash / burn).toFixed(1)} months`);
    }
    if (ctx.openTasks !== null) parts.push(`${ctx.openTasks} open tasks`);
    if (typeof ctx.gapCount === "number") parts.push(`${ctx.gapCount} gaps to review`);
    return {
      status: "success",
      detail: parts.length
        ? `Summary prepared: ${parts.join(", ")}. It is shown here; sending it by email or WhatsApp needs those tools connected.`
        : "Nothing to summarise yet. Add your numbers with Quick business input.",
    };
  }

  // Needs a connected tool
  if (/invoice|receivable|payment|stripe|webhook|gst|tax|client|customer|revenue share|concentration|email|outreach|lead/.test(text)) {
    return {
      status: "warning",
      detail: "Not checked: this rule needs data from a connected tool (accounting, payments or CRM). Connect one in Integrations.",
    };
  }

  return {
    status: "warning",
    detail: "Saved, but this condition can't be measured automatically yet. Nothing was checked.",
  };
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "Never";
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 45) return "Just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
