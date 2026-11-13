"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { DataPalCreditStatus, getAccountKey } from "@/lib/datapal/credits";
import { DATAPAL_PACKS, CUSTOM_PACK_MIN, CUSTOM_PACK_MAX, customPackPrice } from "@/lib/datapal/plans";
import { loadRazorpaySDK } from "@/lib/payments/loadRazorpay";
import { PortalModal } from "@/components/ui/PortalModal";

interface DataPalCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DataPalCreditStatus;
  onUpdated: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

interface PendingTestOrder {
  orderId: string;
  records: number;
  priceFormatted: string;
}

export function DataPalCreditsModal({ isOpen, onClose, status, onUpdated }: DataPalCreditsModalProps) {
  const [selectedId, setSelectedId] = useState<string>("datapal_pack_500");
  const [customCount, setCustomCount] = useState<number>(2000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [testOrder, setTestOrder] = useState<PendingTestOrder | null>(null);

  if (!isOpen) return null;

  const remaining = status.remainingData ?? status.remainingQuota ?? 0;
  const total = status.totalAllowed || status.baseQuota + status.addonCredits;
  const used = status.usedData ?? status.usedLeads ?? 0;

  const getBuyer = () => {
    let name = "";
    let email = getAccountKey();
    try {
      const sess = JSON.parse(localStorage.getItem("bizzpal_user_session") || "{}");
      if (sess?.email) email = String(sess.email).trim().toLowerCase();
      if (sess?.name) name = String(sess.name);
    } catch {}
    return { email, name: name || "Founder" };
  };

  const finish = async (orderId: string, paymentId?: string, signature?: string) => {
    const buyer = getBuyer();
    const res = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        userName: buyer.name,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "We could not confirm the payment. You were not charged twice; please try again.");
    setTestOrder(null);
    setMessage({ tone: "good", text: `${Number(data.records).toLocaleString("en-IN")} records added to your balance.` });
    onUpdated();
  };

  const buy = async (packId: string, records: number) => {
    setMessage(null);
    setBusy(true);
    try {
      const buyer = getBuyer();
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: packId, userEmail: buyer.email, userName: buyer.name }),
      });
      const order = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !order.success) throw new Error(order.error || "We could not start the payment. Please try again.");

      // Test checkout (no Razorpay keys on this machine)
      if (order.isSandboxMode) {
        setTestOrder({ orderId: order.orderId, records, priceFormatted: order.plan?.priceFormatted || "" });
        return;
      }

      // Real checkout
      const loaded = await loadRazorpaySDK();
      if (!loaded || !(window as any).Razorpay) throw new Error("Could not load the payment window. Check your connection and try again.");
      await new Promise<void>((resolve, reject) => {
        const rz = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "BizzPal™",
          description: `${records.toLocaleString("en-IN")} DataPal records`,
          image: "/logo.png",
          order_id: order.orderId,
          prefill: { name: buyer.name, email: buyer.email },
          theme: { color: "#B48C36" },
          handler: async (r: any) => {
            try {
              await finish(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => resolve() },
        });
        rz.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "The payment did not go through.")));
        rz.open();
      });
    } catch (err: any) {
      setMessage({ tone: "bad", text: err?.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const completeTestPayment = async () => {
    if (!testOrder) return;
    setBusy(true);
    setMessage(null);
    try {
      await finish(testOrder.orderId, `pay_sim_${Date.now()}`, `sig_test_${Date.now()}`);
    } catch (err: any) {
      setMessage({ tone: "bad", text: err?.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const customValid = customCount >= CUSTOM_PACK_MIN && customCount <= CUSTOM_PACK_MAX;
  const customId = `datapal_pack_custom_${customCount}`;

  return (
    <PortalModal isOpen={isOpen} onClose={() => (busy ? undefined : onClose())}>
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text">Buy credits</h2>
            <p className="text-sm text-text-muted mt-1">Add more records to your balance. One payment, no expiry.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance */}
        <div className="p-5 rounded-xl border border-line bg-surface-2/50 space-y-3">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-text-muted">Records remaining</p>
              <p className="text-3xl font-semibold text-text mt-1 leading-none">{remaining.toLocaleString("en-IN")}</p>
            </div>
            <div className="text-sm text-text-muted text-right">
              <p>
                {used.toLocaleString("en-IN")} used of {total.toLocaleString("en-IN")}
              </p>
              <p>{PLAN_LABEL[status.planTier] || "Current"} plan{status.addonCredits > 0 ? ` + ${status.addonCredits.toLocaleString("en-IN")} bought` : ""}</p>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-brass rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((remaining / (total || 1)) * 100))}%` }} />
          </div>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${message.tone === "good" ? "bg-jade/10 text-jade" : "bg-rust/10 text-rust"}`}>{message.text}</div>
        )}

        {/* Test checkout step (only when this machine has no real payment keys) */}
        {testOrder ? (
          <div className="rounded-xl border border-line p-5 space-y-4">
            <div>
              <h3 className="text-base font-medium text-text">Checkout</h3>
              <p className="text-sm text-text-muted mt-0.5">Test mode. No real payment is taken.</p>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-line">
              <div>
                <p className="text-sm font-medium text-text">{testOrder.records.toLocaleString("en-IN")} DataPal records</p>
                <p className="text-xs text-text-muted mt-0.5">Order {testOrder.orderId}</p>
              </div>
              <p className="text-lg text-text">{testOrder.priceFormatted}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setTestOrder(null)} className="px-4 py-2.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={completeTestPayment} className="px-4 py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-60 inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? "Confirming…" : "Complete test payment"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text">Choose an amount</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DATAPAL_PACKS.map(pack => {
                const selected = selectedId === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedId(pack.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-colors ${selected ? "border-brass bg-brass/[0.04]" : "border-line hover:border-line-strong"}`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-text leading-none">{pack.records.toLocaleString("en-IN")}</span>
                      <span className="text-sm text-text-muted">records</span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-lg text-text">{inr(pack.priceInr)}</span>
                      <span className="text-xs text-text-muted">₹{(pack.priceInr / pack.records).toFixed(2)} per record</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedId(pack.id);
                        buy(pack.id, pack.records);
                      }}
                      className={`mt-4 w-full py-2.5 rounded-xl text-sm cursor-pointer disabled:opacity-50 ${selected ? "bg-brass text-white hover:brightness-110" : "border border-line text-text hover:bg-surface-2"}`}
                    >
                      {busy && selected ? "Please wait…" : `Add ${pack.records.toLocaleString("en-IN")} records`}
                    </button>
                  </div>
                );
              })}

              {/* Custom amount */}
              <div
                onClick={() => setSelectedId("custom")}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedId === "custom" ? "border-brass bg-brass/[0.04]" : "border-line hover:border-line-strong"}`}
              >
                <p className="text-sm text-text-muted">Custom amount</p>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customCount || ""}
                    onClick={e => e.stopPropagation()}
                    onFocus={() => setSelectedId("custom")}
                    onChange={e => {
                      const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                      setCustomCount(isNaN(v) ? 0 : Math.min(CUSTOM_PACK_MAX, v));
                    }}
                    placeholder="Number of records"
                    aria-label="Custom number of records"
                    className="w-full px-3 py-2 pr-16 rounded-lg text-xl font-medium bg-surface border border-line text-text focus:outline-none focus:border-brass"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">records</span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg text-text">{customValid ? inr(customPackPrice(customCount)) : "—"}</span>
                  <span className="text-xs text-text-muted">{customValid ? "about ₹0.65 per record" : `${CUSTOM_PACK_MIN} to ${CUSTOM_PACK_MAX.toLocaleString("en-IN")}`}</span>
                </div>
                <button
                  type="button"
                  disabled={busy || !customValid}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedId("custom");
                    buy(customId, customCount);
                  }}
                  className={`mt-4 w-full py-2.5 rounded-xl text-sm cursor-pointer disabled:opacity-50 ${selectedId === "custom" ? "bg-brass text-white hover:brightness-110" : "border border-line text-text hover:bg-surface-2"}`}
                >
                  {busy && selectedId === "custom" ? "Please wait…" : `Add ${customValid ? customCount.toLocaleString("en-IN") : 0} records`}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">Records you buy are added to your balance straight after the payment is confirmed.</p>
      </div>
    </PortalModal>
  );
}
