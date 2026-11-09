"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";

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

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bizzpal_workflows");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_WORKFLOWS;
  });
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("wf_bulk_email_100");
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationCurrentStage, setSimulationCurrentStage] = useState<number>(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowCategory, setNewWorkflowCategory] = useState<"sales" | "finance" | "operations" | "retention">("sales");

  // 100-Email Campaign Execution Simulation State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailProgress, setEmailProgress] = useState(0);
  const [isSending100Emails, setIsSending100Emails] = useState(false);
  const [sentLog, setSentLog] = useState<string[]>([]);

  const activeWorkflow = workflows.find(w => w.id === selectedWorkflowId) || workflows[0];

  const handleStart100EmailCampaign = () => {
    setIsSending100Emails(true);
    setEmailProgress(0);
    setSentLog([
      "[Batch Init] Uploaded 100 enterprise target leads from target_cohort_q3.csv",
      "[Enrichment] 100/100 accounts enriched via Clearbit & LinkedIn APIs (Verified MX records)",
      "[AI Personalization] Marketing generated 100 bespoke 1-to-1 icebreakers and pain-point value propositions",
      "[Spam Guard] SPF, DKIM, DMARC alignment verified. Spam score 0.08 / 10.0 (Green / Inbox Primary)",
    ]);

    let count = 0;
    const interval = setInterval(() => {
      count += 10;
      setEmailProgress(count);
      if (count <= 100) {
        setSentLog(prev => [
          ...prev,
          `[Batch Dispatch] Dispatched batch #${count / 10} (${count}/100 sent) · Throttled at 20 emails/min to protect sender reputation.`,
        ]);
      }
      if (count >= 100) {
        clearInterval(interval);
        setIsSending100Emails(false);
        setSentLog(prev => [
          ...prev,
          "[Complete] ✓ All 100 personalized emails dispatched successfully via SendGrid warm pool.",
          "[Telemetry] 100 CRM records transitioned to 'Outreach Active'. Tracking pixel & link redirects primed.",
          "[Projected Yield] 64 opens, 22 clicks, and 8-12 demo conversions expected within 72 hours.",
        ]);
      }
    }, 450);
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

  const handleSimulatePipeline = () => {
    setSimulationActive(true);
    setSimulationCurrentStage(1);
    setExecutionLogs([
      `[00.00s] Initializing Event-to-Outcome Engine for: ${activeWorkflow.name}`,
      `[00.15s] [Stage 1: Trigger] Inbound event verified & cryptographic signature validated.`,
    ]);

    const runStage = (stageNum: number) => {
      setTimeout(() => {
        setSimulationCurrentStage(stageNum);
        if (stageNum === 2) {
          setExecutionLogs(prev => [
            ...prev,
            `[00.42s] [Stage 2: Retrieve Relevant Data] Querying connected integrations & internal telemetry.`,
            `[00.60s] Extracted ${activeWorkflow.stages[1]?.telemetryData || "dataset records"}.`,
          ]);
          runStage(3);
        } else if (stageNum === 3) {
          setExecutionLogs(prev => [
            ...prev,
            `[00.95s] [Stage 3: AI Reasoning & Rules] Executing neural evaluation with auto-routed model.`,
            `[01.20s] Logic check passed: Confidence score 96.2%.`,
          ]);
          runStage(4);
        } else if (stageNum === 4) {
          setExecutionLogs(prev => [
            ...prev,
            `[01.55s] [Stage 4: Action / Approval] Dispatching payload / verifying executive permission.`,
            `[01.80s] Action dispatched successfully.`,
          ]);
          runStage(5);
        } else if (stageNum === 5) {
          setExecutionLogs(prev => [
            ...prev,
            `[02.10s] [Stage 5: Update Records] Persisting state mutations to CRM & business ledger.`,
            `[02.30s] Audit transaction hash committed to local storage & ledger.`,
          ]);
          runStage(6);
        } else if (stageNum === 6) {
          setExecutionLogs(prev => [
            ...prev,
            `[02.65s] [Stage 6: Monitor Outcome] Active telemetry listener registered. Operational loop closed.`,
            `[02.90s] ✓ Entire 6-stage Event-to-Outcome cycle executed with 0 errors.`,
          ]);

          // Increment execution count and persist to localStorage
          setWorkflows(prev => {
            const updated: WorkflowItem[] = prev.map(w =>
              w.id === activeWorkflow.id
                ? { ...w, executionsCount: w.executionsCount + 1, lastRun: "Just now" }
                : w
            );
            try {
              localStorage.setItem("bizzpal_workflows", JSON.stringify(updated));
            } catch {}
            return updated;
          });

          // Post a real task to /tasks for this pipeline outcome
          try {
            fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `[Pipeline Executed] ${activeWorkflow.name}: Verified outcome closed`,
                owner: "Autonomous Workflow Engine",
                priority: "high",
                gap: "Workflows & Automation",
              }),
            }).catch(() => {});
          } catch {}

          setTimeout(() => {
            setSimulationActive(false);
          }, 1200);
        }
      }, 500);
    };

    runStage(2);
  };

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    const newWf: WorkflowItem = {
      id: `wf_${Date.now()}`,
      name: newWorkflowName.trim(),
      description: `Autonomous ${newWorkflowCategory} Event-to-Outcome pipeline created by executive team.`,
      category: newWorkflowCategory,
      status: "active",
      executionsCount: 1,
      successRate: "100%",
      lastRun: "Just now",
      stages: [
        {
          stepNumber: 1,
          stageName: "Trigger (Event)",
          title: "Custom Event Ingestion",
          subtitle: "Webhook listener active for incoming operational triggers",
          telemetryData: "Event stream configured with HMAC authentication.",
          icon: "zap",
          status: "completed",
          badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        },
        {
          stepNumber: 2,
          stageName: "Retrieve Relevant Data",
          title: "Telemetry & State Extraction",
          subtitle: "Pull historical context and user metadata",
          telemetryData: "Context matched against operational database.",
          icon: "search",
          status: "completed",
          badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        },
        {
          stepNumber: 3,
          stageName: "AI Reasoning & Rules",
          title: "Adaptive Decision Matrix",
          subtitle: "Auto-routed LLM reasons over business rules",
          telemetryData: "Evaluated rule thresholds and assigned priority.",
          icon: "brain",
          status: "completed",
          badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        },
        {
          stepNumber: 4,
          stageName: "Action / Approval",
          title: "Execution Dispatch",
          subtitle: "Execute action or queue for executive confirmation",
          telemetryData: "Dispatched to target system API endpoint.",
          icon: "pen",
          status: "completed",
          badgeColor: "text-brass bg-brass/10 border-brass/20",
        },
        {
          stepNumber: 5,
          stageName: "Update Records",
          title: "Ledger & CRM Sync",
          subtitle: "Commit changes to central source of truth",
          telemetryData: "Record updated and immutable event logged.",
          icon: "database",
          status: "completed",
          badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          stepNumber: 6,
          stageName: "Monitor Outcome",
          title: "Feedback & SLA Loop",
          subtitle: "Track resolution and trigger follow-up if uncompleted",
          telemetryData: "Listener active with 48-hour SLA timeout.",
          icon: "chart",
          status: "running",
          badgeColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
        },
      ],
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
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const stageState = (stage: PipelineStage) => {
    if (simulationActive && simulationCurrentStage === stage.stepNumber) return "running";
    if (simulationActive && simulationCurrentStage > stage.stepNumber) return "done";
    if (simulationActive) return "waiting";
    return stage.status === "running" ? "monitoring" : "done";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Workflows</h1>
          <p className="text-sm text-text-muted mt-1">
            Multi-step processes that turn an event, like a payment failure or a new lead, into a result.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
          >
            Batch outreach
          </button>
          <button
            type="button"
            onClick={handleSimulatePipeline}
            disabled={simulationActive}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
          >
            {simulationActive ? `Running step ${simulationCurrentStage} of 6…` : "Run test"}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Workflow list */}
        <aside className="lg:col-span-4 space-y-2">
          {workflows.map(wf => {
            const isSelected = wf.id === selectedWorkflowId;
            return (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-brass bg-brass/[0.04]" : "border-line bg-surface hover:border-line-strong"
                } ${wf.status === "paused" ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text leading-snug">{wf.name}</h3>
                    <p className="text-xs text-text-muted mt-1 capitalize">
                      {wf.category} · {wf.executionsCount} runs · {wf.successRate} success
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
                <p className="text-xs text-text-muted mt-2">Last run {wf.lastRun}</p>
              </div>
            );
          })}
        </aside>

        {/* Selected workflow */}
        <section className="lg:col-span-8 rounded-xl border border-line bg-surface p-6 sm:p-7 space-y-6">
          <div className="pb-5 border-b border-line">
            <h2 className="text-lg font-semibold text-text">{activeWorkflow.name}</h2>
            <p className="text-sm text-text-muted leading-relaxed mt-1.5">{activeWorkflow.description}</p>
          </div>

          <ol className="relative">
            {activeWorkflow.stages.map((stage, idx) => {
              const state = stageState(stage);
              const isLast = idx === activeWorkflow.stages.length - 1;
              return (
                <li key={stage.stepNumber} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />}
                  <span
                    className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center text-sm shrink-0 ${
                      state === "running"
                        ? "border-brass bg-brass text-white"
                        : state === "done"
                        ? "border-brass/50 text-brass bg-surface"
                        : "border-line text-text-muted bg-surface"
                    }`}
                  >
                    {stage.stepNumber}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <h3 className="text-sm font-medium text-text">{stage.title}</h3>
                      <span className="text-xs text-text-muted">
                        {state === "running"
                          ? "Running…"
                          : state === "monitoring"
                          ? "Monitoring"
                          : state === "waiting"
                          ? "Waiting"
                          : "Ready"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{stage.stageName}</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-2">{stage.subtitle}</p>
                    <p className="text-sm text-text leading-relaxed mt-1.5">{stage.telemetryData}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {executionLogs.length > 0 && (
            <div className="rounded-lg border border-line bg-surface-2/50">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                <span className="text-sm font-medium text-text">Test run log</span>
                <button
                  type="button"
                  onClick={() => setExecutionLogs([])}
                  className="text-xs text-text-muted hover:text-text cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <ul className="p-4 space-y-1 text-xs font-mono max-h-44 overflow-y-auto">
                {executionLogs.map((log, i) => (
                  <li key={i} className="text-text-muted">
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-text-muted">Results are sent to your briefings, tasks and gap register.</span>
            <span className="flex items-center gap-4">
              <Link href="/reports" className="text-brass hover:underline">
                Briefings
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
            className="w-[30rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
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
                className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5 text-sm">
              <div>
                <label className="font-medium text-text block mb-1.5">Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={e => setNewWorkflowName(e.target.value)}
                  placeholder="e.g. VIP customer retention"
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div>
                <label className="font-medium text-text block mb-1.5">Area</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["sales", "finance", "operations", "retention"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewWorkflowCategory(cat)}
                      className={`px-2 py-2 rounded-lg border text-sm capitalize cursor-pointer ${
                        newWorkflowCategory === cat
                          ? "border-brass bg-brass/[0.06] text-text font-medium"
                          : "border-line text-text-muted hover:text-text"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Steps: trigger, get data, AI review, action or approval, update records, monitor the result.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-text-muted hover:text-text text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim()}
                className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                Create workflow
              </button>
            </div>
          </div>
        </PortalModal>
      )}

      {isEmailModalOpen && (
        <PortalModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)}>
          <div
            className="w-[40rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-lg max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Batch outreach</h3>
                <p className="text-sm text-text-muted mt-1">
                  Send personalised emails to 100 leads, a few at a time to protect your sender reputation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { t: "Ingest and enrich", d: "Load 100 leads and add company details like size and tech stack." },
                  { t: "Write and send", d: "Draft a tailored email for each person and send 20 per minute." },
                  { t: "Sync and track", d: "Update your CRM and alert you when someone books a demo." },
                ].map((s, i) => (
                  <li key={s.t} className="p-4 rounded-lg border border-line">
                    <p className="text-xs text-text-muted">Step {i + 1}</p>
                    <p className="font-medium text-text mt-0.5">{s.t}</p>
                    <p className="text-xs text-text-muted leading-relaxed mt-1.5">{s.d}</p>
                  </li>
                ))}
              </ol>

              <div className="p-4 rounded-lg border border-line space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text">{emailProgress} of 100 sent</span>
                  <span className="text-xs text-text-muted">
                    {isSending100Emails ? "Sending" : emailProgress === 100 ? "Done" : "Ready"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-brass transition-all duration-300 rounded-full" style={{ width: `${emailProgress}%` }} />
                </div>
                <button
                  type="button"
                  onClick={handleStart100EmailCampaign}
                  disabled={isSending100Emails}
                  className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {isSending100Emails ? "Sending…" : "Start batch"}
                </button>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/50">
                <p className="px-4 py-2.5 text-sm font-medium text-text border-b border-line">Activity</p>
                <ul className="p-4 space-y-1 text-xs font-mono text-text-muted max-h-44 overflow-y-auto">
                  {sentLog.length === 0 ? (
                    <li>Press &ldquo;Start batch&rdquo; to begin.</li>
                  ) : (
                    sentLog.map((log, idx) => <li key={idx}>{log}</li>)
                  )}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-line text-sm text-text hover:bg-surface cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
