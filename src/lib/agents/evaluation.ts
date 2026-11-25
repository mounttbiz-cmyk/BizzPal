import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getBrief } from "@/lib/brief";
import { ACTIONS, actionById, authorize, decideApproval } from "@/lib/platform/policy";

/**
 * The checks an agent must pass before it can be switched on, run by BizzPal itself every time the owner presses
 * "Run checks". Nothing here asks the AI: both tests exercise the real server code that will guard the agent.
 *
 * Quality test (G1): the agent has what it needs to do useful, correct work for this business. It writes only from
 *   the business brief, so the brief must say what the business sells and who buys it, and there must be at least
 *   one action it can carry out today.
 *
 * Safety test (G2): BizzPal's guardrails are attacked the way a misbehaving agent would, inside a throwaway sandbox
 *   business, and every attack must be blocked: high-impact actions, actions in another system without approval,
 *   using an approval for something else, using it twice, using it after it expired, and actions that do not exist.
 *   The sandbox's rows are removed afterwards.
 */

/** Actions that run inside BizzPal itself, so they work without any outside connection. */
export const IN_APP_ACTIONS = ["brief.read", "tasks.list", "message.draft", "tasks.create_internal"];

/** The brief answers an agent cannot work without. */
const ESSENTIAL_BRIEF = [
  { key: "offering", label: "what you sell" },
  { key: "customers", label: "who your customers are" },
];

export interface TestResult {
  passed: boolean;
  detail: string;
  /** What the owner can do to make it pass */
  fix?: "brief";
}

export function qualityTest(agentTools: string[], businessId: string): TestResult {
  let brief: ReturnType<typeof getBrief> | null = null;
  try {
    brief = getBrief(businessId);
  } catch {}
  const missing = ESSENTIAL_BRIEF.filter(f => !String(brief?.values?.[f.key]?.value || "").trim());
  if (missing.length) {
    return {
      passed: false,
      detail: `The agent writes only from your business brief, and it does not yet say ${missing.map(m => m.label).join(" or ")}.`,
      fix: "brief",
    };
  }
  const usable = agentTools.filter(t => IN_APP_ACTIONS.includes(t));
  if (usable.length === 0) return { passed: false, detail: "It has no action it can carry out yet." };
  return { passed: true, detail: `Your business brief is ready, and it can carry out ${usable.length} actions inside BizzPal today.` };
}

export function safetyTest(agentTools: string[]): TestResult {
  const sandbox = `eval_${randomBytes(8).toString("hex")}`;
  const actor = "bizzpal-safety-test";
  const traceId = `trc_eval_${randomBytes(6).toString("hex")}`;
  const failures: string[] = [];
  let attacks = 0;
  const expect = (ok: boolean, what: string) => {
    attacks++;
    if (!ok) failures.push(what);
  };
  const ask = (action: string, payload: unknown, approvalId: string | null = null, target = "lead L-1") =>
    authorize({ businessId: sandbox, action, target, payload, actor, traceId, approvalId });

  try {
    // 1. It is never allowed a high-impact action, even if one were added to its list
    expect(!agentTools.some(t => actionById(t)?.tier === "T3"), "its list includes a high-impact action");
    for (const a of ACTIONS.filter(x => x.tier === "T3")) expect(ask(a.id, { amount: 50000 }).outcome === "deny", `${a.label} was not refused`);

    // 2. Actions that do not exist are refused
    expect(ask("bank.transfer_all", {}).outcome === "deny", "an unknown action was not refused");

    // 3. An action in another system needs an approval for exactly that action. Probe with the agent's own
    //    approval-gated actions, or the CRM update when it has none: the same guard covers every one.
    const gated = agentTools.filter(t => actionById(t)?.tier === "T2");
    for (const action of gated.length ? gated : ["crm.update_lead"]) {
      const payload = { leadId: "L-1", note: "Follow up" };
      const first = ask(action, payload);
      expect(first.outcome === "approval_required", `${action} ran without an approval`);
      if (first.outcome !== "approval_required") continue;

      expect(ask(action, payload, first.approvalId).outcome === "deny", `${action} ran before it was approved`);
      decideApproval(sandbox, first.approvalId, "approve", actor);
      expect(ask(action, { ...payload, note: "Offer a 50% discount" }, first.approvalId).outcome === "deny", `${action} ran with a changed message`);
      expect(ask(action, payload, first.approvalId, "lead L-2").outcome === "deny", `${action} ran for a different customer`);
      expect(ask(action, payload, first.approvalId).outcome === "allow", `${action} did not run after a correct approval`);
      expect(ask(action, payload, first.approvalId).outcome === "deny", `${action} ran twice on one approval`);

      const second = ask(action, payload);
      if (second.outcome === "approval_required") {
        decideApproval(sandbox, second.approvalId, "approve", actor);
        db.prepare("UPDATE approvals SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), second.approvalId);
        expect(ask(action, payload, second.approvalId).outcome === "deny", `${action} ran on an expired approval`);
      }
    }
  } catch (err) {
    failures.push(`the test could not finish (${(err as Error)?.message || "error"})`);
  } finally {
    for (const table of ["approvals", "audit_events"]) {
      try {
        db.prepare(`DELETE FROM ${table} WHERE business_id = ?`).run(sandbox);
      } catch {}
    }
  }

  return failures.length
    ? { passed: false, detail: `${failures.length} of ${attacks} attacks got through: ${failures.slice(0, 2).join("; ")}.` }
    : { passed: true, detail: `All ${attacks} attempts to break the guardrails were blocked.` };
}
