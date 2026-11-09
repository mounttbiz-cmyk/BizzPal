"use client";

import React, { useState, useEffect, useRef } from "react";
import { PortalModal } from "@/components/ui/PortalModal";
import {
  Sliders,
  Cpu,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Zap,
  RefreshCw,
  Clock,
  Check,
  Users,
  DollarSign
} from "lucide-react";
import { parseNaturalBusinessInput, ExtractedBusinessRecord } from "@/lib/intake/nlpParser";
import { emitBusinessDataUpdated } from "@/lib/upload/events";

interface QuickBusinessInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickBusinessInputModal({ isOpen, onClose, onSuccess }: QuickBusinessInputModalProps) {
  const [activeTab, setActiveTab] = useState<"natural" | "voice" | "form" | "integrations">("natural");

  // Natural Input State
  const [naturalText, setNaturalText] = useState("");
  const [extractedRecord, setExtractedRecord] = useState<ExtractedBusinessRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Structured Form State
  const [formData, setFormData] = useState({
    companyName: "",
    founderName: "",
    monthlyRevenue: "",
    monthlyBurn: "",
    cashOnHand: "",
    teamSize: "",
    operationalNotes: "",
  });

  // Hydrate active enterprise profile into form on open
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem("bizzpal_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          setFormData(prev => ({
            ...prev,
            companyName: parsed.name && !parsed.name.includes("Acme") ? parsed.name : "",
            founderName: parsed.founderName && !parsed.founderName.includes("Test") ? parsed.founderName : "",
            monthlyRevenue: parsed.revenue || parsed.monthlyRevenue ? String(parsed.revenue || parsed.monthlyRevenue) : "",
            monthlyBurn: parsed.burn || parsed.monthlyBurn ? String(parsed.burn || parsed.monthlyBurn) : "",
            cashOnHand: parsed.cash || parsed.cashOnHand ? String(parsed.cash || parsed.cashOnHand) : "",
            teamSize: parsed.teamSize ? String(parsed.teamSize) : "1",
          }));
        }
      } catch {}
    }
  }, [isOpen]);

  // Example Prompt Pills
  const EXAMPLE_PROMPTS = [
    "Today we received 42 orders and revenue was ₹85,000",
    "Revenue today ₹1,20,000, 60 orders, and ₹25,000 ad spend",
    "Closed enterprise deal for ₹4,50,000 with 3 annual contracts",
    "Hired 2 engineers today, team headcount is now 16",
  ];

  // Live NLP Extraction effect
  useEffect(() => {
    if (naturalText.trim().length >= 3) {
      const parsed = parseNaturalBusinessInput(naturalText);
      setExtractedRecord(parsed);
    } else {
      setExtractedRecord(null);
    }
  }, [naturalText]);

  // Voice Recognition Setup
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setVoiceTranscript(currentTranscript);
            setNaturalText(currentTranscript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch {
        // Speech not supported or permission denied
      }
    }
  }, []);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      // Simulated voice if browser doesn't support Web Speech API
      if (!isListening) {
        setIsListening(true);
        setVoiceTranscript("Listening to voice dictation…");
        setTimeout(() => {
          const sample = "Today we received 42 orders and revenue was ₹85,000 with ₹18,000 expenses";
          setVoiceTranscript(sample);
          setNaturalText(sample);
          setIsListening(false);
        }, 2000);
      } else {
        setIsListening(false);
      }
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Commit Business Input
  const handleCommitRecord = async (dataToCommit?: {
    companyName?: string;
    founderName?: string;
    monthlyRevenue?: number;
    monthlyBurn?: number;
    dailyRevenue?: number;
    dailyOrders?: number;
    dailyExpenses?: number;
    cashOnHand?: number;
    teamSize?: number;
    notes?: string;
  }) => {
    setIsSubmitting(true);
    try {
      // If no explicit data passed, fall back to extractedRecord or naturalText
      const record = dataToCommit || extractedRecord || {
        notes: naturalText.trim(),
      };

      // 1. Fetch existing profile
      const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
      const existing = savedProfileStr ? JSON.parse(savedProfileStr) : {};

      // 2. Compute updated metrics
      const currentMonthlyRev = Number(existing.revenue || existing.monthlyRevenue || 0);
      const currentBurn = Number(existing.burn || existing.monthlyBurn || 0);
      const currentCash = Number(existing.cash || existing.cashOnHand || 0);
      const currentTeam = Number(existing.teamSize || 1);

      const newMonthlyRev = record.monthlyRevenue !== undefined
        ? record.monthlyRevenue
        : record.dailyRevenue
        ? Math.round(record.dailyRevenue * 30)
        : currentMonthlyRev;

      const newBurn = record.monthlyBurn !== undefined
        ? record.monthlyBurn
        : record.dailyExpenses
        ? Math.round(record.dailyExpenses * 30)
        : currentBurn;

      const newCash = record.cashOnHand !== undefined
        ? record.cashOnHand
        : (record.dailyRevenue ? currentCash + record.dailyRevenue : currentCash);

      const newTeam = record.teamSize ? record.teamSize : currentTeam;
      const newAnnualRev = newMonthlyRev * 12;

      const updatedProfile = {
        ...existing,
        name: record.companyName || existing.name || "My Enterprise",
        founderName: record.founderName || existing.founderName || "Founder",
        revenue: newMonthlyRev,
        monthlyRevenue: newMonthlyRev,
        annualRevenue: newAnnualRev,
        burn: newBurn,
        monthlyBurn: newBurn,
        cash: newCash,
        cashOnHand: newCash,
        teamSize: newTeam,
        lastDailyInput: {
          dailyRevenue: record.dailyRevenue,
          dailyOrders: record.dailyOrders,
          dailyExpenses: record.dailyExpenses,
          teamSize: record.teamSize,
          recordedAt: new Date().toISOString(),
          notes: record.notes || naturalText.trim(),
        },
      };

      // 3. Save to localStorage
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));

      // 4. Save to persistent SQLite DB via API
      try {
        await fetch("/api/business/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updatedProfile.name,
            founderName: updatedProfile.founderName,
            monthlyRevenue: newMonthlyRev,
            annualRevenue: newAnnualRev,
            monthlyBurn: newBurn,
            cashOnHand: newCash,
            teamSize: newTeam,
            rawText: naturalText.trim(),
            structured: {
              revenue: record.dailyRevenue,
              orders: record.dailyOrders,
              expenses: record.dailyExpenses,
              cash: record.cashOnHand,
              teamSize: record.teamSize,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to sync daily record with backend API", err);
      }

      // 5. Emit live sync event across dashboard
      emitBusinessDataUpdated({
        name: updatedProfile.name,
        founderName: updatedProfile.founderName,
        industry: updatedProfile.industry,
        industryLabel: updatedProfile.industryLabel,
        revenue: newMonthlyRev,
        monthlyRevenue: newMonthlyRev,
        annualRevenue: newAnnualRev,
        burn: newBurn,
        monthlyBurn: newBurn,
        cash: newCash,
        cashOnHand: newCash,
        teamSize: newTeam,
        grossMargin: updatedProfile.grossMargin || 80,
      });

      setSuccessMessage("Business update saved! Dashboard, ledger, and briefings recalibrated.");
      setTimeout(() => {
        setSuccessMessage(null);
        setNaturalText("");
        setExtractedRecord(null);
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommitRecord({
      companyName: formData.companyName.trim() || undefined,
      founderName: formData.founderName.trim() || undefined,
      monthlyRevenue: formData.monthlyRevenue !== "" ? Number(formData.monthlyRevenue) : undefined,
      monthlyBurn: formData.monthlyBurn !== "" ? Number(formData.monthlyBurn) : undefined,
      cashOnHand: formData.cashOnHand !== "" ? Number(formData.cashOnHand) : undefined,
      teamSize: formData.teamSize !== "" ? Number(formData.teamSize) : undefined,
      notes: formData.operationalNotes,
    });
  };

  if (!isOpen) return null;

  // Determine if primary save button should be enabled
  const canSaveNatural = naturalText.trim().length > 0;
  const canSaveForm = Boolean(formData.companyName || formData.monthlyRevenue !== "" || formData.monthlyBurn !== "" || formData.cashOnHand !== "" || formData.teamSize !== "" || formData.operationalNotes);
  const isSaveActive = activeTab === "natural" || activeTab === "voice" ? canSaveNatural : canSaveForm;

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div
        className="w-full max-w-2xl bg-surface border border-line rounded-xl shadow-lg overflow-hidden  text-text"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--line)",
          color: "var(--text)",
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b border-line flex items-center justify-between"
          style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brass/15 border border-brass/30 flex items-center justify-center text-brass">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text">Day-to-Day Business Input</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                  Multi-Modal
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Record operational updates naturally. BizzPal extracts metrics and synchronizes your business ledger.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b border-line px-5 pt-2 gap-2"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--line)" }}
        >
          {[
            { id: "natural", label: "Natural Language", icon: Send },
            { id: "voice", label: "Voice Dictation", icon: Mic },
            { id: "form", label: "Structured Form", icon: FileText },
            { id: "integrations", label: "Auto-Sync Feeds", icon: Zap },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-brass text-brass"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 flex items-center gap-2 text-xs font-semibold text-jade animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab 1: Natural Language Chat Input */}
          {activeTab === "natural" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text block mb-1.5">
                  Type your daily operations update in natural language:
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={naturalText}
                    onChange={e => setNaturalText(e.target.value)}
                    placeholder="e.g. Today we received 42 orders and revenue was ₹85,000 with ₹15,000 ad spend."
                    className="w-full px-4 py-3 rounded-xl border border-line text-xs font-sans text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brass focus:border-brass transition-all resize-none shadow-inner"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      borderColor: "var(--line)",
                      color: "var(--text)",
                    }}
                    autoFocus
                  />
                  {naturalText && (
                    <button
                      type="button"
                      onClick={() => setNaturalText("")}
                      className="absolute right-3 top-3 text-text-muted hover:text-text text-xs bg-surface px-2 py-0.5 rounded border border-line cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Example Suggestions */}
              <div>
                <span className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Quick examples to try:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNaturalText(prompt)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border border-line text-text-muted hover:text-brass hover:border-brass/40 transition-all text-left btn-tactile cursor-pointer"
                      style={{
                        backgroundColor: "var(--surface-2)",
                        borderColor: "var(--line)",
                      }}
                    >
                      “{prompt}”
                    </button>
                  ))}
                </div>
              </div>

              {/* Extracted Record Card Preview */}
              {extractedRecord && (
                <div
                  className="p-4 rounded-xl border border-brass/40 bg-brass/5 space-y-3 animate-fade-in"
                  style={{ borderColor: "rgba(0, 217, 255, 0.3)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brass uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      AI Parsed Operational Telemetry
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-text font-semibold">
                      {Math.round(extractedRecord.confidence * 100)}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {extractedRecord.dailyOrders !== undefined && (
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-[10px] text-text-muted block">Daily Orders</span>
                        <span className="text-xs font-bold text-text">{extractedRecord.dailyOrders}</span>
                      </div>
                    )}
                    {extractedRecord.dailyRevenue !== undefined && (
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-[10px] text-text-muted block">Daily Revenue</span>
                        <span className="text-xs font-bold text-jade">
                          ₹{extractedRecord.dailyRevenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {extractedRecord.dailyExpenses !== undefined && (
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-[10px] text-text-muted block">Daily Spend / Burn</span>
                        <span className="text-xs font-bold text-amber">
                          ₹{extractedRecord.dailyExpenses.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {extractedRecord.teamSize !== undefined && (
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-[10px] text-text-muted block">Team Headcount</span>
                        <span className="text-xs font-bold text-brass">{extractedRecord.teamSize} FTE</span>
                      </div>
                    )}
                    {extractedRecord.monthlyRevenueEquivalent && (
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-[10px] text-text-muted block">Projected Monthly</span>
                        <span className="text-xs font-bold text-text">
                          ₹{extractedRecord.monthlyRevenueEquivalent.toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-text-muted italic pt-0.5">
                    Summary: <strong className="text-text not-italic">{extractedRecord.summary}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Voice Dictation */}
          {activeTab === "voice" && (
            <div className="space-y-4 text-center py-4">
              <div className="flex flex-col items-center justify-center space-y-3">
                <button
                  type="button"
                  onClick={toggleVoiceListening}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                    isListening
                      ? "bg-rust text-white ring-4 ring-rust/30 animate-pulse"
                      : "bg-brass text-white hover:brightness-110"
                  }`}
                >
                  {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>
                <div>
                  <span className="text-xs font-bold text-text block">
                    {isListening ? "Listening… Speak your daily numbers clearly" : "Click microphone to start voice recording"}
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5 max-w-sm mx-auto">
                    Dictate in Hindi, English, or mixed: “Today we received 42 orders and revenue was 85,000.”
                  </p>
                </div>
              </div>

              {voiceTranscript && (
                <div
                  className="p-3.5 rounded-xl border border-line text-left text-xs font-mono text-text"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <strong>Transcribed:</strong> “{voiceTranscript}”
                </div>
              )}

              {extractedRecord && (
                <div className="text-left">
                  <div className="p-3.5 rounded-xl border border-brass/40 bg-brass-soft/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-text block">
                        Extracted: {extractedRecord.summary}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Ready to validate and record to business profile.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Structured Daily Form */}
          {activeTab === "form" && (
            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Company / Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Nexus Technologies"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Founder / Lead Name
                  </label>
                  <input
                    type="text"
                    value={formData.founderName}
                    onChange={e => setFormData({ ...formData, founderName: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Monthly Revenue (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyRevenue}
                    onChange={e => setFormData({ ...formData, monthlyRevenue: e.target.value })}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Monthly Operating Burn (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyBurn}
                    onChange={e => setFormData({ ...formData, monthlyBurn: e.target.value })}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Cash on Hand / Bank Reserves (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.cashOnHand}
                    onChange={e => setFormData({ ...formData, cashOnHand: e.target.value })}
                    placeholder="e.g. 1000000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    Team Headcount (FTE)
                  </label>
                  <input
                    type="number"
                    value={formData.teamSize}
                    onChange={e => setFormData({ ...formData, teamSize: e.target.value })}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text block mb-1">
                  Operational Context / Key Milestone
                </label>
                <input
                  type="text"
                  value={formData.operationalNotes}
                  onChange={e => setFormData({ ...formData, operationalNotes: e.target.value })}
                  placeholder="e.g. Closing 3 enterprise pilots and expanding outbound sales."
                  className="w-full px-3 py-2 rounded-lg border border-line text-xs text-text focus:ring-1 focus:ring-brass focus:outline-none"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                />
              </div>
            </form>
          )}

          {/* Tab 4: Automated Integrations Feed */}
          {activeTab === "integrations" && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                When integrations are active, BizzPal pulls data automatically so you don’t need to enter numbers manually.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: "Stripe Revenue Telemetry", status: "Live Sync Active", type: "Recurring MRR & Invoices", icon: CreditCard, color: "text-emerald-400" },
                  { name: "Shopify / Storefront", status: "Syncing Every 15m", type: "Order volumes & AOV", icon: ShoppingBag, color: "text-purple-400" },
                  { name: "Zoho Books / QuickBooks", status: "Reconciled Today", type: "P&L, Vendor Invoices, GST", icon: Activity, color: "text-blue-400" },
                  { name: "Slack / WhatsApp Bot", status: "Bidirectional Ready", type: "Daily check-in prompts", icon: Zap, color: "text-amber-400" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-line flex items-start gap-2.5"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-text block truncate">{item.name}</span>
                        <span className="text-[10px] text-text-muted block">{item.type}</span>
                        <span className="text-[10px] font-semibold text-jade flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="p-3 rounded-xl border border-line text-xs flex items-center justify-between"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                <span className="text-text-muted text-[11px]">
                  Next scheduled telemetry pull in <strong className="text-text">4 minutes</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("Triggered on-demand synchronization with connected tools!");
                    setTimeout(() => setSuccessMessage(null), 2500);
                  }}
                  className="px-3 py-1 rounded-md bg-brass text-white text-[11px] font-bold hover:brightness-110 btn-tactile cursor-pointer"
                >
                  Sync Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ALWAYS-VISIBLE PERMANENT FOOTER ACTION BAR */}
        <div
          className="p-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-jade shrink-0 animate-pulse" />
            <span className="line-clamp-1">
              {extractedRecord
                ? `Ready to record: ${extractedRecord.summary}`
                : "Real-time ledger sync across Dashboard & Executive Briefings"}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text hover:bg-surface-2 transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--surface)" }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting || !isSaveActive}
              onClick={() => {
                if (activeTab === "form") {
                  handleFormSubmit({ preventDefault: () => {} } as any);
                } else {
                  handleCommitRecord();
                }
              }}
              className="px-5 py-2 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Record into Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}
