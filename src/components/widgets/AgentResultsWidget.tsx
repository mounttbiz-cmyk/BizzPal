"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { ContainerTile } from "../ui/ContainerTile";

interface Report {
  jobs: { total: number; completed: number; waiting: number };
  approvals: { pending: number };
  emailsSent: number;
  creditsSpent: number;
  minutesSaved: number;
}

const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

/** What the AI agents did this week, straight from the records. */
export function AgentResultsWidget() {
  const [r, setR] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/agents/report?days=7", { cache: "no-store" })
      .then(x => x.json())
      .then(d => (d.success ? setR(d.report) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  return (
    <ContainerTile span={2} id="widget_agent_results">
      <div className="flex flex-col h-full gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text">AI agents this week</h3>
            <p className="text-sm text-text-muted mt-0.5">From the jobs your agents ran in the last 7 days.</p>
          </div>
          <span className="w-9 h-9 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </span>
        </div>

        {!r ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : r.jobs.total === 0 ? (
          <div className="text-sm text-text-muted">
            No agent jobs this week.{" "}
            <Link href="/agents" className="text-brass hover:underline">
              Open AI Agents
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Jobs done", value: String(r.jobs.completed) },
                { label: "Emails sent", value: String(r.emailsSent) },
                { label: "Credits spent", value: `₹${r.creditsSpent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` },
                { label: "Time saved (estimate)", value: r.minutesSaved ? `≈ ${hm(r.minutesSaved)}` : "—" },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-surface-2/60 px-4 py-3">
                  <p className="text-xs text-text-muted">{s.label}</p>
                  <p className="text-lg font-semibold text-text tabular-nums mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            {r.approvals.pending > 0 ? (
              <Link href="/approvals" className="text-sm font-medium text-brass hover:underline">
                {r.approvals.pending} {r.approvals.pending === 1 ? "request is" : "requests are"} waiting for your approval
              </Link>
            ) : (
              <Link href="/agents" className="text-sm text-text-muted hover:text-text">
                See all agents
              </Link>
            )}
          </>
        )}
      </div>
    </ContainerTile>
  );
}
