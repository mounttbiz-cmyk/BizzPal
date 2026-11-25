"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

/* Shared building blocks for the admin console, so every screen looks and behaves the same. */

export const inputClass =
  "w-full h-10 px-3 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";
export const labelClass = "block text-sm font-medium text-text mb-1.5";
export const primaryButton =
  "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
export const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
export const iconButton =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50";
export const dangerIconButton =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer disabled:opacity-50";

/** ₹ amounts in Indian units; a figure that was never entered shows as a dash, not ₹0. */
export function formatInr(n?: number | null) {
  const v = Number(n) || 0;
  if (v <= 0) return "—";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${v.toLocaleString("en-IN")}`;
}

/** "Just now", "3 hours ago", "12 Nov 2026" */
export function formatWhen(dateStr?: string | null) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Exact time with seconds: "Today, 2:34:50 pm", "Yesterday, 9:05:12 am", "24 Nov 2026, 11:00:03 am" */
export function formatLoginTime(dateStr?: string | null) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${time}`;
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function initialsOf(name?: string | null) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function Avatar({ name, src, size = 36 }: { name?: string | null; src?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="rounded-lg object-contain bg-surface border border-line shrink-0" />;
  }
  return (
    <span style={style} className="rounded-lg bg-surface-2 border border-line text-xs font-medium text-text-muted flex items-center justify-center shrink-0">
      {initialsOf(name)}
    </span>
  );
}

export function StatCard({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 min-w-0">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="text-2xl font-semibold text-text mt-1.5 tabular-nums truncate">{value}</p>
      {note ? <p className="text-xs text-text-muted mt-1 truncate">{note}</p> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

/** A white card that holds a table or a list */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface overflow-hidden ${className}`}>{children}</div>;
}

export function PanelToolbar({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center gap-3">{children}</div>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {text ? <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export const th = "px-4 py-2.5 text-xs font-medium text-text-muted text-left whitespace-nowrap bg-surface-2/50";
export const td = "px-4 py-3 align-middle";

/** Status pill: on / off */
export function StatusToggle({ on, onClick, onLabel = "Shown", offLabel = "Hidden" }: { on: boolean; onClick: () => void; onLabel?: string; offLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? "Click to hide" : "Click to show"}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
        on ? "border-jade/30 bg-jade/10 text-jade hover:bg-jade/15" : "border-line bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-jade" : "bg-text-muted/60"}`} />
      {on ? onLabel : offLabel}
    </button>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full shrink-0 cursor-pointer transition-colors ${on ? "bg-brass" : "bg-line-strong"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

/** Centred dialog: dims the page (no blur), closes on Escape or a click outside, locks the page scroll. */
export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/40 cursor-default" />
      <div className={`relative w-full ${width} max-h-[88vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl`}>
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {subtitle ? <p className="text-sm text-text-muted mt-0.5">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={`${iconButton} -mr-2`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2 shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
