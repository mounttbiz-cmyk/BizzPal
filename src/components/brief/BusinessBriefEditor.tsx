"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, FileUp, Link2, Loader2, Mic, MicOff, PenLine, Sparkles, X } from "lucide-react";

interface Field {
  key: string;
  label: string;
  question: string;
  placeholder: string;
}

interface BriefData {
  businessName: string;
  fields: Field[];
  summary: string;
  values: Record<string, { value: string; source: string; updatedAt: string }>;
  answered: number;
  total: number;
  updatedAt: string | null;
  canEdit: boolean;
  hasGst: boolean;
}

type Source = "describe" | "link" | "file";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-brass disabled:opacity-60";

/**
 * The business brief form, used in Settings and as a step of sign-up. "Fill it in for me" suggests answers from a
 * description, a link, a file or the GST record; nothing is saved until the owner saves.
 */
export function BusinessBriefEditor({
  variant = "settings",
  defaultLink = "",
  onBack,
  onDone,
}: {
  variant?: "settings" | "onboarding";
  /** Pre-filled link (sign-up passes the website verified earlier) */
  defaultLink?: string;
  onBack?: () => void;
  /** Sign-up: called after saving, or when the person skips */
  onDone?: () => void;
}) {
  const onboarding = variant === "onboarding";
  const [data, setData] = useState<BriefData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  // Suggestions for questions that already had an answer: shown under the field to accept or ignore
  const [alternatives, setAlternatives] = useState<Record<string, string>>({});
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/business/brief", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Could not load the brief.");
      setData(d);
      setValues(Object.fromEntries(d.fields.map((f: Field) => [f.key, d.values[f.key]?.value || ""])));
      setSummary(d.summary || "");
      setAlternatives({});
      setSuggested(new Set());
      setDirty(false);
    } catch (e: any) {
      setLoadError(e.message || "Could not load the brief.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Leaving with unsaved answers asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setField = (key: string, value: string) => {
    setValues(v => ({ ...v, [key]: value }));
    setSuggested(s => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    setDirty(true);
    setSaveState(null);
  };

  const applySuggestion = (s: { summary: string; values: Record<string, string> }) => {
    const filled = new Set<string>();
    const alts: Record<string, string> = {};
    const next = { ...values };
    for (const [k, v] of Object.entries(s.values)) {
      if (!next[k]?.trim()) {
        next[k] = v;
        filled.add(k);
      } else if (next[k].trim() !== v.trim()) {
        alts[k] = v;
      }
    }
    setValues(next);
    if (s.summary && !summary.trim()) {
      setSummary(s.summary);
      filled.add("__summary");
    } else if (s.summary && summary.trim() !== s.summary.trim()) {
      alts.__summary = s.summary;
    }
    setSuggested(filled);
    setAlternatives(alts);
    if (filled.size || Object.keys(alts).length) setDirty(true);
    return { filled: filled.size, alternatives: Object.keys(alts).length };
  };

  const save = async (): Promise<boolean> => {
    if (!data) return false;
    setSaving(true);
    setSaveState(null);
    try {
      const res = await fetch("/api/business/brief", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, values }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not save.");
      setData({ ...data, answered: d.answered, total: d.total, updatedAt: d.updatedAt });
      setSuggested(new Set());
      setAlternatives({});
      setDirty(false);
      setSaveState({ ok: true, text: "Saved. Your advisors will use this from your next message." });
      return true;
    } catch (e: any) {
      setSaveState({ ok: false, text: e.message || "Could not save." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <p className="text-sm text-text-muted">
        {loadError}{" "}
        <button type="button" onClick={load} className="text-brass hover:underline cursor-pointer">
          Try again
        </button>
      </p>
    );
  }
  if (!data) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your business brief…
      </div>
    );
  }

  const answeredNow = data.fields.filter(f => values[f.key]?.trim()).length;
  const pct = Math.round((answeredNow / Math.max(1, data.fields.length)) * 100);

  return (
    <div className={onboarding ? "space-y-6" : "max-w-3xl space-y-6 pb-24"}>
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${onboarding ? "sm:justify-end" : ""}`}>
        <div className={onboarding ? "hidden" : ""}>
          <h2 className="text-lg font-semibold text-text">Business brief</h2>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            What {data.businessName || "your business"} does, in your words. Your AI advisors read this before every answer, so the more they know,
            the more useful they are.
          </p>
        </div>
        <div className="sm:w-48 shrink-0">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>Advisors know</span>
            <span className="tabular-nums">
              {answeredNow} of {data.fields.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-brass rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {!data.canEdit && (
        <p className="text-sm text-text-muted rounded-lg border border-line px-4 py-3">Only the account owner can change the business brief.</p>
      )}

      {data.canEdit && <FillPanel hasGst={data.hasGst} defaultLink={defaultLink} onSuggestion={applySuggestion} />}

      <section className="rounded-xl border border-line bg-surface divide-y divide-line">
        <BriefRow
          label="In one sentence"
          question="What does the business do, for whom, and where?"
          placeholder="e.g. We run 3 chai cafés in Bengaluru for office workers, with delivery on Swiggy and Zomato."
          value={summary}
          onChange={v => {
            setSummary(v);
            setSuggested(s => {
              const n = new Set(s);
              n.delete("__summary");
              return n;
            });
            setDirty(true);
            setSaveState(null);
          }}
          suggested={suggested.has("__summary")}
          alternative={alternatives.__summary}
          onUseAlternative={() => {
            setSummary(alternatives.__summary);
            setAlternatives(({ __summary, ...rest }) => rest);
            setDirty(true);
          }}
          onDismissAlternative={() => setAlternatives(({ __summary, ...rest }) => rest)}
          disabled={!data.canEdit}
          maxLength={300}
        />
        {data.fields.map(f => (
          <BriefRow
            key={f.key}
            label={f.label}
            question={f.question}
            placeholder={f.placeholder}
            value={values[f.key] || ""}
            onChange={v => setField(f.key, v)}
            suggested={suggested.has(f.key)}
            alternative={alternatives[f.key]}
            onUseAlternative={() => {
              setField(f.key, alternatives[f.key]);
              setAlternatives(({ [f.key]: _, ...rest }) => rest);
            }}
            onDismissAlternative={() => setAlternatives(({ [f.key]: _, ...rest }) => rest)}
            disabled={!data.canEdit}
            maxLength={600}
          />
        ))}
      </section>

      {onboarding && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {onBack ? (
            <button type="button" onClick={onBack} disabled={saving} className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3">
            {saveState && !saveState.ok && <span className="text-sm text-rust">{saveState.text}</span>}
            {!dirty && answeredNow === 0 ? (
              <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
                Skip for now
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                if (!dirty) return onDone?.();
                if (await save()) onDone?.();
              }}
              disabled={saving || (!dirty && answeredNow === 0)}
              className="px-5 py-2.5 rounded-xl bg-brass text-bg font-medium text-sm hover:brightness-110 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {dirty ? "Save and continue" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {data.canEdit && !onboarding && (
        <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-bg/95 backdrop-blur flex flex-wrap items-center justify-end gap-3 border-t border-line">
          {saveState && <span className={`text-sm mr-auto ${saveState.ok ? "text-text-muted" : "text-rust"}`}>{saveState.text}</span>}
          {!saveState && dirty && <span className="text-sm text-text-muted mr-auto">You have unsaved changes.</span>}
          {dirty && (
            <button type="button" onClick={load} disabled={saving} className="h-9 px-3.5 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save brief
          </button>
        </div>
      )}
    </div>
  );
}

function BriefRow(props: {
  label: string;
  question: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suggested: boolean;
  alternative?: string;
  onUseAlternative: () => void;
  onDismissAlternative: () => void;
  disabled: boolean;
  maxLength: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [props.value]);

  const id = `brief-${props.label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="px-4 sm:px-5 py-4 grid gap-2 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-5">
      <label htmlFor={id} className="pt-1.5">
        <span className="block text-sm font-medium text-text">{props.label}</span>
        <span className="block text-xs text-text-muted mt-0.5">{props.question}</span>
      </label>
      <div>
        <textarea
          id={id}
          ref={ref}
          rows={2}
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          disabled={props.disabled}
          className={`${inputClass} resize-none leading-relaxed ${props.suggested ? "border-brass/50 bg-brass/[0.04]" : ""}`}
        />
        {props.suggested && <p className="mt-1 text-xs text-brass">Suggested from what you shared. Check it, then save.</p>}
        {props.alternative && (
          <div className="mt-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm">
            <p className="text-xs text-text-muted mb-1">Suggested from what you shared:</p>
            <p className="text-text">{props.alternative}</p>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" onClick={props.onUseAlternative} className="font-medium text-brass hover:underline cursor-pointer">
                Use this instead
              </button>
              <button type="button" onClick={props.onDismissAlternative} className="text-text-muted hover:text-text cursor-pointer">
                Keep mine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Fill it in for me": from a description, a link or a file (and the GST registration when there is one). */
function FillPanel({
  hasGst,
  defaultLink,
  onSuggestion,
}: {
  hasGst: boolean;
  defaultLink: string;
  onSuggestion: (s: { summary: string; values: Record<string, string> }) => { filled: number; alternatives: number };
}) {
  const [source, setSource] = useState<Source>(defaultLink ? "link" : "describe");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState(defaultLink);
  const [file, setFile] = useState<File | null>(null);
  const [useGst, setUseGst] = useState(hasGst);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const speechSupported = typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let heard = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) heard += e.results[i][0].transcript;
      if (heard.trim()) setDescription(d => (d.trim() ? `${d.trim()} ${heard.trim()}` : heard.trim()));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const ready =
    (source === "describe" && description.trim().length >= 15) || (source === "link" && link.trim().length > 3) || (source === "file" && file) || useGst;

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      if (source === "describe" && description.trim()) form.set("description", description.trim());
      if (source === "link" && link.trim()) form.set("link", link.trim());
      if (source === "file" && file) form.set("file", file);
      if (useGst && hasGst) form.set("useGst", "1");
      const res = await fetch("/api/business/brief/suggest", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not read that.");
      const { filled, alternatives } = onSuggestion({ summary: d.summary || "", values: d.values || {} });
      const from = (d.used as string[]).join(" and ");
      setResult({
        ok: true,
        text:
          filled + alternatives === 0
            ? `We read ${from} but found nothing new for your brief. Try adding more detail.`
            : `From ${from}: ${filled ? `filled ${filled} ${filled === 1 ? "answer" : "answers"}` : ""}${filled && alternatives ? " and " : ""}${
                alternatives ? `suggested ${alternatives} ${alternatives === 1 ? "change" : "changes"}` : ""
              }. Check them below, then save.`,
      });
    } catch (e: any) {
      setResult({ ok: false, text: e.message || "Could not read that." });
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: Source; label: string; icon: React.ReactNode }> = [
    { id: "describe", label: "Describe it", icon: <PenLine className="w-4 h-4" /> },
    { id: "link", label: "From a link", icon: <Link2 className="w-4 h-4" /> },
    { id: "file", label: "From a file", icon: <FileUp className="w-4 h-4" /> },
  ];

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="px-4 sm:px-5 pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brass" />
          <h3 className="text-sm font-semibold text-text">Fill it in for me</h3>
        </div>
        <p className="text-xs text-text-muted mt-1">Share what you have. We suggest answers only from it, and nothing is saved until you check it.</p>
        <div className="mt-3 flex gap-1 border-b border-line" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={source === t.id}
              onClick={() => {
                setSource(t.id);
                setResult(null);
              }}
              className={`-mb-px h-9 px-3 inline-flex items-center gap-1.5 text-sm border-b-2 cursor-pointer ${
                source === t.id ? "border-brass text-text font-medium" : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-3">
        {source === "describe" && (
          <div className="relative">
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={6000}
              placeholder="Tell us about the business in your own words: what you sell, who buys, where, how you sell, your goals and problems. For example: “I run a sweet shop in Pune. We sell mithai and namkeen, mostly to families, and get big orders at Diwali…”"
              className={`${inputClass} resize-y leading-relaxed pr-12`}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? "Stop listening" : "Speak instead of typing"}
                title={listening ? "Stop listening" : "Speak instead of typing"}
                className={`absolute right-2 top-2 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                  listening ? "bg-rust text-white" : "text-text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            {listening && <p className="mt-1 text-xs text-text-muted">Listening… speak naturally, then press the button again to stop.</p>}
          </div>
        )}

        {source === "link" && (
          <div>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="Your website, Instagram, Facebook, Google Maps, Justdial, IndiaMART, Swiggy or Zomato page"
              inputMode="url"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-text-muted">Some pages only show details after signing in. If we can&apos;t read yours, try another link or describe it.</p>
          </div>
        )}

        {source === "file" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,.txt,.csv,.md,.xlsx,.xls"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
                <FileUp className="w-4 h-4 text-text-muted shrink-0" />
                <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
                <span className="text-xs text-text-muted shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label="Remove file"
                  className="p-1 text-text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-line-strong px-4 py-6 text-sm text-text-muted hover:text-text hover:bg-surface-2/50 cursor-pointer"
              >
                Upload your menu, price list, brochure, catalogue or visiting card
                <span className="block text-xs mt-1">Photo (JPG, PNG), PDF, text or Excel, up to 8 MB</span>
              </button>
            )}
          </div>
        )}

        {hasGst && (
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none">
            <input type="checkbox" checked={useGst} onChange={e => setUseGst(e.target.checked)} className="accent-[var(--brass)]" />
            Also use my verified GST registration (name, type and activities of the business)
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={busy || !ready}
            className="h-9 px-4 rounded-lg bg-text text-bg text-sm font-medium hover:opacity-90 inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Reading…" : "Suggest answers"}
          </button>
          {source === "describe" && !busy && description.trim().length > 0 && description.trim().length < 15 && (
            <span className="text-xs text-text-muted">Write a little more first.</span>
          )}
          {result && (
            <span className={`text-sm inline-flex items-center gap-1.5 ${result.ok ? "text-text-muted" : "text-rust"}`}>
              {result.ok && <Check className="w-4 h-4 text-brass" />}
              {result.text}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
