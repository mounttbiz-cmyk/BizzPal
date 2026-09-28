"use client";

import React, { useState, useEffect, useRef } from "react";
import { PortalModal } from "@/components/ui/PortalModal";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Sliders,
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  Percent,
  X,
  Save,
  Table as TableIcon,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  parseUploadedContent,
  generateSampleBusinessCsv,
  generateSampleMonthlyFinancialsCsv,
  ParsedBusinessMetrics,
} from "@/lib/upload/dataParser";
import { emitBusinessDataUpdated, downloadFile } from "@/lib/upload/events";

interface UploadDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (metrics: ParsedBusinessMetrics) => void;
}

export function UploadDataModal({ isOpen, onClose, onSuccess }: UploadDataModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "manual" | "active">("file");

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedBusinessMetrics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: "Your Enterprise",
    founderName: "Executive Founder",
    industry: "it_tech",
    monthlyRevenue: 0,
    annualRevenue: 0,
    monthlyBurn: 0,
    cashOnHand: 0,
    teamSize: 1,
    grossMargin: 0,
  });

  // Active / History State
  const [activeDataInfo, setActiveDataInfo] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);

  // Load current values on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedStr = localStorage.getItem("bizzpal_business_profile");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        setManualForm({
          name: saved.name || "Your Enterprise",
          founderName: saved.founderName || "Executive Founder",
          industry: saved.industry || "it_tech",
          monthlyRevenue: Number(saved.revenue || saved.monthlyRevenue || 0),
          annualRevenue: Number(saved.annualRevenue || (saved.revenue ? saved.revenue * 12 : 0)),
          monthlyBurn: Number(saved.burn || saved.monthlyBurn || 0),
          cashOnHand: Number(saved.cash || saved.cashOnHand || 0),
          teamSize: Number(saved.teamSize || 1),
          grossMargin: Number(saved.grossMargin || 0),
        });
      }
    } catch {}

    // Fetch active upload info from API
    setIsLoadingActive(true);
    fetch("/api/business/upload")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveDataInfo(data.activeUpload || null);
          setHistoryList(data.history || []);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingActive(false));
  }, [isOpen]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = parseUploadedContent(text, file.name);
      setParsedPreview(parsed);
    } catch (err: any) {
      setParseError(err.message || "Failed to parse file. Please check format.");
      setParsedPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Submit File Upload
  const handleCommitUpload = async () => {
    if (!parsedPreview) return;
    setIsSubmitting(true);
    setParseError(null);
    try {
      const res = await fetch("/api/business/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: parsedPreview,
          fileName: selectedFile?.name || "business_data.csv",
          fileType: selectedFile?.name.endsWith(".json") ? "json" : "csv",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to commit upload");
      }

      // Notify entire frontend app
      emitBusinessDataUpdated(data.metrics);
      if (onSuccess) onSuccess(data.metrics);
      onClose();
    } catch (err: any) {
      setParseError(err.message || "Upload failed. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Manual Form
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const metrics: ParsedBusinessMetrics = {
        name: manualForm.name,
        founderName: manualForm.founderName,
        industry: manualForm.industry,
        industryLabel:
          manualForm.industry === "saas"
            ? "B2B SaaS & Cloud Platforms"
            : manualForm.industry === "d2c"
            ? "D2C & Direct Commerce"
            : manualForm.industry === "agency"
            ? "Agency & Retainer Services"
            : manualForm.industry.toUpperCase(),
        monthlyRevenue: Number(manualForm.monthlyRevenue),
        annualRevenue: Number(manualForm.annualRevenue) || Number(manualForm.monthlyRevenue) * 12,
        monthlyBurn: Number(manualForm.monthlyBurn),
        cashOnHand: Number(manualForm.cashOnHand),
        teamSize: Number(manualForm.teamSize),
        grossMargin: Number(manualForm.grossMargin),
        detectedColumns: ["name", "industry", "monthlyRevenue", "annualRevenue", "monthlyBurn", "cashOnHand", "teamSize", "grossMargin"],
        rowCount: 1,
        rawRowsPreview: [manualForm],
        sourceFileName: "manual_entry",
      };

      const res = await fetch("/api/business/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics,
          fileName: "manual_entry",
          fileType: "manual",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save metrics");

      emitBusinessDataUpdated(data.metrics);
      if (onSuccess) onSuccess(data.metrics);
      onClose();
    } catch (err: any) {
      alert("Error saving metrics: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to Demo Baseline
  const handleResetToDemo = async () => {
    if (!confirm("Reset dashboard back to baseline demo data (Apex Analytics)?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/business/upload", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        emitBusinessDataUpdated(data.business);
        if (onSuccess) onSuccess(data.business);
        onClose();
      }
    } catch (e: any) {
      alert("Reset failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Upload Business Data
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  Telemetry Sync
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Import real company financials to dynamically calibrate the entire executive dashboard.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line px-6 bg-surface-2/20 text-xs font-semibold">
          {[
            { id: "file", label: "File Upload (CSV / JSON)", icon: FileText },
            { id: "manual", label: "Quick Metrics Entry", icon: Sliders },
            { id: "active", label: "Active Dataset & History", icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                    : "border-transparent text-text-muted hover:text-text hover:border-line"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === "file" && (
            <div className="space-y-5">
              {/* Drag and Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                    : "border-line hover:border-cyan-500/50 bg-surface-2/30 hover:bg-surface-2/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedFile ? selectedFile.name : "Drop your business data file here, or browse"}
                </h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm">
                  Accepts standard CSV (financials, metrics, multi-month summaries) or JSON payloads (up to 10MB).
                </p>

                {selectedFile && (
                  <span className="mt-3 text-[11px] font-mono px-3 py-1 rounded-lg bg-jade/10 text-jade border border-jade/30 font-semibold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    File loaded ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                )}
              </div>

              {/* Sample Templates Download Helpers */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Download Ready-to-Use CSV Templates
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Pre-formatted templates with recognized column names.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(generateSampleBusinessCsv(), "bizzpal_business_data_template.csv")
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-cyan-500 text-text transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Standard Metrics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        generateSampleMonthlyFinancialsCsv(),
                        "bizzpal_monthly_financials_template.csv"
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-cyan-500 text-text transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Monthly Financials</span>
                  </button>
                </div>
              </div>

              {/* Parsing Error Alert */}
              {parseError && (
                <div className="p-4 rounded-xl bg-rust/10 border border-rust/30 text-xs text-rust flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Extracted Metrics Preview Card */}
              {parsedPreview && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                      Detected Business Telemetry ({parsedPreview.rowCount} {parsedPreview.rowCount === 1 ? "row" : "rows"})
                    </span>
                    <span className="text-[11px] font-mono text-cyan-500">
                      {parsedPreview.detectedColumns.length} columns recognized
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-semibold block">Company Name</span>
                      <span className="text-sm font-bold text-text truncate block mt-0.5">
                        {parsedPreview.name || "Apex Analytics"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-semibold block">Monthly Revenue</span>
                      <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono block mt-0.5">
                        ₹{(parsedPreview.monthlyRevenue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-semibold block">Monthly Net Burn</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono block mt-0.5">
                        ₹{(parsedPreview.monthlyBurn || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-semibold block">Calculated Runway</span>
                      <span className="text-sm font-bold text-jade font-mono block mt-0.5">
                        {parsedPreview.runwayMonths ? `${parsedPreview.runwayMonths} mo` : "18+ mo"}
                      </span>
                    </div>
                  </div>

                  {/* Raw Rows Table Preview */}
                  {parsedPreview.rawRowsPreview && parsedPreview.rawRowsPreview.length > 0 && (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <div className="p-2.5 bg-surface-2/80 border-b border-line text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Data Preview (First {parsedPreview.rawRowsPreview.length} rows)</span>
                      </div>
                      <div className="overflow-x-auto max-h-40">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-surface-2/40 text-text-muted font-mono uppercase">
                            <tr>
                              {parsedPreview.detectedColumns.map(col => (
                                <th key={col} className="p-2 px-3 border-b border-line whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line font-mono">
                            {parsedPreview.rawRowsPreview.map((r, idx) => (
                              <tr key={idx} className="hover:bg-surface-2/30">
                                {parsedPreview.detectedColumns.map(col => (
                                  <td key={col} className="p-2 px-3 whitespace-nowrap text-text">
                                    {String(r[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCommitUpload}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 btn-tactile cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>{isSubmitting ? "Synchronizing Dashboard..." : "Confirm & Apply to Dashboard →"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL QUICK ENTRY */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Founder / CEO Name</label>
                  <input
                    type="text"
                    value={manualForm.founderName}
                    onChange={e => setManualForm({ ...manualForm, founderName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Industry Sector</label>
                  <select
                    value={manualForm.industry}
                    onChange={e => setManualForm({ ...manualForm, industry: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="saas">B2B SaaS & Cloud Platforms</option>
                    <option value="d2c">D2C & Direct Commerce</option>
                    <option value="agency">Agency & Retainer Services</option>
                    <option value="healthcare">Healthcare & Life Sciences</option>
                    <option value="manufacturing">Manufacturing & Goods</option>
                    <option value="finance">Financial Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Team Headcount</label>
                  <input
                    type="number"
                    min="1"
                    value={manualForm.teamSize}
                    onChange={e => setManualForm({ ...manualForm, teamSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Monthly Revenue (₹ / month)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={manualForm.monthlyRevenue}
                    onChange={e =>
                      setManualForm({
                        ...manualForm,
                        monthlyRevenue: Number(e.target.value),
                        annualRevenue: Number(e.target.value) * 12,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Monthly Net Burn (₹ / month)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={manualForm.monthlyBurn}
                    onChange={e => setManualForm({ ...manualForm, monthlyBurn: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Cash Reserves on Hand (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    value={manualForm.cashOnHand}
                    onChange={e => setManualForm({ ...manualForm, cashOnHand: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Gross Margin (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={manualForm.grossMargin}
                    onChange={e => setManualForm({ ...manualForm, grossMargin: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 btn-tactile cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Applying..." : "Save & Synchronize Dashboard"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACTIVE DATASET & HISTORY */}
          {activeTab === "active" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-jade/15 border border-jade/30 flex items-center justify-center text-jade">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text block">
                      {activeDataInfo ? `Custom Dataset: ${activeDataInfo.fileName}` : "Default Demo Dataset Active (Apex Analytics)"}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {activeDataInfo
                        ? `Synced on ${new Date(activeDataInfo.createdAt).toLocaleString("en-IN")}`
                        : "Synthetic baseline telemetry for B2B SaaS."}
                    </span>
                  </div>
                </div>

                {activeDataInfo && (
                  <button
                    type="button"
                    onClick={handleResetToDemo}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-text-muted hover:text-rust hover:border-rust/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Demo</span>
                  </button>
                )}
              </div>

              {historyList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block font-sans">
                    Recent Upload History
                  </span>
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden bg-surface-2/20">
                    {historyList.map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-text">{item.fileName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-2 border border-line font-mono text-text-muted uppercase">
                            {item.fileType}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PortalModal>
  );
}
