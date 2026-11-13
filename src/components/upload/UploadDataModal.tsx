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
  Cloud,
} from "lucide-react";
import {
  parseUploadedContent,
  generateSampleBusinessCsv,
  generateSampleMonthlyFinancialsCsv,
  ParsedBusinessMetrics,
} from "@/lib/upload/dataParser";
import { emitBusinessDataUpdated, downloadFile } from "@/lib/upload/events";
import {
  CloudDrivePickerModal,
  GoogleDriveIcon,
  OneDriveIcon,
  CloudDriveFileResult,
} from "@/components/integrations/CloudDrivePickerModal";

interface UploadDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (metrics: ParsedBusinessMetrics) => void;
}

export function UploadDataModal({ isOpen, onClose, onSuccess }: UploadDataModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "cloud" | "manual" | "active">("file");

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudSource, setCloudSource] = useState<{
    name: string;
    size: number;
    provider: "google_drive" | "onedrive";
    content: string;
  } | null>(null);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [cloudPickerProvider, setCloudPickerProvider] = useState<"google" | "onedrive">("google");
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
    setCloudSource(null);
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

  const handleCloudFileImport = (result: CloudDriveFileResult) => {
    setSelectedFile(null);
    setCloudSource({
      name: result.fileName,
      size: result.content.length,
      provider: result.sourceProvider,
      content: result.content,
    });
    setParseError(null);
    try {
      const parsed = result.metrics || parseUploadedContent(result.content, result.fileName);
      setParsedPreview(parsed);
      setActiveTab("file");
    } catch (err: any) {
      setParseError(err.message || "Failed to parse file from cloud storage.");
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
      const currentFileName = selectedFile?.name || cloudSource?.name || "business_data.csv";
      const isJson = currentFileName.toLowerCase().endsWith(".json");
      const res = await fetch("/api/business/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: parsedPreview,
          fileName: currentFileName,
          fileType: isJson ? "json" : "csv",
          rawContent: cloudSource?.content,
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
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text">Add business data</h2>
            <p className="text-sm text-text-muted mt-1">Upload your financials to update the numbers across your dashboard.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line px-6 gap-1 text-sm overflow-x-auto">
          {[
            { id: "file", label: "Upload a file" },
            { id: "cloud", label: "Cloud drive" },
            { id: "manual", label: "Enter numbers" },
            { id: "active", label: "Current data" },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive ? "border-brass text-text font-medium" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {tab.label}
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
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-brass bg-brass/10"
                    : "border-line hover:border-line-strong bg-surface-2/30 hover:bg-surface-2/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-brass mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-base font-medium text-text">
                  {selectedFile ? selectedFile.name : cloudSource ? cloudSource.name : "Drag a file here, or click to choose one"}
                </h3>
                <p className="text-sm text-text-muted mt-1 max-w-sm">
                  CSV, Excel (.xlsx) or JSON, up to 10 MB.
                </p>

                {(selectedFile || cloudSource) && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-lg bg-jade/10 text-jade border border-jade/30 font-semibold inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedFile
                        ? `File loaded (${Math.round(selectedFile.size / 1024)} KB)`
                        : `Imported via ${cloudSource?.provider === "google_drive" ? "Google Drive" : "OneDrive"}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Cloud Drive Quick Integration Bar */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  
                  <div>
                    <span className="text-xs font-medium text-text block">
                      Import from the cloud
                    </span>
                    <span className="text-xs text-text-muted">
                      Pick a spreadsheet from Google Drive or OneDrive.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCloudPickerProvider("google");
                      setIsCloudPickerOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-sm bg-surface border border-line hover:bg-surface-2 text-text transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <GoogleDriveIcon className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCloudPickerProvider("onedrive");
                      setIsCloudPickerOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-sm bg-surface border border-line hover:bg-surface-2 text-text transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <OneDriveIcon className="w-3.5 h-3.5" />
                    <span>OneDrive</span>
                  </button>
                </div>
              </div>

              {/* Sample Templates Download Helpers */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                                    <div>
                    <span className="text-xs font-medium text-text block">
                      Need a template?
                    </span>
                    <span className="text-xs text-text-muted">
                      Download a sample file with the right columns.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(generateSampleBusinessCsv(), "bizzpal_business_data_template.csv")
                    }
                    className="px-3.5 py-2 rounded-xl text-sm bg-surface border border-line hover:bg-surface-2 text-text transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-brass" />
                    <span>Key numbers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        generateSampleMonthlyFinancialsCsv(),
                        "bizzpal_monthly_financials_template.csv"
                      )
                    }
                    className="px-3.5 py-2 rounded-xl text-sm bg-surface border border-line hover:bg-surface-2 text-text transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-brass" />
                    <span>Monthly figures</span>
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
                    <span className="text-xs font-medium text-text font-sans">
                      Detected Business Telemetry ({parsedPreview.rowCount} {parsedPreview.rowCount === 1 ? "row" : "rows"})
                    </span>
                    <span className="text-xs text-brass">
                      {parsedPreview.detectedColumns.length} columns recognized
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-xs text-text-muted font-semibold block">Company Name</span>
                      <span className="text-sm font-medium text-text truncate block mt-0.5">
                        {parsedPreview.name || "Apex Analytics"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-xs text-text-muted font-semibold block">Monthly Revenue</span>
                      <span className="text-sm font-medium text-brass block mt-0.5">
                        ₹{(parsedPreview.monthlyRevenue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-xs text-text-muted font-semibold block">Monthly Net Burn</span>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400 block mt-0.5">
                        ₹{(parsedPreview.monthlyBurn || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2/60 border border-line">
                      <span className="text-xs text-text-muted font-semibold block">Calculated Runway</span>
                      <span className="text-sm font-medium text-jade block mt-0.5">
                        {parsedPreview.runwayMonths ? `${parsedPreview.runwayMonths} mo` : "18+ mo"}
                      </span>
                    </div>
                  </div>

                  {/* Raw Rows Table Preview */}
                  {parsedPreview.rawRowsPreview && parsedPreview.rawRowsPreview.length > 0 && (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <div className="p-2.5 bg-surface-2/80 border-b border-line text-xs font-semibold text-text-muted flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Data Preview (First {parsedPreview.rawRowsPreview.length} rows)</span>
                      </div>
                      <div className="overflow-x-auto max-h-40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-2/40 text-text-muted">
                            <tr>
                              {parsedPreview.detectedColumns.map(col => (
                                <th key={col} className="p-2 px-3 border-b border-line whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
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
                    className="w-full py-3 rounded-xl bg-brass text-white font-medium text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 btn-tactile cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>{isSubmitting ? "Synchronizing Dashboard..." : "Confirm & Apply to Dashboard →"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: CLOUD DRIVES (GOOGLE DRIVE & ONEDRIVE) */}
          {activeTab === "cloud" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Google Drive Card */}
                <div className="p-5 rounded-2xl bg-surface-2/40 border border-line flex flex-col justify-between space-y-4 hover:border-brass/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0">
                      <GoogleDriveIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text">Google Drive</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Connect your executive Google Workspace. Select Google Sheets, CSV models, or financial docs with 1 click.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCloudPickerProvider("google");
                      setIsCloudPickerOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-brass text-white hover:bg-brass-hover text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <GoogleDriveIcon className="w-4 h-4" />
                    <span>Browse Google Drive Files</span>
                  </button>
                </div>

                {/* Microsoft OneDrive Card */}
                <div className="p-5 rounded-2xl bg-surface-2/40 border border-line flex flex-col justify-between space-y-4 hover:border-brass/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0">
                      <OneDriveIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text">Microsoft OneDrive</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Sync enterprise Excel spreadsheets, OneDrive models, and monthly business accounting sheets.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCloudPickerProvider("onedrive");
                      setIsCloudPickerOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-surface border border-line hover:border-brass text-text text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <OneDriveIcon className="w-4 h-4" />
                    <span>Browse OneDrive Files</span>
                  </button>
                </div>
              </div>

              {/* Supported Formats Info */}
              <div className="p-4 rounded-xl bg-surface border border-line flex items-center gap-3 text-xs text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-jade shrink-0" />
                <span>
                  Supported formats: <strong>Google Sheets</strong> (auto-exported to CSV), <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV</strong>, and <strong>JSON telemetry</strong>.
                </span>
              </div>
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Founder / CEO Name</label>
                  <input
                    type="text"
                    value={manualForm.founderName}
                    onChange={e => setManualForm({ ...manualForm, founderName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Industry Sector</label>
                  <select
                    value={manualForm.industry}
                    onChange={e => setManualForm({ ...manualForm, industry: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text focus:outline-hidden focus:border-brass"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-brass text-white font-medium text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 btn-tactile cursor-pointer"
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
                    <span className="text-xs font-medium text-text block">
                      {activeDataInfo ? `Custom Dataset: ${activeDataInfo.fileName}` : "Default Demo Dataset Active (Apex Analytics)"}
                    </span>
                    <span className="text-xs text-text-muted">
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
                  <span className="text-xs font-medium text-text-muted block font-sans">
                    Recent Upload History
                  </span>
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden bg-surface-2/20">
                    {historyList.map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brass" />
                          <span className="font-semibold text-text">{item.fileName}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-md bg-surface-2 border border-line text-text-muted">
                            {item.fileType}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">
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

      <CloudDrivePickerModal
        isOpen={isCloudPickerOpen}
        onClose={() => setIsCloudPickerOpen(false)}
        onFileSelect={handleCloudFileImport}
        initialProvider={cloudPickerProvider}
      />
    </PortalModal>
  );
}
