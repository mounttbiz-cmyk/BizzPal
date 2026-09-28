"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { parseUploadedContent, generateSampleBusinessCsv, ParsedBusinessMetrics } from "@/lib/upload/dataParser";
import { emitBusinessDataUpdated, useBusinessDataSync, downloadFile } from "@/lib/upload/events";
import { UploadDataModal } from "../upload/UploadDataModal";

export function DataUploadWidget() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedBusinessMetrics | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDatasetName, setActiveDatasetName] = useState<string | null>(null);
  const [activeUploadDate, setActiveUploadDate] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync active dataset info from local storage or API
  const refreshActiveDataset = () => {
    try {
      const savedStr = localStorage.getItem("bizzpal_business_profile");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.isUploadedData && saved.sourceFileName) {
          setActiveDatasetName(saved.sourceFileName);
          setActiveUploadDate(saved.lastUploadedAt ? new Date(saved.lastUploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
        } else {
          setActiveDatasetName(null);
          setActiveUploadDate(null);
        }
      }
    } catch {}
  };

  useEffect(() => {
    refreshActiveDataset();
  }, []);

  useBusinessDataSync(() => {
    refreshActiveDataset();
  });

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
    setErrorMessage(null);
    setStatus("idle");
    try {
      const text = await file.text();
      const parsed = parseUploadedContent(text, file.name);
      setParsedPreview(parsed);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse file.");
      setParsedPreview(null);
      setStatus("error");
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

  const handleApply = async () => {
    if (!parsedPreview) return;
    setStatus("uploading");
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
      if (!data.success) throw new Error(data.error || "Upload failed");

      emitBusinessDataUpdated(data.metrics);
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setSelectedFile(null);
        setParsedPreview(null);
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
      setStatus("error");
    }
  };

  return (
    <>
      <ContainerTile span={2} id="widget_data_upload">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                  Business Data Upload
                </h2>
                <p className="text-[11px] text-text-muted">
                  Import CSV or JSON to calibrate dashboard metrics.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Center</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Active Dataset Status Bar */}
          {activeDatasetName && (
            <div className="p-2.5 rounded-xl bg-jade/10 border border-jade/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-4 h-4 text-jade shrink-0" />
                <span className="font-semibold text-text truncate">
                  Active: {activeDatasetName}
                </span>
                {activeUploadDate && (
                  <span className="text-[10px] text-text-muted font-mono shrink-0">
                    ({activeUploadDate})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold uppercase shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {/* Interactive Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all ${
              dragActive
                ? "border-cyan-400 bg-cyan-500/10"
                : "border-line hover:border-cyan-500/40 bg-surface-2/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {status === "success" ? (
              <div className="flex flex-col items-center gap-2 text-jade py-2">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
                <span className="text-xs font-bold">Dashboard Synchronized Successfully!</span>
              </div>
            ) : status === "uploading" ? (
              <div className="flex flex-col items-center gap-2 text-cyan-400 animate-pulse py-2">
                <UploadCloud className="w-8 h-8" />
                <span className="text-xs font-bold">Recalibrating Executive Telemetry...</span>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="widget-file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".csv,.json,.txt"
                />

                <label
                  htmlFor="widget-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-1.5 group w-full"
                >
                  <div className="p-2.5 rounded-xl bg-surface border border-line group-hover:border-cyan-400/50 transition-colors">
                    <FileText className="w-5 h-5 text-text-muted group-hover:text-cyan-400" />
                  </div>
                  <span className="text-xs font-bold text-text truncate max-w-full px-2">
                    {selectedFile ? selectedFile.name : "Click to select or drag & drop CSV / JSON"}
                  </span>
                  <p className="text-[10px] text-text-muted">
                    Recognizes revenue, burn, cash reserves, team size, margins
                  </p>
                </label>

                {errorMessage && (
                  <div className="mt-2 text-[11px] text-rust flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Parsed Quick Summary */}
                {parsedPreview && (
                  <div className="mt-3 w-full p-2.5 rounded-lg bg-surface border border-line text-left space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted font-semibold">Detected Monthly Rev:</span>
                      <span className="font-mono font-bold text-cyan-500">
                        ₹{(parsedPreview.monthlyRevenue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted font-semibold">Net Monthly Burn:</span>
                      <span className="font-mono font-bold text-amber-500">
                        ₹{(parsedPreview.monthlyBurn || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {parsedPreview.runwayMonths && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted font-semibold">Runway:</span>
                        <span className="font-mono font-bold text-jade">
                          {parsedPreview.runwayMonths} mo
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleApply}
                      className="mt-2 w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:brightness-110 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply to Dashboard</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with Sample Template Download */}
          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              type="button"
              onClick={() =>
                downloadFile(generateSampleBusinessCsv(), "bizzpal_business_data_template.csv")
              }
              className="text-text-muted hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Sample CSV Template</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-text-muted hover:text-text font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Manual Entry & History →</span>
            </button>
          </div>
        </div>
      </ContainerTile>

      {/* Modal Integration */}
      <UploadDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refreshActiveDataset();
        }}
      />
    </>
  );
}
