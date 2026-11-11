"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContainerTile } from "../ui/ContainerTile";
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
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Upload your data</h2>
              <p className="text-sm text-text-muted mt-0.5">Add a CSV or JSON file to update your dashboard.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-sm text-brass hover:underline cursor-pointer shrink-0"
            >
              More options
            </button>
          </div>

          {activeDatasetName && (
            <div className="px-3.5 py-3 rounded-xl bg-surface-2/60 flex items-center justify-between gap-3 text-sm">
              <span className="text-text truncate">
                In use: {activeDatasetName}
                {activeUploadDate && <span className="text-text-muted"> ({activeUploadDate})</span>}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-brass hover:underline shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          <div
            className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center ${
              dragActive ? "border-brass bg-brass/5" : "border-line-strong"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {status === "success" ? (
              <p className="text-sm text-jade py-2">Dashboard updated.</p>
            ) : status === "uploading" ? (
              <p className="text-sm text-text-muted py-2">Updating your dashboard…</p>
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

                <label htmlFor="widget-file-upload" className="cursor-pointer block w-full">
                  <span className="block text-sm text-text truncate px-2">
                    {selectedFile ? selectedFile.name : "Choose a file or drag it here"}
                  </span>
                  <span className="block text-xs text-text-muted mt-1">
                    We look for revenue, costs, cash, team size and margins.
                  </span>
                </label>

                {errorMessage && <p className="mt-3 text-sm text-rust">{errorMessage}</p>}

                {parsedPreview && (
                  <div className="mt-4 w-full rounded-xl bg-surface-2/60 p-3.5 text-left space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Monthly revenue</span>
                      <span className="text-text">₹{(parsedPreview.monthlyRevenue || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Monthly costs</span>
                      <span className="text-text">₹{(parsedPreview.monthlyBurn || 0).toLocaleString("en-IN")}</span>
                    </div>
                    {parsedPreview.runwayMonths && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Cash runway</span>
                        <span className="text-text">{parsedPreview.runwayMonths} months</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleApply}
                      className="mt-2 w-full py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                    >
                      Apply to dashboard
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => downloadFile(generateSampleBusinessCsv(), "bizzpal_business_data_template.csv")}
            className="text-sm text-text-muted hover:text-text cursor-pointer"
          >
            Download sample CSV
          </button>
        </div>
      </ContainerTile>

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
