"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { Panel, PanelToolbar, primaryButton, secondaryButton, th, td, inputClass, labelClass } from "./ui";

interface EvalRow {
  id: string;
  agent_id: string;
  version: string;
  suite: "golden" | "redteam";
  passed: number;
  score: number | null;
  detail: string | null;
  created_at: string;
}

export function AgentEvaluationsSection({ notify }: { notify: (msg: string) => void }) {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [version, setVersion] = useState("1.0");
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState("");
  const [suite, setSuite] = useState<"golden" | "redteam">("golden");
  const [passed, setPassed] = useState(true);
  const [score, setScore] = useState("100");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent-evaluations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const list = Array.isArray(data.agents) ? data.agents : [];
        setAgents(list);
        if (list.length > 0 && !agentId) setAgentId(list[0].id);
        if (data.version) setVersion(data.version);
        setRows(Array.isArray(data.evaluations) ? data.evaluations : []);
      }
    } catch {}
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/agent-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          suite,
          passed,
          version,
          score: score.trim() ? Number(score) : null,
          detail: detail.trim() || `Recorded via Superadmin (${suite})`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        notify(data.error || "Could not record evaluation.");
      } else {
        notify(`Recorded ${suite} evaluation for ${agentId}.`);
        setDetail("");
        await load();
      }
    } catch {
      notify("Network error recording evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">Agent release evaluations (G1 / G2)</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Record and audit golden-set quality and red-team safety checks for autonomous agents.
          </p>
        </div>
        <button type="button" onClick={load} className={secondaryButton}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <Panel>
        <div className="p-5 border-b border-line">
          <form onSubmit={submitEval} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className={labelClass}>Agent</label>
              <select
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                className={inputClass}
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Suite</label>
              <select
                value={suite}
                onChange={e => setSuite(e.target.value as "golden" | "redteam")}
                className={inputClass}
              >
                <option value="golden">G1 Golden Set</option>
                <option value="redteam">G2 Red Team</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Result</label>
              <select
                value={passed ? "pass" : "fail"}
                onChange={e => setPassed(e.target.value === "pass")}
                className={inputClass}
              >
                <option value="pass">Passed</option>
                <option value="fail">Failed</option>
              </select>
            </div>
            <button type="submit" disabled={submitting || !agentId} className={primaryButton}>
              {submitting ? "Recording…" : "Record check"}
            </button>
            <div className="sm:col-span-1">
              <label className={labelClass}>Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={e => setScore(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-4">
              <label className={labelClass}>Notes / audit detail</label>
              <input
                type="text"
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="e.g. Verified 25 benchmark scenarios with zero hallucinated figures"
                className={inputClass}
              />
            </div>
          </form>
        </div>

        <PanelToolbar>
          <p className="text-sm text-text-muted">{rows.length} recent evaluation records (version {version})</p>
        </PanelToolbar>

        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-muted">No agent evaluations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Agent</th>
                  <th className={th}>Suite</th>
                  <th className={th}>Version</th>
                  <th className={th}>Result</th>
                  <th className={th}>Detail</th>
                  <th className={th}>Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className={`${td} font-medium text-text`}>{r.agent_id}</td>
                    <td className={`${td} text-text-muted`}>{r.suite === "golden" ? "G1 Golden Set" : "G2 Red Team"}</td>
                    <td className={`${td} text-text-muted`}>{r.version}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.passed ? "text-jade" : "text-rust"}`}>
                        {r.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        {r.passed ? "Passed" : "Failed"}
                        {r.score !== null ? ` (${r.score})` : ""}
                      </span>
                    </td>
                    <td className={`${td} text-text-muted max-w-xs truncate`}>{r.detail || "—"}</td>
                    <td className={`${td} text-text-muted whitespace-nowrap`}>
                      {new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
