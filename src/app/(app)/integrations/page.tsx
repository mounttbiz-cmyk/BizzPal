"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IntegrationLogo } from "@/components/ui/IntegrationLogo";
import { PortalModal } from "@/components/ui/PortalModal";
import { RealToolAuthModal } from "@/components/tools/RealToolAuthModal";
import { PaymentsStep } from "@/components/onboarding/PaymentsStep";
import type { PaySource, PayTotal } from "@/components/onboarding/types";

/**
 * Only tools that really connect are listed here. "Connected" always means the connection was tested.
 */
type Status = "connected" | "not_connected";

interface Tool {
  id: "google_drive" | "onedrive" | "payments" | "slack";
  logo: string;
  name: string;
  tagline: string;
}

const TOOLS: Tool[] = [
  { id: "google_drive", logo: "google_drive", name: "Google Drive & Sheets", tagline: "Import spreadsheets and data files you choose from Google Drive." },
  { id: "onedrive", logo: "onedrive", name: "Microsoft OneDrive & Excel", tagline: "Import Excel workbooks and other files from OneDrive." },
  { id: "payments", logo: "stripe", name: "Payments: Razorpay & Stripe", tagline: "Read your real payments so your revenue is accurate and can't be edited." },
  { id: "slack", logo: "slack", name: "Slack", tagline: "Post updates and alerts to a Slack channel you choose." },
];

// Our own products. Their accounts are linked to BizzPal by our team for now, so Connect explains how.
interface OwnProduct {
  id: string;
  name: string;
  logo?: string;
  badge: string;
  tagline: string;
  about: string;
  site?: string;
}
const OWN_PRODUCTS: OwnProduct[] = [
  {
    id: "salespal",
    name: "SalesPal",
    logo: "/integrations/salespal.png",
    badge: "SP",
    tagline: "AI voice calls and WhatsApp conversations with your leads, with outcomes sent back to BizzPal.",
    about: "SalesPal by Mountt Sense calls and messages your leads on WhatsApp and reports what happened.",
    site: "https://salespal.in/",
  },
  {
    id: "assistpal",
    name: "AssistPal",
    badge: "AP",
    tagline: "Your AI assistant's activity and results, so your advisors work from what it has done.",
    about: "AssistPal is your AI assistant from the same family as BizzPal and SalesPal.",
  },
];

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [detail, setDetail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [authTool, setAuthTool] = useState<Tool | null>(null);
  const [ownProduct, setOwnProduct] = useState<OwnProduct | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paySources, setPaySources] = useState<PaySource[]>([]);
  const [payTotal, setPayTotal] = useState<PayTotal | null>(null);

  const [slackOpen, setSlackOpen] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [slackText, setSlackText] = useState("");
  const [slackBusy, setSlackBusy] = useState(false);
  const [slackMsg, setSlackMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const next: Record<string, Status> = {};
    const info: Record<string, string> = {};
    try {
      const [integ, pay, me] = await Promise.all([
        fetch("/api/integrations", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/payments", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).catch(() => null),
      ]);
      for (const i of integ?.integrations || []) {
        if (i.id === "google_drive" || i.id === "onedrive" || i.id === "slack") next[i.id] = i.status === "connected" ? "connected" : "not_connected";
      }
      const sources: PaySource[] = pay?.sources || [];
      setPaySources(sources);
      setPayTotal(pay?.total || null);
      const live = sources.filter(s => s.status === "connected");
      next.payments = live.length > 0 ? "connected" : "not_connected";
      if (live.length > 0) info.payments = live.map(s => (s.provider === "stripe" ? "Stripe" : "Razorpay")).join(" and ") + " connected";
      if (me?.authenticated) setEmail(me.email);
    } catch {}
    try {
      const p = JSON.parse(localStorage.getItem("bizzpal_business_profile") || "{}");
      if (p?.name) setCompanyName(p.name);
    } catch {}
    setStatus(next);
    setDetail(info);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (tool: Tool) => {
    if (tool.id === "payments") setPayOpen(true);
    else if (tool.id === "slack") {
      setSlackMsg(null);
      setSlackUrl("");
      setSlackText("");
      setSlackOpen(true);
    } else setAuthTool(tool);
  };

  const connectSlack = async () => {
    setSlackBusy(true);
    setSlackMsg(null);
    try {
      const res = await fetch("/api/integrations/slack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhookUrl: slackUrl }) });
      const d = await res.json();
      if (res.ok && d.success) {
        setSlackUrl("");
        setSlackMsg({ ok: true, text: "Connected. A test message was posted to your channel." });
        await load();
      } else setSlackMsg({ ok: false, text: d.error || "Could not connect." });
    } catch {
      setSlackMsg({ ok: false, text: "Could not reach the server. Please try again." });
    } finally {
      setSlackBusy(false);
    }
  };

  const disconnectSlack = async () => {
    setSlackBusy(true);
    await fetch("/api/integrations/slack", { method: "DELETE" }).catch(() => {});
    setSlackMsg(null);
    await load();
    setSlackBusy(false);
  };

  const postSlack = async () => {
    setSlackBusy(true);
    setSlackMsg(null);
    try {
      const res = await fetch("/api/integrations/slack/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: slackText }) });
      const d = await res.json();
      if (res.ok && d.success) {
        setSlackText("");
        setSlackMsg({ ok: true, text: "Posted to your Slack channel." });
      } else setSlackMsg({ ok: false, text: d.error || "Could not post." });
    } catch {
      setSlackMsg({ ok: false, text: "Could not reach the server. Please try again." });
    } finally {
      setSlackBusy(false);
    }
  };

  const connectedCount = TOOLS.filter(t => status[t.id] === "connected").length;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-line">
        <h1 className="text-xl font-bold text-text">Integrations</h1>
        <p className="text-sm text-text-muted mt-1">
          Connect your payments and files so your advisors work from real data.
          {!loading && ` ${connectedCount} of ${TOOLS.length} connected.`}
        </p>
      </div>

      {loading ? (
        <p className="p-12 text-center text-sm text-text-muted">Loading integrations…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map(tool => {
            const connected = status[tool.id] === "connected";
            return (
              <div key={tool.id} className="p-5 rounded-xl border border-line bg-surface flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center p-2 shrink-0">
                    <IntegrationLogo id={tool.logo} className="w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-medium text-text">{tool.name}</h2>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{tool.tagline}</p>
                <div className="mt-auto pt-4 border-t border-line flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-jade" : "bg-line-strong"}`} />
                    {connected ? detail[tool.id] || "Connected" : "Not connected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => open(tool)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm cursor-pointer ${
                      connected ? "border border-line text-text hover:bg-surface-2" : "bg-brass text-white font-medium hover:brightness-110"
                    }`}
                  >
                    {connected ? "Manage" : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}
          {OWN_PRODUCTS.map(item => (
            <div key={item.id} className="p-5 rounded-xl border border-line bg-surface flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {item.logo ? (
                  <div className="w-10 h-10 rounded-lg bg-white border border-line flex items-center justify-center p-1.5 shrink-0">
                    <img src={item.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-brass/10 border border-brass/20 text-brass text-xs font-bold flex items-center justify-center shrink-0">
                    {item.badge}
                  </div>
                )}
                <h2 className="text-sm font-medium text-text">{item.name}</h2>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{item.tagline}</p>
              <div className="mt-auto pt-4 border-t border-line flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />
                  Not connected
                </span>
                <button
                  type="button"
                  onClick={() => setOwnProduct(item)}
                  className="px-3.5 py-1.5 rounded-lg text-sm cursor-pointer bg-brass text-white font-medium hover:brightness-110"
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SalesPal and AssistPal: linked by our team for now */}
      <PortalModal isOpen={Boolean(ownProduct)} onClose={() => setOwnProduct(null)}>
        {ownProduct && (
          <div className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-surface border border-line shadow-lg">
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              {ownProduct.logo ? (
                <div className="w-10 h-10 rounded-lg bg-white border border-line flex items-center justify-center p-1.5 shrink-0">
                  <img src={ownProduct.logo} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-brass/10 border border-brass/20 text-brass text-xs font-bold flex items-center justify-center shrink-0">
                  {ownProduct.badge}
                </div>
              )}
              <h3 className="text-lg font-semibold text-text">Connect {ownProduct.name}</h3>
            </div>
            <div className="px-6 pb-5 space-y-3 text-sm text-text-muted leading-relaxed">
              <p>{ownProduct.about}</p>
              <p>
                Your {ownProduct.name} account is linked to BizzPal by our team, so your advisors can use its activity. Use {ownProduct.name} with the
                same email you use here ({email || "your BizzPal email"}) and we&apos;ll connect the two for you.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-line bg-surface-2/40 rounded-b-2xl flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOwnProduct(null)} className="px-3.5 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
                Close
              </button>
              {ownProduct.site && (
                <a
                  href={ownProduct.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110"
                >
                  Open {ownProduct.name}
                </a>
              )}
            </div>
          </div>
        )}
      </PortalModal>

      {/* Google Drive and OneDrive: sign in with the provider */}
      <RealToolAuthModal
        isOpen={Boolean(authTool)}
        onClose={() => setAuthTool(null)}
        toolId={authTool?.id || null}
        toolName={authTool?.name || "Tool"}
        currentUserEmail={email}
        companyName={companyName}
        currentAuthState={authTool ? { status: status[authTool.id] === "connected" ? "connected" : "idle" } : undefined}
        onConnectSuccess={async () => {
          await load();
          setAuthTool(null);
        }}
        onDisconnect={async () => {
          await load();
          setAuthTool(null);
        }}
      />

      {/* Payments */}
      <PortalModal isOpen={payOpen} onClose={() => setPayOpen(false)}>
        <div className="w-[44rem] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-line shadow-lg p-6">
          <PaymentsStep
            standalone
            email={email}
            sources={paySources}
            total={payTotal}
            onUpdate={(sources, total) => {
              setPaySources(sources);
              setPayTotal(total);
            }}
            onBack={() => setPayOpen(false)}
            onNext={() => {
              setPayOpen(false);
              load();
            }}
          />
        </div>
      </PortalModal>

      {/* Slack */}
      <PortalModal isOpen={slackOpen} onClose={() => setSlackOpen(false)}>
        <div className="w-[34rem] max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-line shadow-lg overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center p-2">
                <IntegrationLogo id="slack" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Slack</h2>
                <p className="text-sm text-text-muted">{status.slack === "connected" ? "Connected" : "Not connected"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setSlackOpen(false)} aria-label="Close" className="p-1 text-text-muted hover:text-text cursor-pointer">
              ✕
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4 text-sm">
            {status.slack === "connected" ? (
              <div>
                <label className="font-medium text-text block mb-1.5">Post a message to your channel</label>
                <textarea
                  rows={3}
                  value={slackText}
                  onChange={e => setSlackText(e.target.value)}
                  placeholder="Write your message"
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className="font-medium text-text block mb-1.5">Incoming webhook URL</label>
                <input type="text" value={slackUrl} onChange={e => setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" className={inputClass} />
                <p className="text-xs text-text-muted mt-1.5">
                  In Slack, open your workspace&apos;s App Directory, add &ldquo;Incoming Webhooks&rdquo;, pick a channel and copy the URL. We post a test message to check it works.
                </p>
              </div>
            )}
            {slackMsg && <p className={`text-sm ${slackMsg.ok ? "text-jade" : "text-rust"}`}>{slackMsg.text}</p>}
          </div>

          <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-between gap-2">
            {status.slack === "connected" ? (
              <>
                <button type="button" onClick={disconnectSlack} disabled={slackBusy} className="text-sm text-rust hover:underline cursor-pointer disabled:opacity-50">
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={postSlack}
                  disabled={slackBusy || !slackText.trim()}
                  className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {slackBusy && <Loader2 className="w-4 h-4 animate-spin" />}Post to Slack
                </button>
              </>
            ) : (
              <>
                <span />
                <button
                  type="button"
                  onClick={connectSlack}
                  disabled={slackBusy || !slackUrl.trim()}
                  className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {slackBusy && <Loader2 className="w-4 h-4 animate-spin" />}Connect and test
                </button>
              </>
            )}
          </div>
        </div>
      </PortalModal>
    </div>
  );
}
