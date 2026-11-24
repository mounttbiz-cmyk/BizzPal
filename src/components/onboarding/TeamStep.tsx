"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Database,
  FileSpreadsheet,
  Info, Loader2, MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UploadCloud,
  Users,
  X
} from "lucide-react";
import type { HrisSyncData, InviteRow } from "./types";
import { Callout, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

interface Props {
  email: string;
  businessName: string;
  invites: InviteRow[];
  onUpdate: (invites: InviteRow[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const ROLES = ["Executive", "Manager", "Operator"];

type TabMode = "excel" | "manual";

export function TeamStep({ email, businessName, invites, onUpdate, onBack, onNext }: Props) {
  const [tab, setTab] = useState<TabMode>("excel");

  // HRIS State
  const [activeSync, setActiveSync] = useState<HrisSyncData | null>(null);
  const [, setLoadingHris] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Excel Upload State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [excelSuccess, setExcelSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Operator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);
  const prev = useRef<Record<string, string>>({});

  const confirmed = invites.filter((i) => i.status === "verified").length;
  const waiting = invites.length - confirmed;

  // Fetch HRIS status & providers catalog
  const fetchHrisStatus = async () => {
    try {
      setLoadingHris(true);
      const res = await fetch(`/api/team/hris?email=${encodeURIComponent(email)}`);
      const d = await res.json();
      if (d.ok) {
        if (d.summary) {
          setActiveSync(d.summary);
        }
      }
    } catch {
    } finally {
      setLoadingHris(false);
    }
  };

  useEffect(() => {
    fetchHrisStatus();
  }, [email]);

  // Live updates: poll while there are invites waiting
  useEffect(() => {
    if (waiting === 0) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/team/invites?email=${encodeURIComponent(email)}`);
        const d = await res.json();
        if (Array.isArray(d.invites)) onUpdate(d.invites);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [waiting, email, onUpdate]);

  useEffect(() => {
    for (const i of invites) {
      if (prev.current[i.id] === "invited" && i.status === "verified") {
        setJustConfirmed(i.name || i.email);
        setTimeout(() => setJustConfirmed(null), 4500);
      }
      prev.current[i.id] = i.status;
    }
  }, [invites]);

  // Upload Excel / CSV file
  const handleUploadExcel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!excelFile) {
      setExcelError("Please choose an Excel (.xlsx, .xls) or CSV file first.");
      return;
    }
    setUploadingExcel(true);
    setExcelError("");
    setExcelSuccess("");

    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("file", excelFile);

      const res = await fetch("/api/team/hris/upload", {
        method: "POST",
        body: fd,
      });

      const d = await res.json();
      if (res.ok && d.ok) {
        setActiveSync(d.summary);
        setExcelSuccess(`Successfully imported ${d.summary.activeHeadcount} verified employee records.`);
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setExcelError(d.error || "Failed to parse Excel file.");
      }
    } catch {
      setExcelError("File upload failed. Please ensure the file is not open in another program.");
    } finally {
      setUploadingExcel(false);
    }
  };

  // Disconnect HRIS / CRM / Excel
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this employee directory record?")) return;
    try {
      await fetch("/api/team/hris", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setActiveSync(null);
      setExcelSuccess("");
    } catch {}
  };

  // Manual Invite Add
  const add = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, inviteEmail, name, role }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        onUpdate(d.invites);
        setNotice(
          d.emailed
            ? `Invite emailed to ${inviteEmail}.`
            : d.emailConfigured
            ? "The invite was created but the email could not be sent. Copy the link below and send it yourself."
            : "Email isn't set up on this server, so copy the invite link below and send it yourself."
        );
        setInviteEmail("");
        setName("");
      } else setError(d.error || "Couldn't create the invite.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch("/api/team/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, id }),
      });
      const d = await res.json();
      if (d.ok) onUpdate(d.invites);
    } catch {}
  };

  const fullLink = (l: string) => `${window.location.origin}${l}`;
  const copy = async (i: InviteRow) => {
    try {
      await navigator.clipboard.writeText(fullLink(i.link));
      setCopied(i.id);
      setTimeout(() => setCopied(""), 1600);
    } catch {}
  };
  const whatsapp = (i: InviteRow) =>
    `https://wa.me/?text=${encodeURIComponent(
      `Hi${i.name ? " " + i.name : ""}, please confirm you're part of ${businessName || "our team"} on BizzPal: ${fullLink(i.link)}`
    )}`;

  // Filtered employees in active sync table
  const filteredEmployees = (activeSync?.employees || []).filter((e) => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.jobTitle.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  const totalVerifiedHeadcount = (activeSync?.activeHeadcount || 0) + confirmed;

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 4 · Your team & headcount" title="Add or sync your employee directory">
        Connect your HR system or CRM, upload a spreadsheet of your team, or invite people by email.
      </StepHeader>

      {/* Summary Stat Card */}
      <div className="rounded-2xl border border-line bg-surface shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center">
            <Users className="w-5 h-5 text-brass" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted">Verified Active Headcount</div>
            <div className="text-2xl font-semibold text-text leading-tight">
              {totalVerifiedHeadcount}{" "}
              <span className="text-sm font-normal text-text-muted">
                {activeSync
                  ? `synced via ${"your uploaded employee list"}`
                  : confirmed > 0
                  ? "confirmed by Google"
                  : "not connected yet"}
              </span>
            </div>
          </div>
        </div>

        {activeSync && (
          <div className="flex items-center gap-2">
            <Pill tone="good">
              <Check className="w-3 h-3" /> Directory Connected
            </Pill>
            <button
              onClick={handleDisconnect}
              className="text-xs text-text-muted hover:text-rust underline cursor-pointer ml-2"
              title="Disconnect Directory"
            >
              Disconnect
            </button>
          </div>
        )}
        {!activeSync && waiting > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock className="w-4 h-4 text-amber" />
            {waiting} waiting for confirmation
            <Loader2 className="w-3 h-3 animate-spin ml-1" />
          </div>
        )}
      </div>

      {justConfirmed && (
        <Callout tone="good" icon={<BadgeCheck className="w-5 h-5" />} title={`${justConfirmed} just confirmed`}>
          They&apos;re now counted in your team.
        </Callout>
      )}

      {/* Active Sync Table Display (Shows across tabs when connected) */}
      {activeSync && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl border border-jade/30 bg-jade/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-jade/20 text-jade flex items-center justify-center font-semibold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <span>{"your uploaded employee list"}</span>
                  <Pill tone="good">Verified Live Sync</Pill>
                </div>
                <div className="text-xs text-text-muted">
                  {activeSync.activeHeadcount} Active employees · {activeSync.onLeaveHeadcount} On Leave · {activeSync.contractorHeadcount} Contractors · Total records: {activeSync.totalRecords}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Synced: {new Date(activeSync.syncedAt).toLocaleTimeString()}</span>
              <button
                onClick={fetchHrisStatus}
                className="p-1.5 rounded-lg border border-line bg-surface hover:border-brass text-text-muted hover:text-text cursor-pointer"
                title="Refresh Directory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by ID, name, department, title..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
              />
            </div>
            <div className="text-xs text-text-muted">
              Showing {filteredEmployees.length} of {activeSync.employees.length} records
            </div>
          </div>

          {/* Employee Directory Table */}
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-text-muted text-xs uppercase font-semibold border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Role / Job Title</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Reporting Manager</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-brass text-xs">{emp.id}</td>
                      <td className="py-2.5 px-3 font-medium text-text">
                        <div>{emp.name}</div>
                        <div className="text-xs text-text-muted">{emp.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted">{emp.jobTitle}</td>
                      <td className="py-2.5 px-3 text-text-muted">{emp.department}</td>
                      <td className="py-2.5 px-3 text-text-muted text-xs">{emp.manager || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize text-xs px-2 py-0.5 rounded bg-surface-2 border border-line">
                          {emp.employmentType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {emp.status === "active" ? (
                          <Pill tone="good">Active</Pill>
                        ) : emp.status === "on_leave" ? (
                          <Pill tone="warn">On Leave</Pill>
                        ) : (
                          <Pill tone="info">Terminated</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-line gap-1 overflow-x-auto">
        {([
          { id: "excel", label: "Upload employee list" },
          { id: "manual", label: `Invite by email (${invites.length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`pb-3 px-3.5 text-sm transition-colors border-b-2 cursor-pointer shrink-0 ${
              tab === t.id ? "border-brass text-text font-medium" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 3: DIRECT EXCEL / SPREADSHEET UPLOAD */}
      {tab === "excel" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-5 rounded-2xl border border-line bg-surface-2/40">
            <h4 className="text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-jade" />
              Direct Excel & Spreadsheet Roster Ingestion
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Upload your company&apos;s master staff roster or headcount spreadsheet in <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> format. 
              Our parser automatically recognizes columns like Employee ID, Name, Email, Job Title, Department, Manager, and Status.
            </p>
          </div>

          <form onSubmit={handleUploadExcel} className="p-6 rounded-2xl border-2 border-dashed border-line hover:border-line-strong bg-surface-2/20 text-center space-y-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-surface-2 text-jade flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <div className="text-xs font-semibold text-text">Choose your Excel or CSV file</div>
              <div className="text-xs text-text-muted mt-0.5">Supports Microsoft Excel (.xlsx, .xls) and CSV rosters</div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setExcelFile(f);
                  setExcelError("");
                  setExcelSuccess("");
                }}
                className="text-xs text-text file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-2 file:text-jade hover:file:bg-emerald-500/20 cursor-pointer"
              />

              {excelFile && (
                <div className="text-xs font-semibold text-text flex items-center gap-1.5 bg-surface-2 px-3 py-1.5 rounded-lg border border-line">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-jade" />
                  {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {excelError && (
              <p className="text-xs text-rust font-medium flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {excelError}
              </p>
            )}

            {excelSuccess && (
              <p className="text-xs text-jade font-medium flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                {excelSuccess}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!excelFile || uploadingExcel}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
              >
                {uploadingExcel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Parsing & Importing Spreadsheet...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload & Sync Master Roster
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-text-muted">
            <div className="p-3 rounded-lg border border-line bg-surface-2/30">
              <span className="font-semibold text-text block mb-0.5">Flexible Headers</span>
              Recognizes &apos;Emp ID&apos;, &apos;Full Name&apos;, &apos;Role&apos;, &apos;Department&apos;, &apos;Supervisor&apos; automatically.
            </div>
            <div className="p-3 rounded-lg border border-line bg-surface-2/30">
              <span className="font-semibold text-text block mb-0.5">Deduplication</span>
              Automatically removes duplicate staff emails and merges employee status.
            </div>
            <div className="p-3 rounded-lg border border-line bg-surface-2/30">
              <span className="font-semibold text-text block mb-0.5">Verified Calculation</span>
              Active headcount is immediately computed for your company profile and trust score.
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DIRECT MANUAL INVITE (FALLBACK) */}
      {tab === "manual" && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2.5 items-end">
            <div className="space-y-1.5 sm:col-span-1">
              <label htmlFor="inv-email" className="text-xs font-semibold text-text">
                Work email
              </label>
              <input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail.trim() && !busy) add();
                }}
                placeholder="priya@yourcompany.in"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inv-name" className="text-xs font-semibold text-text">
                Name <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <input
                id="inv-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail.trim() && !busy) add();
                }}
                placeholder="Priya Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inv-role" className="text-xs font-semibold text-text">
                Role
              </label>
              <select
                id="inv-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full sm:w-32 px-3 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={busy || !inviteEmail.trim()}
              className="h-10 px-4 rounded-lg bg-brass text-bg text-xs font-semibold hover:brightness-110 btn-tactile cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Invite
            </button>
          </div>

          {notice && !error && <p className="text-xs text-text-muted -mt-3">{notice}</p>}
          {error && (
            <p role="alert" className="text-xs text-rust font-medium flex items-center gap-1.5 -mt-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          {invites.length > 0 && (
            <ul className="space-y-2.5" aria-label="Invited teammates">
              {invites.map((i) => (
                <li
                  key={i.id}
                  className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in ${
                    i.status === "verified" ? "border-jade/30 bg-jade/5" : "border-line bg-surface-2/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-text truncate">{i.name || i.email}</span>
                      <Pill tone="info">{i.role}</Pill>
                      {i.status === "verified" ? (
                        <Pill tone="good">
                          <Check className="w-3 h-3" />Confirmed
                        </Pill>
                      ) : (
                        <Pill tone="warn">
                          <Clock className="w-3 h-3" />Waiting
                        </Pill>
                      )}
                      {i.sameDomain === false && <Pill tone="info">Different domain</Pill>}
                    </div>
                    {i.name && <div className="text-xs text-text-muted mt-0.5">{i.email}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {i.status !== "verified" && (
                      <>
                        <button
                          type="button"
                          onClick={() => copy(i)}
                          className="h-8 px-3 rounded-lg border border-line bg-surface text-xs font-semibold hover:border-brass cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {copied === i.id ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied === i.id ? "Copied" : "Copy link"}
                        </button>
                        <a
                          href={whatsapp(i)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-lg border border-line bg-surface text-xs font-semibold hover:border-jade cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-jade" />WhatsApp
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => revoke(i.id)}
                      aria-label={`Remove ${i.name || i.email}`}
                      className="h-8 w-8 rounded-lg border border-line bg-surface text-text-muted hover:text-rust hover:border-rust/50 cursor-pointer inline-flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Callout tone="info" icon={<Info className="w-4 h-4" />} title="How individual confirmation works">
            Send each person their link. They open it and sign in with the Google account for that email. If the email doesn&apos;t match, or Google hasn&apos;t verified it, they&apos;re not counted.
          </Callout>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton id="btn-team-next" onClick={onNext}>
          {totalVerifiedHeadcount === 0 && invites.length === 0 ? "Just me for now" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
