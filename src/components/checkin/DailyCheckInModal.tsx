"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CheckSquare,
  DollarSign,
  Users,
  ShieldAlert,
  Zap,
  Info
} from "lucide-react";
import { CheckInQuestion } from "@/lib/checkin/generateQuestions";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { createPortal } from "react-dom";

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (data: any) => void;
  questionRules?: {
    skipRevenue?: boolean;
    skipTech?: boolean;
  };
  questions?: CheckInQuestion[];
}

export function DailyCheckInModal({
  isOpen,
  onClose,
  onCompleted,
  questionRules,
  questions: propQuestions,
}: DailyCheckInModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<CheckInQuestion[]>(propQuestions || []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipRevenueBanner, setSkipRevenueBanner] = useState(Boolean(questionRules?.skipRevenue));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // If questions were not passed in props, fetch them from the API on open
  useEffect(() => {
    if (isOpen) {
      if (propQuestions && propQuestions.length > 0) {
        setDynamicQuestions(propQuestions);
      } else {
        setLoadingQuestions(true);
        fetch("/api/checkin")
          .then(res => res.json())
          .then(data => {
            if (data.questions && data.questions.length > 0) {
              setDynamicQuestions(data.questions);
            }
            if (data.questionRules?.skipRevenue !== undefined) {
              setSkipRevenueBanner(data.questionRules.skipRevenue);
            }
          })
          .catch(err => console.error("Failed to load checkin questions", err))
          .finally(() => setLoadingQuestions(false));
      }
    }
  }, [isOpen, propQuestions]);

  // Close modal when Escape key is pressed
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: prev[questionId] === option ? "" : option,
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    // Build raw summary string from questions and recorded answers
    const summaryParts: string[] = [];
    dynamicQuestions.forEach(q => {
      const val = answers[q.id] || "Nominal / None";
      summaryParts.push(`${q.category}: ${val}`);
    });

    const rawSummary = summaryParts.join(" · ");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          rawText: rawSummary,
          source: "manual_web",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCompleted(data);
        onClose();
      }
    } catch (err) {
      console.error("Failed to submit daily check-in", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to render relevant question icon
  const renderQuestionIcon = (iconType: string) => {
    switch (iconType) {
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "flame":
        return <Flame className="w-3.5 h-3.5 text-rust shrink-0" />;
      case "task":
        return <CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case "dollar":
        return <DollarSign className="w-3.5 h-3.5 text-jade shrink-0" />;
      case "users":
        return <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case "shield":
        return <ShieldAlert className="w-3.5 h-3.5 text-rust shrink-0" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-brass shrink-0" />;
    }
  };

  // Helper to render badge styles
  const getBadgeStyle = (color: string) => {
    switch (color) {
      case "rust":
        return "bg-rust/15 text-rust border-rust/30";
      case "amber":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "purple":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "cyan":
        return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
      case "jade":
        return "bg-jade/15 text-jade border-jade/30";
      default:
        return "bg-brass-soft text-brass border-brass/30";
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 m-0 z-[9999] bg-slate-950/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
      onClick={onClose}
    >
      <div
        className="max-w-xl w-full p-6 rounded-2xl bg-surface border border-line shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brass-soft text-brass border border-brass/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text">Daily Executive Check-In</h2>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-semibold">
                  &lt; 60 seconds
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Context-aware pulse calibrated to recent problems, active tasks, and operational bottlenecks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text font-semibold px-2 py-1 rounded bg-surface-2 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Stripe Telemetry Banner */}
        {skipRevenueBanner && (
          <div className="p-3 rounded-xl bg-jade/10 border border-jade/20 text-xs text-jade flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Live Telemetry Connected:</span> Daily revenue and sales volume are auto-streamed via Stripe / Accounting. This check-in focuses strictly on recent operational bottlenecks, active tasks, and delivery blockers.
            </div>
          </div>
        )}

        {loadingQuestions ? (
          <div className="py-12 text-center text-xs text-text-muted space-y-2">
            <div className="w-5 h-5 border-2 border-brass border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Analyzing recent business problems and active tasks…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {dynamicQuestions.map((q, index) => {
              const currentVal = answers[q.id] || "";

              return (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl border border-line bg-surface-2/40 space-y-2.5 transition-all hover:border-line-strong"
                >
                  {/* Top Category Badge & Question Title */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border font-mono ${getBadgeStyle(
                          q.badgeColor
                        )}`}
                      >
                        {q.badge}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono font-medium">
                        Q{index + 1} of {dynamicQuestions.length}
                      </span>
                    </div>

                    <label className="font-bold text-text flex items-start gap-1.5 leading-snug">
                      <span className="mt-0.5">{renderQuestionIcon(q.iconType)}</span>
                      <span>{q.title}</span>
                    </label>

                    {q.subtext && (
                      <p className="text-[11px] text-text-muted mt-1 ml-5 leading-relaxed">
                        {q.subtext}
                      </p>
                    )}
                  </div>

                  {/* Dynamic Option Pills */}
                  {q.quickOptions && q.quickOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-5">
                      {q.quickOptions.map(opt => {
                        const isSelected = currentVal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`px-2.5 py-1 rounded-md text-[11px] border transition-all cursor-pointer btn-tactile ${
                              isSelected
                                ? "bg-brass text-white border-brass font-semibold shadow-sm"
                                : "bg-surface border-line text-text-muted hover:text-text hover:border-line-strong"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Free-form Input */}
                  <div className="ml-5">
                    <input
                      type="text"
                      value={currentVal}
                      onChange={e => handleTextChange(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass focus:border-brass transition-all placeholder:text-text-muted/60"
                    />
                  </div>
                </div>
              );
            })}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Info className="w-3.5 h-3.5 text-brass shrink-0" />
                <span>Synchronizes Astra, Marcus & Elena daily executive briefings.</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Synchronizing Pulse…" : "Submit Daily Check-In"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(modalContent, document.body);
}
