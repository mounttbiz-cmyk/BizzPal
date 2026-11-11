"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { runAutomation, timeAgo } from "@/lib/automations/engine";

interface PipelineStage {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6;
  stageName: "Trigger (Event)" | "Retrieve Relevant Data" | "AI Reasoning & Rules" | "Action / Approval" | "Update Records" | "Monitor Outcome";
  title: string;
  subtitle: string;
  telemetryData: string;
  icon: string;
  status: "idle" | "running" | "completed" | "requires_approval";
  badgeColor: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  category: "sales" | "finance" | "retention" | "operations" | "outreach";
  status: "active" | "paused";
  executionsCount: number;
  successRate: string;
  lastRun: string;
  stages: PipelineStage[];
}

const DEFAULT_WORKFLOWS: WorkflowItem[] = [
  {
    id: "wf_bulk_email_100",
    name: "Autonomous 100-Lead Batch Email Outreach & Engagement Engine",
    description: "Ingests 100 verified target leads → enriches firmographics → Marketing drafts hyper-personalized copy per recipient → spam guard audit & 1-click batch dispatch (20/min throttled) → syncs CRM status → tracks opens, replies & booked meetings in real time.",
    category: "outreach",
    status: "active",
    executionsCount: 52,
    successRate: "98.4%",
    lastRun: "24m ago",
    stages: [
      {
        stepNumber: 1,
        stageName: "Trigger (Event)",
        title: "100-Lead Cohort Ingested",
        subtitle: "CSV lead list or Apollo/HubSpot webhook pushes batch of 100 prospective contacts",
        telemetryData: "Payload: 100 lead profiles (Founders, CFOs, VPs) ingested with verified work emails.",
        icon: "users",
        status: "completed",
        badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      },
      {
        stepNumber: 2,
        stageName: "Retrieve Relevant Data",
        title: "Firmographic & Signal Enrichment",
        subtitle: "Scrape company ARR, hiring velocity, tech stack, and recent funding rounds for each recipient",
        telemetryData: "100/100 records enriched with LinkedIn & Clearbit telemetry. 0 dead mailboxes.",
        icon: "search",
        status: "completed",
        badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      },
      {
        stepNumber: 3,
        stageName: "AI Reasoning & Rules",
        title: "1-to-1 AI Personalization & Spam Guard",
        subtitle: "Marketing writes bespoke icebreakers & value propositions; runs MX/DKIM spam-score check",
        telemetryData: "100 distinct tailored emails synthesized. Average spam vulnerability score: 0.1/10 (Safe Deliverability).",
        icon: "brain",
        status: "completed",
        badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      },
      {
        stepNumber: 4,
        stageName: "Action / Approval",
        title: "Batch Approval & Throttled Dispatch",
        subtitle: "Founder/Executive 1-click approval initiates staggered email sending via SendGrid/SES (20 emails every 3 mins)",
        telemetryData: "Batch approved. Throttled dispatch engaged across verified warm domain pool to safeguard reputation.",
        icon: "mail",
        status: "completed",
        badgeColor: "text-brass bg-brass/10 border-brass/20",
      },
      {
        stepNumber: 5,
        stageName: "Update Records",
        title: "CRM Sync & Lead State Transition",
        subtitle: "Update HubSpot/Salesforce status to 'Cold Outreach Dispatched' with timestamp & copy preview",
        telemetryData: "100 CRM records transitioned to 'Outreach Sent'. Follow-up reminder task registered.",
        icon: "database",
        status: "completed",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        stepNumber: 6,
        stageName: "Monitor Outcome",
        title: "Open, Click & Calendar Booking Telemetry",
        subtitle: "Listen for real-time webhooks (opens, clicks, positive replies, Cal.com bookings); auto-route hot leads to AE",
        telemetryData: "Telemetry active: 62% open rate, 24% click-through, 9 demo calls scheduled within 48 hours.",
        icon: "target",
        status: "running",
        badgeColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      },
    ],
  },
  {
    id: "wf_lead_qualification",
    name: "Enterprise Inbound Lead Auto-Qualification & Executive Dispatch",
    description: "Inbound demo request → retrieve company firmographics → Marketing & Sales score ICP → route enterprise deals with human AE signoff → update CRM → monitor reply SLA.",
    category: "sales",
    status: "active",
    executionsCount: 184,
    successRate: "99.1%",
    lastRun: "8m ago",
    stages: [
      {
        stepNumber: 1,
        stageName: "Trigger (Event)",
        title: "Inbound Webhook Received",
        subtitle: "Enterprise demo request submitted on pricing page",
        telemetryData: "Payload: { domain: 'techcorp.io', teamSize: '120', requestedTier: 'Enterprise' }",
        icon: "zap",
        status: "completed",
        badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      },
      {
        stepNumber: 2,
        stageName: "Retrieve Relevant Data",
        title: "Firmographic & Revenue Enrichment",
        subtitle: "Query Clearbit & LinkedIn telemetry for ARR estimate & tech stack",
        telemetryData: "Matched: Series B ARR ₹35Cr+, 140 FTE, Using Segment + HubSpot",
        icon: "search",
        status: "completed",
        badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      },
      {
        stepNumber: 3,
        stageName: "AI Reasoning & Rules",
        title: "ICP Scoring & Deal Structuring",
        subtitle: "Marketing evaluates fit score & suggested ACV",
        telemetryData: "Score: 94/100 (Tier 1 ICP). Recommended contract ACV: ₹8,50,000/yr",
        icon: "brain",
        status: "completed",
        badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      },
      {
        stepNumber: 4,
        stageName: "Action / Approval",
        title: "AE Assignment & Custom Deck Dispatch",
        subtitle: "Assign Senior AE & send personalized executive briefing",
        telemetryData: "Assigned: Rahul S. (Sr AE). Executive email personalized with benchmark deck.",
        icon: "user",
        status: "completed",
        badgeColor: "text-brass bg-brass/10 border-brass/20",
      },
      {
        stepNumber: 5,
        stageName: "Update Records",
        title: "CRM Stage & Task Sync",
        subtitle: "Sync new opportunity to HubSpot CRM & seed follow-up in /tasks",
        telemetryData: "HubSpot Deal #4092 created. Task: 'Execute Demo with VP of Product' logged.",
        icon: "database",
        status: "completed",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        stepNumber: 6,
        stageName: "Monitor Outcome",
        title: "SLA Response Tracking",
        subtitle: "Monitor 24-hour reply telemetry and calendar booking completion",
        telemetryData: "Calendar link viewed 2x. Awaiting 48h checkpoint.",
        icon: "chart",
        status: "running",
        badgeColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      },
    ],
  },
  {
    id: "wf_solvency_guard",
    name: "CFO Solvency Alarm & Discretionary Burn Freeze",
    description: "Net burn spike (>12% MoM) → retrieve banking & ledger feeds → CFO root cause audit → founder 1-click approval → freeze unapproved vendors → monitor runway recovery.",
    category: "finance",
    status: "active",
    executionsCount: 29,
    successRate: "100%",
    lastRun: "1h ago",
    stages: [
      {
        stepNumber: 1,
        stageName: "Trigger (Event)",
        title: "Daily Burn Deviation Alert",
        subtitle: "Monthly run-rate projected burn exceeded ₹2,50,000 threshold",
        telemetryData: "Projected burn: ₹2,68,000 (+14.2% MoM drift). Runway delta: -1.4 months",
        icon: "alert",
        status: "completed",
        badgeColor: "text-rust bg-rust/10 border-rust/20",
      },
      {
        stepNumber: 2,
        stageName: "Retrieve Relevant Data",
        title: "Pull Discretionary SaaS & Cloud Ledger",
        subtitle: "Extract all vendor line items & compare with 90-day usage logs",
        telemetryData: "Scanned 28 vendor transactions. Identified 3 inactive tools costing ₹65,000/mo.",
        icon: "chart",
        status: "completed",
        badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      },
      {
        stepNumber: 3,
        stageName: "AI Reasoning & Rules",
        title: "Solvency Reasoning",
        subtitle: "Simulate cash reserve preservation and draft remediation directive",
        telemetryData: "Directive: Deprecate redundant seats; recover ₹7.8L annualized; preserve 15.2mo runway.",
        icon: "brain",
        status: "completed",
        badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      },
      {
        stepNumber: 4,
        stageName: "Action / Approval",
        title: "Founder 1-Click Approval Request",
        subtitle: "Route decision to Executive Briefing & Slack #executive-boardroom",
        telemetryData: "Directives dispatched to /reports. Status: Ready for founder signoff.",
        icon: "pen",
        status: "completed",
        badgeColor: "text-brass bg-brass/10 border-brass/20",
      },
      {
        stepNumber: 5,
        stageName: "Update Records",
        title: "Ledger Flag & Vendor Notification",
        subtitle: "Tag expenses in ledger & queue auto-cancellation notice",
        telemetryData: "Records updated in Quickbooks. Notification scheduled for billing contact.",
        icon: "database",
        status: "completed",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        stepNumber: 6,
        stageName: "Monitor Outcome",
        title: "Runway Recovery Telemetry",
        subtitle: "Verify savings reflected in next bank sync and update Solvency Index",
        telemetryData: "Solvency Index benchmark recalculated to 84/100 (+4 pts).",
        icon: "target",
        status: "completed",
        badgeColor: "text-jade bg-jade/10 border-jade/20",
      },
    ],
  },
  {
    id: "wf_payment_rescue",
    name: "Payment Failure & VIP Customer Retention Rescue",
    description: "Stripe invoice failure → retrieve customer lifetime value & usage → evaluate churn risk → dispatch personalized retention outreach → sync ledger → monitor recovery.",
    category: "retention",
    status: "active",
    executionsCount: 68,
    successRate: "97.4%",
    lastRun: "Yesterday",
    stages: [
      {
        stepNumber: 1,
        stageName: "Trigger (Event)",
        title: "Payment Gateway Failure Webhook",
        subtitle: "Stripe webhook: Invoice #INV-8821 payment failed (Card expired)",
        telemetryData: "Amount: ₹1,20,000. Customer: Global Logistics (Tier-1 VIP).",
        icon: "alert",
        status: "completed",
        badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      },
      {
        stepNumber: 2,
        stageName: "Retrieve Relevant Data",
        title: "Customer Profile & Telemetry Fetch",
        subtitle: "Check customer ARR, historical health score, and key stakeholder",
        telemetryData: "LTV: ₹14,40,000. Account NPS: 9/10. Primary contact: CTO.",
        icon: "search",
        status: "completed",
        badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      },
      {
        stepNumber: 3,
        stageName: "AI Reasoning & Rules",
        title: "Risk Assessment & Playbook Selection",
        subtitle: "Determine whether to auto-retry, send soft nudge, or alert AE",
        telemetryData: "VIP tier requires high-touch white-glove billing link with grace period extension.",
        icon: "brain",
        status: "completed",
        badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      },
      {
        stepNumber: 4,
        stageName: "Action / Approval",
        title: "White-Glove Payment Link Dispatch",
        subtitle: "Send customized WhatsApp & email link with 7-day service extension",
        telemetryData: "Dispatch completed via SendGrid. VIP grace period extended by 7 days.",
        icon: "mail",
        status: "completed",
        badgeColor: "text-brass bg-brass/10 border-brass/20",
      },
      {
        stepNumber: 5,
        stageName: "Update Records",
        title: "Stripe & CRM Status Tagging",
        subtitle: "Update account status to 'Grace Period Active' in CRM & finance sheets",
        telemetryData: "Account flagged in ledger. Account Executive CC'd on resolution thread.",
        icon: "database",
        status: "completed",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        stepNumber: 6,
        stageName: "Monitor Outcome",
        title: "Payment Settlement Verification",
        subtitle: "Listen for charge.succeeded webhook and close retention ticket",
        telemetryData: "Awaiting customer settlement. 0 churn recorded in cohort.",
        icon: "target",
        status: "completed",
        badgeColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      },
    ],
  },
];

interface WorkflowRun {
  id: string;
  workflowId: string;
  at: string;
  status: "success" | "triggered" | "warning";
  outputs: string[];
}

interface LeadCheck {
  total: number;
  valid: string[];
  invalid: number;
  duplicates: number;
}

const RUNS_KEY = "bizzpal_workflow_runs";
const EMAIL_RE = /[^\s,;"'<>]+@[^\s,;"'<>]+\.[a-z]{2,}/i;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function checkLeads(text: string): LeadCheck {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  let invalid = 0;
  let duplicates = 0;
  let total = 0;
  lines.forEach((line, i) => {
    // skip a header row (first line with no email in it)
    if (i === 0 && !EMAIL_RE.test(line)) return;
    total += 1;
    const m = line.match(EMAIL_RE);
    if (!m) {
      invalid += 1;
      return;
    }
    const email = m[0].toLowerCase();
    if (seen.has(email)) {
      duplicates += 1;
      return;
    }
    seen.add(email);
    valid.push(email);
  });
  return { total, valid, invalid, duplicates };
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(DEFAULT_WORKFLOWS);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(DEFAULT_WORKFLOWS[0].id);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowCategory, setNewWorkflowCategory] = useState<"sales" | "finance" | "operations" | "retention">("sales");

  // Lead list checker (Batch outreach)
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [leadText, setLeadText] = useState("");
  const [leadFile, setLeadFile] = useState<string | null>(null);
  const [leadCheck, setLeadCheck] = useState<LeadCheck | null>(null);

  // Load saved workflows and real run history after the page loads
  useEffect(() => {
    try {
      const cached = localStorage.getItem("bizzpal_workflows");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setWorkflows(parsed);
      }
      const savedRuns = localStorage.getItem(RUNS_KEY);
      if (savedRuns) {
        const parsed = JSON.parse(savedRuns);
        if (Array.isArray(parsed)) setRuns(parsed);
      }
    } catch {}
  }, []);

  const activeWorkflow = workflows.find(w => w.id === selectedWorkflowId) || workflows[0];
  const runsFor = (id: string) => runs.filter(r => r.workflowId === id);
  const lastRun = runsFor(activeWorkflow.id)[0];

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows(prev => {
      const updated: WorkflowItem[] = prev.map(w =>
        w.id === id ? { ...w, status: (w.status === "active" ? "paused" : "active") as "active" | "paused" } : w
      );
      try {
        localStorage.setItem("bizzpal_workflows", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Runs the workflow against the business's real numbers and tasks
  const handleRunWorkflow = async () => {
    if (!activeWorkflow) return;
    setRunning(true);

    let profile: any = null;
    try {
      const raw = localStorage.getItem("bizzpal_business_profile");
      if (raw) profile = JSON.parse(raw);
    } catch {}

    let openTasks: number | null = null;
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) openTasks = data.tasks.filter((t: any) => t.status !== "done").length;
    } catch {}

    let connectedTools = 0;
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.success && Array.isArray(data.connectedTools)) connectedTools = data.connectedTools.length;
    } catch {}

    const cash = Number(profile?.cash || profile?.cashOnHand || 0);
    const burn = Number(profile?.burn || profile?.monthlyBurn || 0);
    const revenue = Number(profile?.revenue || profile?.monthlyRevenue || 0);

    // The review step uses the same real checks as Automations
    const result = runAutomation(
      {
        name: activeWorkflow.name,
        trigger: `${activeWorkflow.description} ${activeWorkflow.category}`,
        action: `Follow up on "${activeWorkflow.name}"`,
      },
      { profile, openTasks }
    );

    let taskNote = "No action needed.";
    if (result.task) {
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[Workflow] ${result.task.title}`,
            owner: "Founder",
            priority: result.task.priority,
            gap: result.task.gap,
          }),
        });
        taskNote = `Added a task to your task list: "${result.task.title}".`;
      } catch {
        taskNote = "Wanted to add a task, but your task list could not be reached.";
      }
    }

    const dataLine =
      cash || burn || revenue
        ? `Revenue ${inr(revenue)} a month, cash ${inr(cash)}${burn > 0 ? `, runway ${(cash / burn).toFixed(1)} months` : ""}. ${
            openTasks === null ? "Tasks unavailable." : `${openTasks} open tasks.`
          } ${connectedTools} connected tool${connectedTools === 1 ? "" : "s"}.`
        : `No business numbers added yet. ${openTasks === null ? "" : `${openTasks} open tasks.`} ${connectedTools} connected tool${
            connectedTools === 1 ? "" : "s"
          }.`;

    const run: WorkflowRun = {
      id: `run-${Date.now()}`,
      workflowId: activeWorkflow.id,
      at: new Date().toISOString(),
      status: result.status,
      outputs: [
        `Started by you on ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`,
        dataLine.trim(),
        result.detail,
        taskNote,
        "Saved to this workflow's run history.",
        "Runs only when you start it. Automatic runs need a connected tool (see Integrations).",
      ],
    };

    setRuns(prev => {
      const updated = [run, ...prev].slice(0, 200);
      try {
        localStorage.setItem(RUNS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setRunning(false);
    notify(result.task ? "Run finished. A task was added to your task list." : "Run finished.");
  };

  const handleLeadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify("Please choose a file under 2MB.");
      return;
    }
    const text = await file.text();
    setLeadFile(file.name);
    setLeadText(text);
    setLeadCheck(checkLeads(text));
  };

  const downloadCleanLeads = () => {
    if (!leadCheck) return;
    const csv = ["email", ...leadCheck.valid].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clean-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createOutreachTask = async () => {
    if (!leadCheck || leadCheck.valid.length === 0) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Outreach] Contact ${leadCheck.valid.length} checked leads${leadFile ? ` from ${leadFile}` : ""}`,
          owner: "Founder",
          priority: "medium",
          gap: "Sales outreach",
        }),
      });
      notify(`Task added: contact ${leadCheck.valid.length} leads.`);
      setIsBatchOpen(false);
    } catch {
      notify("Could not add the task. Please try again.");
    }
  };

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    const stageTemplates: Array<[PipelineStage["stageName"], string, string]> = [
      ["Trigger (Event)", "Start", "You start this workflow, or a connected tool starts it"],
      ["Retrieve Relevant Data", "Get your numbers", "Reads your business numbers, tasks and connected tools"],
      ["AI Reasoning & Rules", "Check the rules", "Compares your numbers with the rules for this area"],
      ["Action / Approval", "Act or ask you", "Adds a task for you when something needs attention"],
      ["Update Records", "Save the result", "Keeps a history of every run"],
      ["Monitor Outcome", "Follow up", "Runs again when you start it"],
    ];
    const newWf: WorkflowItem = {
      id: `wf_${Date.now()}`,
      name: newWorkflowName.trim(),
      description: `A ${newWorkflowCategory} workflow created by you.`,
      category: newWorkflowCategory,
      status: "active",
      executionsCount: 0,
      successRate: "",
      lastRun: "",
      stages: stageTemplates.map(([stageName, title, subtitle], i) => ({
        stepNumber: (i + 1) as PipelineStage["stepNumber"],
        stageName,
        title,
        subtitle,
        telemetryData: "",
        icon: "zap",
        status: "idle",
        badgeColor: "",
      })),
    };
    setWorkflows(prev => {
      const updated = [newWf, ...prev];
      try {
        localStorage.setItem("bizzpal_workflows", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedWorkflowId(newWf.id);
    setIsCreateModalOpen(false);
    setNewWorkflowName("");
  };

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Workflows</h1>
          <p className="text-sm text-text-muted mt-1">
            Multi-step processes that check your real numbers and tell you what needs attention.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
          >
            Check a lead list
          </button>
          <button
            type="button"
            onClick={handleRunWorkflow}
            disabled={running}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
          >
            {running ? "Running…" : "Run now"}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New workflow
          </button>
        </div>
      </div>

      {toast && <p className="px-4 py-3 rounded-xl bg-surface-2 text-sm text-text">{toast}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 space-y-3">
          {workflows.map(wf => {
            const isSelected = wf.id === selectedWorkflowId;
            const wfRuns = runsFor(wf.id);
            return (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-colors ${
                  isSelected ? "border-line-strong bg-surface-2" : "border-line bg-surface hover:bg-surface-2/60"
                } ${wf.status === "paused" ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text leading-snug">{wf.name}</h3>
                    <p className="text-xs text-text-muted mt-1">
                      <span className="capitalize">{wf.category}</span> · {wfRuns.length === 0 ? "Not run yet" : `Run ${wfRuns.length} ${wfRuns.length === 1 ? "time" : "times"}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleWorkflowStatus(wf.id);
                    }}
                    role="switch"
                    aria-checked={wf.status === "active"}
                    aria-label={`${wf.status === "active" ? "Pause" : "Activate"} ${wf.name}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      wf.status === "active" ? "bg-brass" : "bg-line-strong"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                        wf.status === "active" ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-2">Last run: {wfRuns.length ? timeAgo(wfRuns[0].at) : "Never"}</p>
              </div>
            );
          })}
        </aside>

        <section className="lg:col-span-8 rounded-2xl border border-line bg-surface shadow-sm p-6 sm:p-8 space-y-6">
          <div className="pb-5 border-b border-line">
            <h2 className="text-xl font-semibold text-text">{activeWorkflow.name}</h2>
            <p className="text-sm text-text-muted leading-relaxed mt-1.5">{activeWorkflow.description}</p>
          </div>

          <ol className="relative">
            {activeWorkflow.stages.map((stage, idx) => {
              const isLast = idx === activeWorkflow.stages.length - 1;
              const output = lastRun?.outputs[idx];
              return (
                <li key={stage.stepNumber} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />}
                  <span
                    className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center text-sm shrink-0 ${
                      running
                        ? "border-brass/50 text-brass bg-surface"
                        : output
                        ? "border-brass bg-brass text-white"
                        : "border-line text-text-muted bg-surface"
                    }`}
                  >
                    {stage.stepNumber}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-sm font-medium text-text">{stage.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{stage.stageName}</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-2">{stage.subtitle}</p>
                    {output && <p className="text-sm text-text leading-relaxed mt-1.5">{output}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-text-muted">
              {lastRun ? `Showing the result of the run ${timeAgo(lastRun.at).toLowerCase()}.` : "Press “Run now” to see real results for each step."}
            </span>
            <span className="flex items-center gap-4">
              <Link href="/tasks" className="text-brass hover:underline">
                Tasks
              </Link>
              <Link href="/integrations" className="text-brass hover:underline">
                Integrations
              </Link>
            </span>
          </div>
        </section>
      </div>

      {isCreateModalOpen && (
        <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
          <div
            className="w-[30rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">New workflow</h3>
                <p className="text-sm text-text-muted mt-1">Every workflow follows the same six steps.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5 text-sm">
              <div>
                <label className="text-sm text-text block mb-1.5">Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={e => setNewWorkflowName(e.target.value)}
                  placeholder="e.g. Late payment follow-up"
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-text block mb-1.5">Area</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["sales", "finance", "operations", "retention"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewWorkflowCategory(cat)}
                      className={`px-2 py-2 rounded-xl border text-sm capitalize cursor-pointer ${
                        newWorkflowCategory === cat
                          ? "border-line-strong bg-surface-2 text-text font-medium"
                          : "border-line text-text-muted hover:text-text"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Steps: start, get your numbers, check the rules, act or ask you, save the result, follow up.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-text-muted hover:text-text text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim()}
                className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                Create workflow
              </button>
            </div>
          </div>
        </PortalModal>
      )}

      {isBatchOpen && (
        <PortalModal isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)}>
          <div
            className="w-[38rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-lg max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Check a lead list</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Upload a CSV or paste emails. We remove bad addresses and duplicates so your outreach list is clean.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchOpen(false)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <label className="block rounded-xl border border-dashed border-line-strong p-5 text-center cursor-pointer hover:bg-surface-2/50">
                <span className="block text-sm text-text">{leadFile ? leadFile : "Choose a CSV or text file"}</span>
                <span className="block text-xs text-text-muted mt-1">One lead per line. Up to 2MB.</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => handleLeadFile(e.target.files?.[0])}
                />
              </label>

              <div>
                <label className="text-sm text-text block mb-1.5">Or paste emails</label>
                <textarea
                  rows={4}
                  value={leadText}
                  onChange={e => {
                    setLeadText(e.target.value);
                    setLeadFile(null);
                    setLeadCheck(e.target.value.trim() ? checkLeads(e.target.value) : null);
                  }}
                  placeholder={"name@company.com\nanother@company.com"}
                  className={inputClass}
                />
              </div>

              {leadCheck && (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-2/60 text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">Rows read</dt>
                    <dd className="font-medium text-text mt-0.5">{leadCheck.total}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Good emails</dt>
                    <dd className="font-medium text-jade mt-0.5">{leadCheck.valid.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">No valid email</dt>
                    <dd className="font-medium text-text mt-0.5">{leadCheck.invalid}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Duplicates</dt>
                    <dd className="font-medium text-text mt-0.5">{leadCheck.duplicates}</dd>
                  </div>
                </dl>
              )}

              <p className="text-xs text-text-muted leading-relaxed">
                Sending email isn&apos;t connected yet, so nothing is sent from here. You can download the clean list or
                add a task to contact these leads. Connect an email tool in{" "}
                <Link href="/integrations" className="text-brass hover:underline">
                  Integrations
                </Link>
                .
              </p>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={downloadCleanLeads}
                disabled={!leadCheck || leadCheck.valid.length === 0}
                className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface disabled:opacity-50 cursor-pointer"
              >
                Download clean list
              </button>
              <button
                type="button"
                onClick={createOutreachTask}
                disabled={!leadCheck || leadCheck.valid.length === 0}
                className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                Add outreach task
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
