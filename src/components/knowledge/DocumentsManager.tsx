"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Layers,
  Database,
  Search,
  Copy,
  Check,
  FileType,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Cpu,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";

interface DocumentItem {
  id: string;
  businessId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: "pending" | "processing" | "indexed" | "failed";
  chunkCount: number;
  errorMessage?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface ChunkItem {
  id: string;
  chunk_index: number;
  char_count: number;
  token_estimate: number;
  page_number?: number;
  section_title?: string;
  content: string;
}

function getFileTypeDetails(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return {
      label: "PDF",
      badgeColor: "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/25",
      iconColor: "text-rose-500",
      icon: FileText,
    };
  }
  if (ext === "csv" || ext === "xlsx" || ext === "xls" || mimeType?.includes("csv")) {
    return {
      label: "CSV / Sheet",
      badgeColor: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25",
      iconColor: "text-emerald-500",
      icon: FileSpreadsheet,
    };
  }
  if (ext === "json" || mimeType?.includes("json")) {
    return {
      label: "JSON",
      badgeColor: "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border-cyan-500/25",
      iconColor: "text-cyan-500",
      icon: FileCode,
    };
  }
  if (ext === "md" || ext === "markdown") {
    return {
      label: "Markdown",
      badgeColor: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/25",
      iconColor: "text-indigo-500",
      icon: FileType,
    };
  }
  return {
    label: ext ? ext.toUpperCase() : "TXT",
    badgeColor: "bg-brass/10 text-brass border-brass/25",
    iconColor: "text-brass",
    icon: FileText,
  };
}

export function DocumentsManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeDocForPreview, setActiveDocForPreview] = useState<{ doc: DocumentItem; chunks: ChunkItem[] } | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge/documents");
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.warn("Failed to fetch documents:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    if (uploadTitle) formData.append("title", uploadTitle);

    try {
      const res = await fetch("/api/knowledge/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle("");
        setToastMessage(`Document "${uploadTitle || uploadFile.name}" indexed with ${data.result?.chunkCount || 0} vector chunks!`);
        setTimeout(() => setToastMessage(null), 4000);
        fetchDocuments();
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" and all its vector chunks?`)) return;

    try {
      const res = await fetch(`/api/knowledge/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`"${title}" removed from memory.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchDocuments();
      }
    } catch (e) {
      alert("Failed to delete document");
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      setToastMessage("Re-indexing chunks and regenerating embeddings…");
      const res = await fetch(`/api/knowledge/documents/${docId}/reprocess`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setToastMessage("Document re-indexed successfully!");
        setTimeout(() => setToastMessage(null), 3000);
        fetchDocuments();
      }
    } catch {
      alert("Failed to reprocess document");
    }
  };

  const handleViewChunks = async (doc: DocumentItem) => {
    setIsLoadingChunks(true);
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`);
      const data = await res.json();
      if (data.success) {
        setActiveDocForPreview({ doc, chunks: data.chunks || [] });
      }
    } catch {
      alert("Failed to load chunks");
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const copyChunkToClipboard = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // Compute Repository Analytics
  const totalDocs = documents.length;
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
  const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  const indexedCount = documents.filter((d) => d.status === "indexed").length;
  const healthPct = totalDocs > 0 ? Math.round((indexedCount / totalDocs) * 100) : 100;

  const filteredDocs = documents.filter((d) => {
    const matchesSearch = searchFilter
      ? d.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        d.fileName.toLowerCase().includes(searchFilter.toLowerCase())
      : true;

    if (!matchesSearch) return false;
    if (selectedFormat === "all") return true;

    const ext = d.fileName.split(".").pop()?.toLowerCase() || "";
    if (selectedFormat === "pdf") return ext === "pdf";
    if (selectedFormat === "sheets") return ["csv", "xlsx", "xls"].includes(ext);
    if (selectedFormat === "json") return ext === "json";
    if (selectedFormat === "markdown") return ["md", "markdown"].includes(ext);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Repository Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Ingested Documents</span>
            <div className="w-6 h-6 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{totalDocs}</span>
            <span className="text-[10px] text-text-muted font-mono">files</span>
          </div>
          <p className="text-[10px] text-text-muted/80">PDF, Markdown, CSV & JSON</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Vector Embeddings</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{totalChunks}</span>
            <span className="text-[10px] text-text-muted font-mono">vectors</span>
          </div>
          <p className="text-[10px] text-text-muted/80">HNSW Index • 768 / 1536 dim</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Memory Footprint</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">
              {totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`}
            </span>
          </div>
          <p className="text-[10px] text-text-muted/80">pgvector & SQLite Dual-Store</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Index Health</span>
            <div className="w-6 h-6 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-text">{healthPct}%</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced
            </span>
          </div>
          <p className="text-[10px] text-text-muted/80">Automated deduplication active</p>
        </div>
      </div>

      {/* Action Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-surface border border-line shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search company files, SOPs, decks…"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:border-brass/70 transition-all font-sans"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Format Filter Pills */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line">
            {[
              { id: "all", label: "All Formats" },
              { id: "pdf", label: "PDF" },
              { id: "sheets", label: "CSV/Sheets" },
              { id: "json", label: "JSON" },
              { id: "markdown", label: "MD" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormat(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFormat === f.id
                    ? "bg-surface text-text shadow-2xs font-bold border border-line/60"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchDocuments}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text hover:bg-surface transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brass" : ""}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-2xs hover:brightness-110 btn-tactile cursor-pointer shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Ingest Document</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass/10 border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Document Table / Cards */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-brass/10 border border-brass/25 mx-auto flex items-center justify-center text-brass shadow-2xs">
            <Database className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text">No company documents found</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
              Upload your company&apos;s financial models, product roadmaps, legal contracts, or client pitch decks to establish persistent, citation-backed memory.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-2xs btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const fileInfo = getFileTypeDetails(doc.fileName, doc.fileType);
            const FileIcon = fileInfo.icon;

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-line bg-surface p-5 space-y-4 hover:border-line-strong transition-all flex flex-col justify-between shadow-2xs group"
              >
                <div className="space-y-3">
                  {/* Top Header: File Icon + Title + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center shrink-0 group-hover:border-brass/30 transition-all">
                        <FileIcon className={`w-5 h-5 ${fileInfo.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-text truncate group-hover:text-brass transition-colors" title={doc.title}>
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${fileInfo.badgeColor}`}>
                            {fileInfo.label}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono truncate max-w-[140px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 border ${
                        doc.status === "indexed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                          : doc.status === "processing"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/25 animate-pulse"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/25"
                      }`}
                    >
                      {doc.status === "indexed" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {doc.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                      {doc.status}
                    </span>
                  </div>

                  {doc.errorMessage && (
                    <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{doc.errorMessage}</span>
                    </div>
                  )}

                  {/* Micro-Telemetry Strip */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-surface-2 border border-line text-[11px]">
                    <div>
                      <span className="block text-[9px] text-text-muted uppercase font-mono tracking-wider">Vectors</span>
                      <span className="font-bold font-mono text-text">{doc.chunkCount}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-text-muted uppercase font-mono tracking-wider">Size</span>
                      <span className="font-bold font-mono text-text">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-text-muted uppercase font-mono tracking-wider">Indexed</span>
                      <span className="font-bold font-mono text-text">
                        {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-line text-xs">
                  <button
                    type="button"
                    onClick={() => handleViewChunks(doc)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass hover:underline cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Inspect Chunks ({doc.chunkCount})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleReprocess(doc.id)}
                      className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-text transition-all cursor-pointer"
                      title="Re-index document vectors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 transition-all cursor-pointer"
                      title="Delete document and remove chunks"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Ingest Enterprise Document</h3>
                  <p className="text-[10px] text-text-muted">Direct embedding to company vector database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface border border-line flex items-center justify-center text-text-muted hover:text-text cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1.5">Document Title / Topic</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. FY2026 Strategic Master Plan & Unit Economics"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">File Upload</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2.5 ${
                    dragActive
                      ? "border-brass bg-brass/5"
                      : uploadFile
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-line hover:border-brass/50 bg-surface-2/40 hover:bg-surface-2"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-surface border border-line mx-auto flex items-center justify-center text-brass shadow-2xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text">
                      {uploadFile ? uploadFile.name : "Click to select or drag & drop document"}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {uploadFile
                        ? `${(uploadFile.size / 1024).toFixed(1)} KB • Ready for vectorization`
                        : "Supports PDF, TXT, CSV, JSON, Markdown (up to 15MB)"}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv,.json,.md,.markdown"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? "animate-spin" : ""}`} />
                  <span>{isUploading ? "Chunking & Generating Embeddings…" : "Ingest into Memory"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Chunks Inspector Modal */}
      {activeDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shadow-2xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text truncate max-w-md">{activeDocForPreview.doc.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                    <span className="font-mono">{activeDocForPreview.chunks.length} pgvector chunks</span>
                    <span>•</span>
                    <span className="font-mono">{activeDocForPreview.doc.fileName}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDocForPreview(null)}
                className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface border border-line flex items-center justify-center text-text-muted hover:text-text cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeDocForPreview.chunks.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No chunks generated for this document yet.
                </div>
              ) : (
                activeDocForPreview.chunks.map((chk) => (
                  <div key={chk.id} className="p-4 rounded-xl bg-surface-2 border border-line space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-line text-brass">
                          Chunk #{chk.chunk_index + 1}
                        </span>
                        <span className="font-medium text-text">{chk.section_title || "General Body"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span>{chk.char_count} chars (~{chk.token_estimate} tokens)</span>
                        <button
                          type="button"
                          onClick={() => copyChunkToClipboard(chk.id, chk.content)}
                          className="p-1 rounded hover:bg-surface text-text-muted hover:text-text cursor-pointer"
                          title="Copy chunk text"
                        >
                          {copiedChunkId === chk.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-line text-xs font-mono text-text/90 leading-relaxed whitespace-pre-wrap selection:bg-brass/20">
                      {chk.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-line shrink-0">
              <button
                type="button"
                onClick={() => setActiveDocForPreview(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
