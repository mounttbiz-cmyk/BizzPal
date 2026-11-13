"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PortalModal } from "@/components/ui/PortalModal";
import {
  Search,
  RefreshCw,
  Folder,
  FileSpreadsheet,
  FileText,
  FileCode,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { parseUploadedContent, ParsedBusinessMetrics } from "@/lib/upload/dataParser";
import { CloudFileItem } from "@/lib/integrations/googleDrive";

export interface CloudDriveFileResult {
  fileName: string;
  fileType: "csv" | "json" | "text";
  content: string;
  metrics?: ParsedBusinessMetrics;
  sourceProvider: "google_drive" | "onedrive";
}

interface CloudDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (result: CloudDriveFileResult) => void;
  initialProvider?: "google" | "onedrive";
  title?: string;
  description?: string;
}

export function GoogleDriveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A8.9 8.9 0 0 0 0 53h27.5z" fill="#00AC47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.95 10.3z" fill="#EA4335"/>
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832D"/>
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
    </svg>
  );
}

export function OneDriveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.8 23.5H23c3.6 0 6.5-2.9 6.5-6.5 0-3.2-2.3-5.8-5.3-6.4C23.6 6 19.7 2.5 15 2.5c-4.1 0-7.6 2.7-8.7 6.6-2.2.5-3.8 2.4-3.8 4.7 0 2.6 2.1 4.7 4.7 4.7h3.6" fill="#0078D4"/>
      <path d="M18.8 26.5H6.5C3.5 26.5 1 24 1 21c0-2.4 1.6-4.4 3.8-4.9.4-4.5 4.2-8 8.7-8 3.5 0 6.6 2.1 7.9 5.2 2.3.4 4.1 2.4 4.1 4.8 0 2.7-2.2 4.9-4.9 4.9h-1.8" fill="#28A8EA"/>
      <path d="M25.5 26.5H11.2c-3.1 0-5.7-2.5-5.7-5.7 0-2.4 1.5-4.5 3.7-5.3.7-4.1 4.2-7.2 8.5-7.2 3.8 0 7 2.4 8.1 5.9 2.5.5 4.4 2.7 4.4 5.3 0 3.9-3.1 7-7 7z" fill="#0078D4" opacity="0.6"/>
    </svg>
  );
}

export function CloudDrivePickerModal({
  isOpen,
  onClose,
  onFileSelect,
  initialProvider = "google",
  title = "Import from Cloud Storage",
  description = "Select live business models, spreadsheets, or financial CSVs from your Google Drive or Microsoft OneDrive.",
}: CloudDrivePickerModalProps) {
  const [provider, setProvider] = useState<"google" | "onedrive">(initialProvider);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [files, setFiles] = useState<CloudFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"supported" | "all">("supported");
  const [folderHistory, setFolderHistory] = useState<{ id?: string; name: string }[]>([
    { name: "My Drive" },
  ]);

  const currentFolder = folderHistory[folderHistory.length - 1];

  // Load files for current provider
  const loadFiles = useCallback(
    async (folderId?: string, search?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const endpoint =
          provider === "google"
            ? "/api/integrations/google/drive/files"
            : "/api/integrations/onedrive/files";

        const params = new URLSearchParams();
        if (folderId) params.set("folderId", folderId);
        if (search && search.trim()) params.set("search", search.trim());
        if (filterType === "all") params.set("all", "true");

        const res = await fetch(`${endpoint}?${params.toString()}`);
        const data = await res.json();

        if (!data.connected) {
          setIsConnected(false);
          setAccountInfo(null);
          setFiles([]);
          if (data.error) setError(data.error);
        } else {
          setIsConnected(true);
          setAccountInfo(data.account || null);
          setFiles(data.files || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load files from cloud storage.");
      } finally {
        setIsLoading(false);
      }
    },
    [provider, filterType]
  );

  // Initial load when modal opens or provider changes
  useEffect(() => {
    if (!isOpen) return;
    setFolderHistory([{ name: provider === "google" ? "My Drive" : "OneDrive Root" }]);
    loadFiles(undefined, searchQuery);
  }, [isOpen, provider, loadFiles]);

  // Listen for OAuth completion messages from popups
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "BIZZPAL_GOOGLE_AUTH_SUCCESS" ||
        event.data?.type === "BIZZPAL_ONEDRIVE_AUTH_SUCCESS"
      ) {
        setIsConnected(true);
        if (event.data?.data) {
          setAccountInfo({
            email: event.data.data.email,
            name: event.data.data.name,
          });
        }
        loadFiles(currentFolder.id, searchQuery);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadFiles, currentFolder.id, searchQuery]);

  // Trigger OAuth Connect Popup
  const handleConnect = () => {
    setError(null);
    const connectUrl =
      provider === "google"
        ? "/api/integrations/google/connect?source=drive&returnTo=/integrations"
        : "/api/integrations/onedrive/connect?returnTo=/integrations";

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      connectUrl,
      `${provider}_auth_popup`,
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
    );
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    if (!confirm(`Disconnect your ${provider === "google" ? "Google Drive" : "OneDrive"} account?`)) return;
    setIsLoading(true);
    try {
      const endpoint =
        provider === "google"
          ? "/api/integrations/google/drive/disconnect"
          : "/api/integrations/onedrive/disconnect";
      await fetch(endpoint, { method: "POST" });
      setIsConnected(false);
      setAccountInfo(null);
      setFiles([]);
    } catch (err: any) {
      alert("Failed to disconnect: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate into folder
  const handleFolderClick = (folder: CloudFileItem) => {
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id, searchQuery);
  };

  // Navigate up in folder breadcrumbs
  const handleBreadcrumbClick = (index: number) => {
    const target = folderHistory[index];
    setFolderHistory(prev => prev.slice(0, index + 1));
    loadFiles(target.id, searchQuery);
  };

  // Select and download file to pass to parent
  const handleFileSelect = async (file: CloudFileItem) => {
    setIsDownloading(file.id);
    setError(null);
    try {
      let resultData: any;

      if (provider === "google") {
        const res = await fetch("/api/integrations/google/drive/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: file.id,
            mimeType: file.mimeType,
            fileName: file.name,
          }),
        });
        resultData = await res.json();
      } else {
        const res = await fetch("/api/integrations/onedrive/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: file.id,
            fileName: file.name,
          }),
        });
        resultData = await res.json();
      }

      if (!resultData.success) {
        throw new Error(resultData.error || "Failed to download file");
      }

      // Parse with BizzPal intelligent data parser
      let parsedMetrics: ParsedBusinessMetrics | undefined;
      try {
        parsedMetrics = parseUploadedContent(resultData.content, resultData.fileName);
      } catch (parseErr: any) {
        console.warn("Telemetry parser notice:", parseErr.message);
      }

      onFileSelect({
        fileName: resultData.fileName,
        fileType: resultData.fileType,
        content: resultData.content,
        metrics: parsedMetrics,
        sourceProvider: provider === "google" ? "google_drive" : "onedrive",
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import selected file.");
    } finally {
      setIsDownloading(null);
    }
  };

  const getFileIcon = (item: CloudFileItem) => {
    if (item.isFolder) return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    if (item.fileCategory === "spreadsheet")
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (item.fileCategory === "json")
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "--";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "--";
    }
  };

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-surface border border-line rounded-xl shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brass/15 border border-brass/30 flex items-center justify-center text-brass shrink-0">
              {provider === "google" ? (
                <GoogleDriveIcon className="w-5 h-5" />
              ) : (
                <OneDriveIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {title}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass/15 text-brass font-mono font-bold border border-brass/30">
                  Cloud Telemetry
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
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

        {/* Provider Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-line px-6 bg-surface-2/20 text-xs font-semibold">
          <div className="flex">
            <button
              type="button"
              onClick={() => {
                setProvider("google");
                setFolderHistory([{ name: "My Drive" }]);
              }}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                provider === "google"
                  ? "border-brass text-brass font-bold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <GoogleDriveIcon className="w-4 h-4" />
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProvider("onedrive");
                setFolderHistory([{ name: "OneDrive Root" }]);
              }}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                provider === "onedrive"
                  ? "border-brass text-brass font-bold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <OneDriveIcon className="w-4 h-4" />
              <span>Microsoft OneDrive</span>
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-jade/10 text-jade text-[11px] font-semibold border border-jade/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{accountInfo?.email || "Connected"}</span>
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[11px] text-text-muted hover:text-rust underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : isConnected === false ? (
              <span className="text-[11px] text-amber-400 font-medium">Not Connected</span>
            ) : null}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* If NOT connected -> Connect Card */}
          {isConnected === false && (
            <div className="border border-line rounded-xl p-8 bg-surface-2/30 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center shadow-lg">
                {provider === "google" ? (
                  <GoogleDriveIcon className="w-7 h-7" />
                ) : (
                  <OneDriveIcon className="w-7 h-7" />
                )}
              </div>

              <div className="max-w-md">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Connect {provider === "google" ? "Google Drive" : "Microsoft OneDrive"}
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Authorize read-only access to select your business financials, P&L reports,
                  and Google Sheets directly into BizzPal.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnect}
                className="px-5 py-2.5 rounded-xl bg-brass text-white hover:bg-brass-hover font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {provider === "google" ? (
                  <GoogleDriveIcon className="w-4 h-4" />
                ) : (
                  <OneDriveIcon className="w-4 h-4" />
                )}
                <span>Authorize {provider === "google" ? "Google Drive" : "OneDrive"} Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-jade" />
                <span>Read-only permissions. Your credentials are encrypted at rest with AES-256-GCM.</span>
              </div>
            </div>
          )}

          {/* If CONNECTED -> Search bar, Breadcrumbs, and File Table */}
          {isConnected && (
            <>
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") loadFiles(currentFolder.id, searchQuery);
                    }}
                    placeholder={`Search ${provider === "google" ? "Google Drive" : "OneDrive"} files...`}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        loadFiles(currentFolder.id, "");
                      }}
                      className="absolute right-2.5 top-2.5 text-text-muted hover:text-text cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const nextFilter = filterType === "supported" ? "all" : "supported";
                      setFilterType(nextFilter);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      filterType === "supported"
                        ? "bg-brass/10 border-brass/30 text-brass"
                        : "bg-surface border-line text-text-muted hover:text-text"
                    }`}
                  >
                    {filterType === "supported" ? "CSVs, Sheets & Data" : "All Files"}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadFiles(currentFolder.id, searchQuery)}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-surface border border-line text-text-muted hover:text-text hover:border-brass transition-all cursor-pointer disabled:opacity-50"
                    title="Refresh Files"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1.5 text-xs text-text-muted px-1 overflow-x-auto">
                {folderHistory.map((folder, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span className="text-text-muted/60">/</span>}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(index)}
                      className={`hover:text-text cursor-pointer truncate max-w-[150px] ${
                        index === folderHistory.length - 1 ? "text-brass font-bold" : ""
                      }`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rust/10 border border-rust/30 text-xs text-rust flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Files Table / List */}
              <div className="border border-line rounded-xl overflow-hidden bg-surface-2/20">
                {isLoading ? (
                  <div className="p-12 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-brass" />
                    <span>Loading files from {provider === "google" ? "Google Drive" : "OneDrive"}...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-12 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-text-muted/50" />
                    <p className="font-semibold text-text">No supported business files found</p>
                    <p className="text-[11px] text-text-muted max-w-sm">
                      We look for CSV, Google Sheets, Excel (.xlsx), or JSON data files. Try switching to "All Files" or upload a file.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-line max-h-[380px] overflow-y-auto">
                    {files.map(item => {
                      const isDownloadingThis = isDownloading === item.id;
                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-surface-2/60 transition-colors group"
                        >
                          <div
                            onClick={() => (item.isFolder ? handleFolderClick(item) : handleFileSelect(item))}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0">
                              {getFileIcon(item)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate group-hover:text-brass transition-colors">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                                <span>{formatDate(item.modifiedTime)}</span>
                                {!item.isFolder && (
                                  <>
                                    <span>•</span>
                                    <span>{formatSize(item.size)}</span>
                                  </>
                                )}
                                {item.fileCategory === "spreadsheet" && (
                                  <span className="px-1.5 py-0.2 rounded bg-jade/10 text-jade border border-jade/20 font-medium">
                                    Spreadsheet
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleFolderClick(item)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-brass text-text transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleFileSelect(item)}
                                disabled={isDownloadingThis}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brass hover:bg-brass-hover text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isDownloadingThis ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Importing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Select & Import</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-4 border-t border-line bg-surface-2/40 flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-jade shrink-0" />
            <span>Automatically exports Google Sheets to CSV and parses company telemetry.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-surface border border-line text-xs font-semibold text-text hover:bg-surface-2 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
