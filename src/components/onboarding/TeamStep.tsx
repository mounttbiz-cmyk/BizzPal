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
  Info,
  Key,
  Layers,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Upload,
  UploadCloud,
  Users,
  X,
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

type TabMode = "hris" | "crm" | "excel" | "alternatives" | "manual";

interface CatalogItem {
  id: string;
  name: string;
  category: "enterprise_hris" | "cloud_hris" | "idp_directory" | "statutory_payroll" | "crm" | "spreadsheet";
  badge: string;
  description: string;
  authType: "oauth" | "api_key" | "epfo_upload" | "payroll_csv" | "excel_upload";
  fields: { key: string; label: string; placeholder: string; type?: string; secure?: boolean }[];
}

export function TeamStep({ email, businessName, invites, onUpdate, onBack, onNext }: Props) {
  const [tab, setTab] = useState<TabMode>("hris");

  // HRIS State
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [activeSync, setActiveSync] = useState<HrisSyncData | null>(null);
  const [loadingHris, setLoadingHris] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<CatalogItem | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [hrisError, setHrisError] = useState("");
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
        if (d.catalog) setCatalog(d.catalog);
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

  // Connect & sync HRIS or CRM provider
  const handleConnectProvider = async () => {
    if (!selectedProvider) return;
    setConnecting(true);
    setHrisError("");
    try {
      const res = await fetch("/api/team/hris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          provider: selectedProvider.id,
          config: formInputs,
        }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setActiveSync(d.summary);
        setSelectedProvider(null);
        setFormInputs({});
      } else {
        setHrisError(d.error || "Failed to connect to integration.");
      }
    } catch {
      setHrisError("Could not reach synchronization server. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

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
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, inviteEmail, name, role }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        onUpdate(d.invites);
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

  const enterpriseHrisList = catalog.filter((c) => c.category === "enterprise_hris" || c.category === "cloud_hris");
  const crmList = catalog.filter((c) => c.category === "crm");
  const verifiedAlternatives = catalog.filter((c) => c.category === "idp_directory" || c.category === "statutory_payroll");

  const totalVerifiedHeadcount = (activeSync?.activeHeadcount || 0) + confirmed;

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 5 · Your team & headcount" title="Add or sync your employee directory">
        Large companies don&apos;t type or manually invite hundreds of employees. Connect your core HRIS/HCM, your company&apos;s CRM, upload your master Excel spreadsheet, or verify via statutory payroll/IdP.
      </StepHeader>

      {/* Summary Stat Card */}
      <div className="rounded-2xl border border-line bg-surface-2/40 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center">
            <Users className="w-5 h-5 text-brass" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Verified Active Headcount</div>
            <div className="text-xl font-bold text-text leading-tight">
              {totalVerifiedHeadcount}{" "}
              <span className="text-xs font-normal text-text-muted">
                {activeSync
                  ? `synced via ${catalog.find((c) => c.id === activeSync.provider)?.name || activeSync.provider}`
                  : confirmed > 0
                  ? "confirmed by Google"
                  : "0 synced yet"}
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
              <div className="w-9 h-9 rounded-lg bg-jade/20 text-jade flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-1.5">
                  <span>{catalog.find((c) => c.id === activeSync.provider)?.name || activeSync.provider}</span>
                  <Pill tone="good">Verified Live Sync</Pill>
                </div>
                <div className="text-[11px] text-text-muted">
                  {activeSync.activeHeadcount} Active employees · {activeSync.onLeaveHeadcount} On Leave · {activeSync.contractorHeadcount} Contractors · Total records: {activeSync.totalRecords}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">Synced: {new Date(activeSync.syncedAt).toLocaleTimeString()}</span>
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
                <thead className="bg-surface-2 text-text-muted text-[10px] uppercase font-semibold border-b border-line sticky top-0 z-10">
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
                <tbody className="divide-y divide-line/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-brass text-[11px]">{emp.id}</td>
                      <td className="py-2.5 px-3 font-medium text-text">
                        <div>{emp.name}</div>
                        <div className="text-[10px] text-text-muted">{emp.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted">{emp.jobTitle}</td>
                      <td className="py-2.5 px-3 text-text-muted">{emp.department}</td>
                      <td className="py-2.5 px-3 text-text-muted text-[11px]">{emp.manager || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-surface-2 border border-line">
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
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setTab("hris")}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            tab === "hris" ? "border-brass text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-brass" />
          HRIS / HCM Core Record
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brass/10 text-brass font-semibold">Enterprise</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("crm")}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            tab === "crm" ? "border-brass text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-blue-400" />
          Connect Own CRM
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">Salesforce · HubSpot</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("excel")}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            tab === "excel" ? "border-brass text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          Excel / Spreadsheet
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">.xlsx · .csv</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("alternatives")}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            tab === "alternatives" ? "border-brass text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-jade" />
          Verified EPFO / IdP
        </button>

        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            tab === "manual" ? "border-brass text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Direct Invite ({invites.length})
        </button>
      </div>

      {/* TAB 1: HRIS / HCM SYSTEM INTEGRATIONS */}
      {tab === "hris" && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-xs text-text-muted leading-relaxed">
            Connect your primary Human Resources Information System (HRIS) or Human Capital Management (HCM) software. 
            BizzPal syncs active employee rosters, managerial hierarchy, job titles, and verified headcount in one click.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enterpriseHrisList.map((prov) => (
              <div
                key={prov.id}
                onClick={() => {
                  setSelectedProvider(prov);
                  setFormInputs({});
                  setHrisError("");
                }}
                className="p-4 rounded-xl border border-line bg-surface-2/30 hover:border-brass/70 hover:bg-surface-2/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text group-hover:text-brass transition-colors">
                      {prov.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brass/10 text-brass">
                      {prov.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                    {prov.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
                  <span className="text-text-muted flex items-center gap-1 font-mono text-[10px]">
                    <Key className="w-3 h-3 text-brass" /> Direct API Sync
                  </span>
                  <span className="font-semibold text-brass flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Connect & Sync →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL CRM CONNECTIONS */}
      {tab === "crm" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-xl border border-line bg-surface-2/40">
            <h4 className="text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-blue-400" />
              Connect Your Company&apos;s CRM
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              If your company manages its personnel, account executives, and operational staff through a CRM (Salesforce, HubSpot, Zoho CRM, LeadSquared, Pipedrive, or an in-house CRM database), connect below to instantly sync your active verified staff list.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {crmList.map((crm) => (
              <div
                key={crm.id}
                onClick={() => {
                  setSelectedProvider(crm);
                  setFormInputs({});
                  setHrisError("");
                }}
                className="p-4 rounded-xl border border-line bg-surface-2/30 hover:border-blue-400/70 hover:bg-surface-2/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text group-hover:text-blue-400 transition-colors">
                      {crm.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {crm.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                    {crm.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
                  <span className="text-text-muted flex items-center gap-1 text-[10px]">
                    <Key className="w-3 h-3 text-blue-400" /> CRM User Sync
                  </span>
                  <span className="font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Connect CRM →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT EXCEL / SPREADSHEET UPLOAD */}
      {tab === "excel" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-xl border border-line bg-surface-2/40">
            <h4 className="text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Direct Excel & Spreadsheet Roster Ingestion
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Upload your company&apos;s master staff roster or headcount spreadsheet in <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> format. 
              Our parser automatically recognizes columns like Employee ID, Name, Email, Job Title, Department, Manager, and Status.
            </p>
          </div>

          <form onSubmit={handleUploadExcel} className="p-6 rounded-2xl border-2 border-dashed border-line hover:border-emerald-500/50 bg-surface-2/20 text-center space-y-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <div className="text-xs font-bold text-text">Choose your Excel or CSV file</div>
              <div className="text-[11px] text-text-muted mt-0.5">Supports Microsoft Excel (.xlsx, .xls) and CSV rosters</div>
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
                className="text-xs text-text file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer"
              />

              {excelFile && (
                <div className="text-xs font-semibold text-text flex items-center gap-1.5 bg-surface-2 px-3 py-1.5 rounded-lg border border-line">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
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
              <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                {excelSuccess}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!excelFile || uploadingExcel}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-text-muted">
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

      {/* TAB 4: VERIFIED ALTERNATIVE METHODS (NO HRIS / EPFO / IDP) */}
      {tab === "alternatives" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-xl border border-line bg-surface-2/40">
            <h4 className="text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-jade" />
              Genuine Verified Alternatives for Companies Without an HRIS
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Verify your team headcount through official statutory government filings (EPFO ECR) or enterprise Identity Provider (IdP) directories (Google Workspace Admin / Microsoft Entra ID). No manual invites required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {verifiedAlternatives.map((alt) => (
              <div
                key={alt.id}
                onClick={() => {
                  setSelectedProvider(alt);
                  setFormInputs({});
                  setHrisError("");
                }}
                className="p-4 rounded-xl border border-line bg-surface-2/30 hover:border-jade/70 hover:bg-surface-2/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text group-hover:text-jade transition-colors">
                      {alt.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-jade/10 text-jade">
                      {alt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {alt.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
                  <span className="text-text-muted flex items-center gap-1 text-[10px]">
                    <Shield className="w-3 h-3 text-jade" /> Official Third-Party Proof
                  </span>
                  <span className="font-semibold text-jade flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Verify via {alt.authType === "epfo_upload" ? "Filing" : "IdP"} →
                  </span>
                </div>
              </div>
            ))}
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
              className="h-10 px-4 rounded-lg bg-brass text-bg text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Invite
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[11px] text-rust font-medium flex items-center gap-1.5 -mt-3">
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
                      <span className="text-xs font-bold text-text truncate">{i.name || i.email}</span>
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
                    {i.name && <div className="text-[11px] text-text-muted mt-0.5">{i.email}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {i.status !== "verified" && (
                      <>
                        <button
                          type="button"
                          onClick={() => copy(i)}
                          className="h-8 px-3 rounded-lg border border-line bg-surface text-[11px] font-semibold hover:border-brass cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {copied === i.id ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied === i.id ? "Copied" : "Copy link"}
                        </button>
                        <a
                          href={whatsapp(i)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-lg border border-line bg-surface text-[11px] font-semibold hover:border-jade cursor-pointer inline-flex items-center gap-1.5"
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

      {/* Integration Connection Modal (HRIS & CRM) */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-theme p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brass">
                  {selectedProvider.badge}
                </span>
                <h3 className="text-base font-bold text-text mt-0.5">{selectedProvider.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="p-1.5 rounded-lg border border-line bg-surface-2 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {selectedProvider.description}
            </p>

            <div className="space-y-3 pt-2">
              {selectedProvider.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-semibold text-text">{f.label}</label>
                  <input
                    type={f.secure ? "password" : "text"}
                    placeholder={f.placeholder}
                    value={formInputs[f.key] || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, [f.key]: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
                  />
                </div>
              ))}
            </div>

            {selectedProvider.authType === "epfo_upload" && (
              <div className="p-3 rounded-lg border border-line bg-surface-2/40 text-[11px] text-text-muted space-y-2">
                <div className="font-semibold text-text flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-jade" /> Electronic Challan Cum Return (ECR)
                </div>
                <div>
                  Upload or enter the EPFO ECR filing details. BizzPal parses active Member IDs, UAN numbers, and gross wages to compute statutory verified headcount.
                </div>
              </div>
            )}

            {hrisError && (
              <p className="text-xs text-rust font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {hrisError}
              </p>
            )}

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
              <GhostButton onClick={() => setSelectedProvider(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleConnectProvider} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Synchronizing...
                  </>
                ) : (
                  "Authenticate & Sync Records"
                )}
              </PrimaryButton>
            </div>
          </div>
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
