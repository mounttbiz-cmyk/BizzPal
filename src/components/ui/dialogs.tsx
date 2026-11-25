"use client";

import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

/*
 * BizzPal's own confirmation window and notices, used instead of the browser's confirm() and alert()
 * (those show a grey box at the top of the screen that says "localhost says" and cannot be styled).
 *
 *   if (!(await askConfirm({ title: "Delete this task?", confirmLabel: "Delete", danger: true }))) return;
 *   showNotice("Could not save. Please try again.", "error");
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red button, for anything that deletes or removes */
  danger?: boolean;
}

function mount(render: (close: () => void) => React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = () => {
    root.unmount();
    host.remove();
  };
  root.render(render(close));
  return close;
}

export function askConfirm(opts: ConfirmOptions): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    mount((close) => (
      <ConfirmBox
        {...opts}
        onDone={(ok) => {
          close();
          resolve(ok);
        }}
      />
    ));
  });
}

function ConfirmBox({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, onDone }: ConfirmOptions & { onDone: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Destructive actions start on Cancel, so a stray Enter never deletes anything
    (danger ? cancelRef : confirmRef).current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [danger, onDone]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={cancelLabel} onClick={() => onDone(false)} className="absolute inset-0 bg-slate-950/40 cursor-default" />
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl p-6">
        <div className="flex items-start gap-4">
          {danger && (
            <span className="w-10 h-10 rounded-full bg-rust/10 text-rust flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-text break-words">{title}</h2>
            {message ? <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{message}</p> : null}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onDone(false)}
            className="h-10 px-4 rounded-lg border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onDone(true)}
            className={`h-10 px-4 rounded-lg text-sm font-medium text-white cursor-pointer focus:outline-none focus-visible:ring-2 ${
              danger ? "bg-rust hover:brightness-110 focus-visible:ring-rust/40" : "bg-brass hover:brightness-110 focus-visible:ring-brass/40"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type Tone = "error" | "success" | "info";
let closeCurrentNotice: (() => void) | null = null;

/** A short message at the bottom of the screen that goes away by itself */
export function showNotice(message: string, tone: Tone = "info") {
  if (typeof document === "undefined") return;
  closeCurrentNotice?.();
  let timer: ReturnType<typeof setTimeout>;
  const close = mount((done) => <Notice message={message} tone={tone} onClose={() => { clearTimeout(timer); done(); closeCurrentNotice = null; }} />);
  closeCurrentNotice = () => {
    clearTimeout(timer);
    close();
  };
  timer = setTimeout(() => {
    closeCurrentNotice?.();
    closeCurrentNotice = null;
  }, tone === "error" ? 6000 : 4000);
}

function Notice({ message, tone, onClose }: { message: string; tone: Tone; onClose: () => void }) {
  const Icon = tone === "error" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  const color = tone === "error" ? "text-rust" : tone === "success" ? "text-jade" : "text-brass";
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] w-[calc(100%-2rem)] max-w-md" role={tone === "error" ? "alert" : "status"}>
      <div className="rounded-xl bg-surface border border-line shadow-lg px-4 py-3 flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
        <p className="text-sm text-text flex-1">{message}</p>
        <button type="button" onClick={onClose} className="text-sm text-text-muted hover:text-text cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
}
