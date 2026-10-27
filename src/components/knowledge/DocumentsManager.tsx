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

export function DocumentsManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeDocForPreview, setActiveDocForPreview] = useState<{ doc: DocumentItem; chunks: ChunkItem[] } | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
        setToastMessage(`Document "${uploadTitle || uploadFile.name}" indexed with ${data.result?.chunkCount || 0} chunks!`);
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
      setToastMessage("Re-indexing chunks and generating embeddings…");
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

  const filteredDocs = documents.filter((d) =>
    searchFilter ? d.title.toLowerCase().includes(searchFilter.toLowerCase()) || d.fileName.toLowerCase().includes(searchFilter.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-2 border border-line">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter company documents…"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:border-brass/70"
            />
          </div>
          <button
            type="button"
            onClick={fetchDocuments}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface border border-line text-text-muted hover:text-text cursor-pointer"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brass" : ""}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-sm hover:brightness-110 btn-tactile cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Ingest Document</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-brass" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Document Table / Cards */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brass-soft mx-auto flex items-center justify-center text-brass">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-text">No company documents uploaded yet</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
            Upload your company&apos;s business documents, financial reports, operational standard operating procedures (SOPs), or pitch decks to establish persistent company memory.
          </p>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-line bg-surface p-5 space-y-4 hover:border-line-strong transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-brass">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text line-clamp-1">{doc.title}</h4>
                      <p className="text-[10px] text-text-muted font-mono">{doc.fileName}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      doc.status === "indexed"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : doc.status === "processing"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                {doc.errorMessage && (
                  <p className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {doc.errorMessage}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted bg-surface-2/50 p-2.5 rounded-xl border border-line/60">
                  <div>
                    <span className="block text-[10px] text-text-muted/60">Chunks Indexed</span>
                    <span className="font-bold text-text">{doc.chunkCount} vectors</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted/60">File Size</span>
                    <span className="font-bold text-text">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-line text-[11px]">
                <button
                  type="button"
                  onClick={() => handleViewChunks(doc)}
                  className="flex items-center gap-1 text-brass hover:underline cursor-pointer font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Chunks</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReprocess(doc.id)}
                    className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-text-muted hover:text-text cursor-pointer"
                    title="Reprocess and re-embed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brass" />
                <h3 className="text-sm font-bold text-text">Ingest Company Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Document Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Q4 2025 Marketing Strategy & Performance"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Document File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-line hover:border-brass/50 rounded-2xl p-6 text-center cursor-pointer bg-surface-2/40 hover:bg-surface-2 transition-all space-y-2"
                >
                  <UploadCloud className="w-8 h-8 mx-auto text-brass/70" />
                  <p className="text-xs font-semibold text-text">
                    {uploadFile ? uploadFile.name : "Click to select or drag document"}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Supports PDF, TXT, CSV, JSON, Markdown (up to 15MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv,.json,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? "animate-spin" : ""}`} />
                  <span>{isUploading ? "Chunking & Embedding…" : "Ingest into Memory"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Chunks Inspector Modal */}
      {activeDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brass" />
                <div>
                  <h3 className="text-sm font-bold text-text">{activeDocForPreview.doc.title}</h3>
                  <p className="text-[10px] text-text-muted">
                    {activeDocForPreview.chunks.length} pgvector chunks indexed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDocForPreview(null)}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeDocForPreview.chunks.map((chk) => (
                <div key={chk.id} className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <span>Chunk #{chk.chunk_index + 1} • {chk.section_title || "General"}</span>
                    <span>{chk.char_count} chars (~{chk.token_estimate} tokens) • Page {chk.page_number || 1}</span>
                  </div>
                  <p className="text-xs text-text/90 leading-relaxed font-mono whitespace-pre-wrap">
                    {chk.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-line shrink-0">
              <button
                type="button"
                onClick={() => setActiveDocForPreview(null)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
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
