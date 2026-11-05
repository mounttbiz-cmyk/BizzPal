"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, CircleDashed, Lock, MinusCircle, Pencil, ShieldCheck } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { RealToolAuthModal } from "@/components/tools/RealToolAuthModal";
import { BUSINESS_TYPES, INDUSTRY_PRIORITIES, TOOLS_OPTIONS, type Priority } from "@/lib/onboarding/data";
import { checkGstin } from "@/lib/verification/gstin";
import { VerifyBusinessStep } from "@/components/onboarding/VerifyBusinessStep";
import { VerifyWebsiteStep } from "@/components/onboarding/VerifyWebsiteStep";
import { IndustryStep } from "@/components/onboarding/IndustryStep";
import { ConnectSourcesStep, type ToolAuth } from "@/components/onboarding/ConnectSourcesStep";
import { PrioritiesStep } from "@/components/onboarding/PrioritiesStep";
import { BankStep } from "@/components/onboarding/BankStep";
import { PaymentsStep } from "@/components/onboarding/PaymentsStep";
import { TeamStep } from "@/components/onboarding/TeamStep";
import { STEPS, inr, type BankState, type DomainState, type GstState, type IfscLookup, type InviteRow, type PaySource, type PayTotal, type StepId } from "@/components/onboarding/types";

async function postJson(url: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

export default function OnboardingPage() {
  const router = useRouter();

  // ---- who is signing up (the sign-in session is the only source of name/email) ----
  const [email, setEmail] = useState("");
  const [founderName, setFounderName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isNewSignup = params.get("mode") === "new_signup" || params.get("signup") === "true";
      if (isNewSignup) {
        localStorage.removeItem("bizzpal_business_profile");
        localStorage.removeItem("bizzpal_datapal_campaigns");
        localStorage.setItem("bizzpal_subscription_plan", "free");
      }

      const raw = localStorage.getItem("bizzpal_user_session");
      const sess = raw ? JSON.parse(raw) : null;
      const userEmail = (sess?.email || "").trim().toLowerCase();
      if (!userEmail) {
        router.replace("/login");
        return;
      }

      // An account that already finished setup goes straight to its dashboard.
      if (!isNewSignup) {
        const saved = localStorage.getItem(`bizzpal_user_business_${userEmail}`);
        if (saved) {
          const p = JSON.parse(saved);
          if (p.completedAt || (p.name && p.revenue !== undefined)) {
            router.replace("/dashboard");
            return;
          }
        }
      }

      setEmail(userEmail);
      setFounderName((sess?.name || "").trim() || userEmail.split("@")[0]);
      setReady(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // ---- wizard state ----
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx].id;

  const [companyNameInput, setCompanyNameInput] = useState("");
  const [gstinInput, setGstinInput] = useState("");
  const [gst, setGst] = useState<GstState>({ phase: "idle" });
  const [domainInput, setDomainInput] = useState("");
  const [domain, setDomain] = useState<DomainState>({ phase: "idle" });

  const [ifscInput, setIfscInput] = useState("");
  const [accountInput, setAccountInput] = useState(""); // never saved to the draft
  const [ifscLookup, setIfscLookup] = useState<IfscLookup>({ phase: "idle" });
  const [bank, setBank] = useState<BankState>({ phase: "idle" });

  const [paySources, setPaySources] = useState<PaySource[]>([]);
  const [payTotal, setPayTotal] = useState<PayTotal | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [hrisHeadcount, setHrisHeadcount] = useState<number>(0);
  const [hrisProviderName, setHrisProviderName] = useState<string>("");
  const updatePay = useCallback((src: PaySource[], tot: PayTotal | null) => { setPaySources(src); setPayTotal(tot); }, []);
  const updateInvites = useCallback((rows: InviteRow[]) => setInvites(rows), []);

  const go = (id: StepId) => setStepIdx(STEPS.findIndex((x) => x.id === id));
  // Furthest step the person has reached. Every step up to here can be reopened and edited.
  const [maxStep, setMaxStep] = useState(0);
  useEffect(() => { setMaxStep((m) => Math.max(m, stepIdx)); }, [stepIdx]);

  const [industries, setIndustries] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState("");
  const [industryError, setIndustryError] = useState("");

  const [toolAuth, setToolAuth] = useState<Record<string, ToolAuth>>({});
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const [needs, setNeeds] = useState<string[]>([]);
  const [customNeeds, setCustomNeeds] = useState<Priority[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [done, setDone] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [stepIdx]);

  // ---- draft: keep the user's choices if they refresh or come back later ----
  const draftKey = email ? `bizzpal_onboarding_draft_${email}` : "";
  const draftRef = React.useRef<any>(null); // what was saved last time, captured once
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!draftKey || draftReady) return;
    let d: any = null;
    try { d = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch {}
    draftRef.current = d;
    if (d) {
      if (typeof d.companyNameInput === "string") setCompanyNameInput(d.companyNameInput);
      if (typeof d.gstinInput === "string") setGstinInput(d.gstinInput);
      if (typeof d.domainInput === "string") setDomainInput(d.domainInput);
      if (Array.isArray(d.industries)) setIndustries(d.industries);
      if (typeof d.customIndustry === "string") setCustomIndustry(d.customIndustry);
      if (Array.isArray(d.customNeeds)) setCustomNeeds(d.customNeeds);
      if (Array.isArray(d.needs)) setNeeds(d.needs);
      if (d.domainSkipped) setDomain({ phase: "skipped" });
      if (typeof d.ifscInput === "string") setIfscInput(d.ifscInput);
      if (Number.isInteger(d.maxStep)) setMaxStep(Math.min(d.maxStep, STEPS.length - 1));
      if (d.bankSkipped) setBank({ phase: "skipped" });
    }
    setDraftReady(true); // saving starts only on the next render, after restored values are applied
  }, [draftKey, draftReady]);

  useEffect(() => {
    if (!draftKey || !draftReady || done) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ stepIdx, maxStep, companyNameInput, gstinInput, domainInput, domainSkipped: domain.phase === "skipped", ifscInput, bankSkipped: bank.phase === "skipped", industries, customIndustry, needs, customNeeds }));
    } catch {}
  }, [draftKey, draftReady, done, stepIdx, maxStep, companyNameInput, gstinInput, domainInput, domain.phase, ifscInput, bank.phase, industries, customIndustry, needs, customNeeds]);

  // ---- resume: restore whatever the SERVER already holds as verified ----
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const res = await fetch(`/api/verify/status?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const s = await res.json();
        if (s.gstin?.record) {
          setGstinInput(s.gstin.gstin);
          setGst({ phase: "verified", gstin: s.gstin.gstin, record: s.gstin.record });
          // Only jump ahead if the business really is verified on the server.
          const d = draftRef.current;
          if (d && Number.isInteger(d.stepIdx) && d.stepIdx > 0) setStepIdx(Math.min(d.stepIdx, STEPS.length - 1));
        }
        if (s.domain) {
          setDomainInput(s.domain.domain);
          setDomain({ phase: "verified", domain: s.domain.domain, method: s.domain.method, emailMatches: s.domain.emailMatches });
        } else if (s.pendingDomain) {
          setDomainInput(s.pendingDomain);
        }
        if (s.bank?.bank) {
          setIfscInput(s.bank.bank.ifsc);
          setBank({ phase: "verified", bank: s.bank.bank, last4: s.bank.last4, holderName: s.bank.holderName || "" });
        }
      } catch {}
      try {
        const pr = await fetch(`/api/payments?email=${encodeURIComponent(email)}`);
        if (pr.ok) { const d = await pr.json(); setPaySources(d.sources || []); setPayTotal(d.total || null); }
      } catch {}
      try {
        const ir = await fetch(`/api/team/invites?email=${encodeURIComponent(email)}`);
        if (ir.ok) { const d = await ir.json(); setInvites(d.invites || []); }
      } catch {}
      try {
        const hr = await fetch(`/api/team/hris?email=${encodeURIComponent(email)}`);
        if (hr.ok) {
          const hd = await hr.json();
          if (hd.summary) {
            setHrisHeadcount(hd.summary.activeHeadcount || 0);
            const provMeta = hd.catalog?.find((c: any) => c.id === hd.summary.provider);
            setHrisProviderName(provMeta?.name || hd.summary.provider);
          }
        }
      } catch {}
    })();
  }, [email]);

  // ---- already-connected tools ----
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await fetch("/api/integrations");
        if (!res.ok) return;
        const data = await res.json();
        const next: Record<string, ToolAuth> = {};
        for (const it of data.integrations || []) {
          if (it.status === "connected") {
            const id = it.id === "google_calendar" || it.id === "google_workspace" ? "google" : it.id;
            next[id] = { status: "connected", detail: it.config?.accountDetail || (it.config?.accountEmail ? `Connected as ${it.config.accountEmail}` : "Connected") };
          }
        }
        if (Object.keys(next).length) setToolAuth((p) => ({ ...next, ...p }));
      } catch {}
    })();
  }, [ready]);

  // ---- step 1: GSTIN ----
  const verifyGstin = useCallback(async () => {
    const local = checkGstin(gstinInput);
    if (!local.valid) { setGst({ phase: "error", message: local.reason }); return; }
    setGst({ phase: "checking" });
    try {
      const { status, data } = await postJson("/api/verify/gstin", { email, gstin: local.gstin });
      if (status === 200 && data.ok) {
        setGst({ phase: "verified", gstin: local.gstin, record: data.record });
      } else if (data.stage === "registry_unavailable") {
        setGst({ phase: "unavailable", gstin: local.gstin, reason: data.reason, registryConfigured: Boolean(data.registryConfigured) });
      } else {
        setGst({ phase: "error", message: data.reason || data.error || "Verification failed. Please try again." });
      }
    } catch {
      setGst({ phase: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }, [email, gstinInput]);

  // ---- step 2: website ----
  const startDomain = useCallback(async () => {
    setDomain({ phase: "working" });
    try {
      const { status, data } = await postJson("/api/verify/domain", { email, domain: domainInput, action: "challenge" });
      if (status !== 200 || !data.ok) { setDomain({ phase: "error", message: data.error || "That website address doesn't look right." }); return; }
      if (data.verified) setDomain({ phase: "verified", domain: data.domain, method: data.method, emailMatches: data.emailMatches });
      else setDomain({ phase: "challenge", domain: data.domain, token: data.token, instructions: data.instructions, emailMatches: data.emailMatches });
    } catch {
      setDomain({ phase: "error", message: "Couldn't reach the server. Please try again." });
    }
  }, [email, domainInput]);

  const checkDomain = useCallback(async () => {
    if (domain.phase !== "challenge") return;
    const cur = domain;
    setDomain({ ...cur, checking: true });
    try {
      const { data } = await postJson("/api/verify/domain", { email, domain: cur.domain, action: "check" });
      if (data.ok && data.verified) setDomain({ phase: "verified", domain: data.domain, method: data.method, emailMatches: data.emailMatches });
      else setDomain({ ...cur, checking: false, tried: data.tried || [data.error || "We could not check your website. Please try again."] });
    } catch {
      setDomain({ ...cur, checking: false, tried: ["Couldn't reach the server. Please try again."] });
    }
  }, [email, domain]);

  // ---- step 3: bank ----
  const verifyBank = useCallback(async () => {
    setBank({ phase: "checking" });
    try {
      const { status, data } = await postJson("/api/verify/bank", { email, ifsc: ifscInput, account: accountInput });
      const info = data.bank ? { ifsc: data.bank.ifsc, bank: data.bank.bank, branch: data.bank.branch, city: data.bank.city, state: data.bank.state } : null;
      if (status === 200 && data.ok && info) setBank({ phase: "verified", bank: info, last4: data.last4, holderName: data.holderName });
      else if (data.stage === "account_unavailable" && info) setBank({ phase: "unavailable", bank: info, last4: data.last4, reason: data.reason });
      else setBank({ phase: "rejected", message: data.reason || data.error || "We couldn't verify this account.", holderName: data.holderName });
    } catch {
      setBank({ phase: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
    setAccountInput(""); // never keep the full number around once it has been sent
  }, [email, ifscInput, accountInput]);

  // ---- step 7: industry ----
  const toggleIndustry = (id: string) => {
    setIndustryError("");
    setIndustries((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const industryNext = () => {
    if (industries.length === 0) return setIndustryError("Pick at least one industry to continue.");
    if (industries.includes("other") && !customIndustry.trim()) return setIndustryError("Tell us which industry you are in.");
    goToPriorities();
  };

  // ---- step 6: other tools ----
  const connectTool = (toolId: string) => {
    if (toolId !== "google") return setActiveTool(toolId);
    const w = 540, h = 680;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const url = `/api/integrations/google/connect?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.open(url, "BizzPalGoogleOAuth", `width=${w},height=${h},left=${left},top=${top},status=0,toolbar=0,menubar=0`);
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type === "BIZZPAL_GOOGLE_AUTH_SUCCESS") {
        window.removeEventListener("message", onMsg);
        const d = ev.data.data;
        setToolAuth((p) => ({ ...p, google: { status: "connected", detail: d?.detail || `Connected as ${d?.email || "your Google account"}` } }));
      }
    };
    window.addEventListener("message", onMsg);
  };

  // ---- step 8: priorities ----
  const priorityOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: Priority[] = [];
    for (const cat of industries.length ? industries : ["other"]) {
      for (const p of INDUSTRY_PRIORITIES[cat] || INDUSTRY_PRIORITIES.other) {
        if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
      }
    }
    return [...out, ...customNeeds];
  }, [industries, customNeeds]);

  const goToPriorities = () => {
    if (needs.length === 0) setNeeds(priorityOptions.filter((p) => p.recommended).map((p) => p.id));
    go("priorities");
  };

  const industryLabel = useMemo(
    () => industries.map((id) => (id === "other" ? customIndustry.trim() || "Other" : BUSINESS_TYPES.find((b) => b.id === id)?.title || id)).join(", ") || "your business",
    [industries, customIndustry]
  );

  const connectedTools = useMemo(
    () => TOOLS_OPTIONS.filter((t) => toolAuth[t.id]?.status === "connected").map((t) => t.id),
    [toolAuth]
  );

  // ---- finish ----
  const finish = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const needTitles = needs.map((id) => priorityOptions.find((p) => p.id === id)).filter(Boolean).map((p) => (p!.id.startsWith("custom_need_") ? p!.title : p!.id));
      const { status, data } = await postJson("/api/business/register", {
        email,
        companyName: companyNameInput.trim() || displayName,
        founderName,
        industries,
        customIndustry: customIndustry.trim(),
        connectedTools,
        needs: needTitles,
      });
      if (status !== 200 || !data.success) throw new Error(data.error || "Something went wrong. Please try again.");

      const profile = data.profile;
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(profile));
      localStorage.setItem(`bizzpal_user_business_${email}`, JSON.stringify(profile));
      try { localStorage.removeItem(draftKey); } catch {}
      setDone(true);
      setTimeout(() => router.push("/subscription"), 2200);
    } catch (e: any) {
      setSubmitError(e?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  // ---- trust checklist shown beside the form ----
  const registryOk = gst.phase === "verified";
  const siteOk = domain.phase === "verified";
  const emailOk = domain.phase === "verified" && domain.emailMatches;
  const displayName = companyNameInput.trim() || (registryOk ? gst.record.tradeName || gst.record.legalName : "");
  const bankOk = bank.phase === "verified";
  const liveSources = paySources.filter((x) => x.status === "connected");
  const confirmedTeam = invites.filter((i) => i.status === "verified").length;
  const totalTeamCount = hrisHeadcount > 0 ? hrisHeadcount : confirmedTeam;
  const teamLabel = hrisHeadcount > 0
    ? `${hrisHeadcount} employees synced from ${hrisProviderName || "HRIS"}`
    : confirmedTeam > 0
    ? `${confirmedTeam} teammate${confirmedTeam === 1 ? "" : "s"} confirmed`
    : "Teammates confirmed by Google or HRIS";

  if (!ready) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-text-muted">Loading…</div>;
  }

  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="border-b border-line bg-surface/60 backdrop-blur supports-[backdrop-filter]:bg-surface/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center p-1">
              <Image src="/logo.png" alt="BizzPal" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">Bizz<span className="text-brass">Pal</span></span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-brass-soft text-brass font-bold uppercase">Business registration</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-1.5 text-[11px] text-text-muted"><Lock className="w-3 h-3" />{email}</span>
            <div className="w-32"><ThemeSwitch compact /></div>
          </div>
        </div>
        {/* Mobile / tablet progress */}
        <div className="lg:hidden px-4 sm:px-6 pb-3 max-w-6xl mx-auto">
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
            <span className="font-semibold text-text">{STEPS[stepIdx].label}</span>
            <span>Step {stepIdx + 1} of {STEPS.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-brass rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="flex gap-1.5 overflow-x-auto pt-2.5 -mx-1 px-1 pb-0.5" role="tablist" aria-label="Jump to a step">
            {STEPS.map((s, i) => {
              const reachable = !done && i <= maxStep;
              const current = !done && i === stepIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={current}
                  disabled={!reachable}
                  onClick={() => reachable && setStepIdx(i)}
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                    current ? "bg-brass text-bg border-brass" : reachable ? "bg-surface border-line text-text hover:border-brass cursor-pointer" : "bg-transparent border-line/50 text-text-muted/60"
                  }`}
                >
                  {i < maxStep && !current && <Check className="w-3 h-3 text-jade stroke-[3]" />}{s.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        {/* Left rail */}
        <aside className="hidden lg:block sticky top-6 space-y-5">
          <nav aria-label="Registration progress">
            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const current = !done && i === stepIdx;
                const isDone = done || (i < maxStep && !current);
                const canOpen = !done && i <= maxStep && i !== stepIdx;
                const firstOfPhase = i === 0 || STEPS[i - 1].phase !== s.phase;
                return (
                  <li key={s.id}>
                    {firstOfPhase && <div className={`text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 ${i === 0 ? "pb-1" : "pt-3 pb-1"}`}>{s.phase}</div>}
                    <button
                      type="button"
                      disabled={!canOpen}
                      onClick={() => canOpen && setStepIdx(i)}
                      aria-current={current ? "step" : undefined}
                      title={canOpen ? `Go back to “${s.label}” to view or edit` : undefined}
                      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                        current ? "bg-surface-2 border border-line" : "border border-transparent"
                      } ${canOpen ? "cursor-pointer hover:bg-surface-2/70 hover:border-line" : "cursor-default"}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        isDone ? "bg-jade text-bg" : current ? "bg-brass text-bg" : "bg-surface-2 text-text-muted border border-line"
                      }`}>
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-bold ${current || isDone ? "text-text" : "text-text-muted"}`}>{s.label}</span>
                        <span className="block text-[10px] text-text-muted">{s.hint}</span>
                      </span>
                      {canOpen && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted group-hover:text-brass">
                          <Pencil className="w-3 h-3" />Edit
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-theme space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text"><ShieldCheck className="w-4 h-4 text-brass" />Trust summary</div>
            {displayName && <div className="text-[13px] font-bold text-text leading-snug">{displayName}</div>}
            <ul className="space-y-2 text-[11px]">
              <TrustRow ok={registryOk} label="Confirmed by GST registry" />
              <TrustRow ok={siteOk} skipped={domain.phase === "skipped"} label="Controls company website" />
              <TrustRow ok={emailOk} skipped={!siteOk} label="Sign-in email on that website" />
              <TrustRow ok={bankOk} skipped={bank.phase === "skipped"} label="Bank account matches GST name" />
              <TrustRow ok={liveSources.length > 0} label={payTotal ? `Revenue ${inr(payTotal.revenueInr)} from provider` : "Revenue from payment provider"} />
              <TrustRow ok={totalTeamCount > 0} label={teamLabel} />
            </ul>
            <p className="text-[10px] text-text-muted leading-relaxed">Each tick is checked by our server. Nothing here is self-declared.</p>
          </div>
        </aside>

        {/* Main card */}
        {done ? (
          <section className="p-8 sm:p-12 rounded-2xl border border-line bg-surface shadow-theme min-w-0 text-center space-y-5 animate-fade-in" aria-live="polite">
            <div className="w-16 h-16 rounded-full bg-jade/15 border border-jade/40 text-jade flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your workspace is ready</h2>
              <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                {displayName || "Your business"} is set up. {registryOk ? "Your GSTIN was confirmed by the GST registry." : "Your GSTIN will show as not yet verified until the registry check succeeds."} {payTotal ? `Your last 30 days of real revenue (${inr(payTotal.revenueInr)}) came straight from your payment provider.` : "Revenue will appear as soon as you connect a payment provider."}
              </p>
            </div>
            <ul className="inline-flex flex-col gap-2 text-left text-[11px]">
              <TrustRow ok={registryOk} label="Confirmed by GST registry" />
              <TrustRow ok={siteOk} skipped={!siteOk} label="Controls company website" />
              <TrustRow ok={bankOk} skipped={!bankOk} label="Bank account matches GST name" />
              <TrustRow ok={liveSources.length > 0} skipped={liveSources.length === 0} label={liveSources.length ? `Revenue from ${liveSources.map((x) => x.provider === "razorpay" ? "Razorpay" : "Stripe").join(" + ")}` : "No payment provider connected yet"} />
              <TrustRow ok={totalTeamCount > 0} skipped={totalTeamCount === 0} label={totalTeamCount > 0 ? teamLabel : "No teammates or HRIS synced yet"} />
            </ul>
            <p className="text-[11px] text-text-muted">Taking you to choose your plan…</p>
          </section>
        ) : (
        <section key={step} className="p-5 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme min-w-0 animate-fade-in">
          {step === "business" && (
            <VerifyBusinessStep
              state={gst}
              gstinInput={gstinInput}
              companyName={companyNameInput}
              onCompanyNameChange={setCompanyNameInput}
              onInput={(v) => { setGstinInput(v); if (gst.phase === "error" || gst.phase === "unavailable") setGst({ phase: "idle" }); }}
              onVerify={verifyGstin}
              onNext={() => go("website")}
            />
          )}
          {step === "website" && (
            <VerifyWebsiteStep
              state={domain}
              domainInput={domainInput}
              onInput={setDomainInput}
              onStart={startDomain}
              onCheck={checkDomain}
              onSkip={() => setDomain({ phase: "skipped" })}
              onReset={() => setDomain({ phase: "idle" })}
              onBack={() => go("business")}
              onNext={() => go("bank")}
            />
          )}
          {step === "bank" && (
            <BankStep
              state={bank}
              ifsc={ifscInput}
              account={accountInput}
              lookup={ifscLookup}
              registeredName={registryOk ? gst.record.legalName || gst.record.tradeName : ""}
              onIfsc={(v) => { setIfscInput(v); if (bank.phase !== "idle" && bank.phase !== "checking") setBank({ phase: "idle" }); }}
              onLookup={setIfscLookup}
              onAccount={(v) => { setAccountInput(v); if (bank.phase === "rejected" || bank.phase === "error") setBank({ phase: "idle" }); }}
              onVerify={verifyBank}
              onSkip={() => setBank({ phase: "skipped" })}
              onReset={() => { setBank({ phase: "idle" }); setAccountInput(""); }}
              onBack={() => go("website")}
              onNext={() => go("payments")}
            />
          )}
          {step === "payments" && (
            <PaymentsStep email={email} sources={paySources} total={payTotal} onUpdate={updatePay} onBack={() => go("bank")} onNext={() => go("team")} />
          )}
          {step === "team" && (
            <TeamStep email={email} businessName={displayName} invites={invites} onUpdate={updateInvites} onBack={() => go("payments")} onNext={() => go("sources")} />
          )}
          {step === "sources" && (
            <ConnectSourcesStep auth={toolAuth} onConnect={connectTool} onBack={() => go("team")} onNext={() => go("industry")} />
          )}
          {step === "industry" && (
            <IndustryStep selected={industries} custom={customIndustry} error={industryError} onToggle={toggleIndustry} onCustom={(v) => { setCustomIndustry(v); setIndustryError(""); }} onBack={() => go("sources")} onNext={industryNext} />
          )}
          {step === "priorities" && (
            <PrioritiesStep
              options={priorityOptions}
              selected={needs}
              industryLabel={industryLabel}
              summary={{ name: displayName || (domain.phase === "verified" ? domain.domain : "Your business"), verified: registryOk, website: domain.phase === "verified" ? domain.domain : null, tools: connectedTools.length }}
              submitting={submitting}
              error={submitError}
              onToggle={(id) => setNeeds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
              onAddCustom={(text) => {
                const id = `custom_need_${Date.now()}`;
                setCustomNeeds((p) => [...p, { id, title: text, detail: "Added by you.", category: "Custom" }]);
                setNeeds((p) => [...p, id]);
              }}
              onBack={() => go("industry")}
              onFinish={finish}
            />
          )}
        </section>
        )}
      </main>

      <footer className="text-center text-[11px] text-text-muted py-4 flex items-center justify-center gap-1.5">
        <BadgeCheck className="w-3.5 h-3.5 text-brass" /> BizzPal verifies businesses against official records. Your details are never sold.
      </footer>

      <RealToolAuthModal
        isOpen={Boolean(activeTool)}
        onClose={() => setActiveTool(null)}
        toolId={activeTool}
        toolName={TOOLS_OPTIONS.find((t) => t.id === activeTool)?.name || "Tool"}
        currentUserEmail={email}
        companyName={displayName}
        currentAuthState={activeTool ? toolAuth[activeTool] : undefined}
        onConnectSuccess={(toolId, detail) => setToolAuth((p) => ({ ...p, [toolId]: { status: "connected", detail } }))}
        onDisconnect={(toolId) => setToolAuth((p) => { const n = { ...p }; delete n[toolId]; return n; })}
      />
    </div>
  );
}

function TrustRow({ ok, skipped, label }: { ok: boolean; skipped?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <BadgeCheck className="w-4 h-4 text-jade shrink-0" /> : skipped ? <MinusCircle className="w-4 h-4 text-text-muted shrink-0" /> : <CircleDashed className="w-4 h-4 text-text-muted shrink-0" />}
      <span className={ok ? "text-text font-medium" : "text-text-muted"}>{label}</span>
    </li>
  );
}
