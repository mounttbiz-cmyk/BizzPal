"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import {
  clearRazorpayBackdrop,
  loadRazorpaySDK,
} from "@/lib/payments/loadRazorpay";

export interface CreditPack {
  id: string;
  credits: number;
  priceInr: number;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function buyer() {
  try {
    // Only used to prefill the payment form; the server takes the buyer from the signed-in session
    const s = JSON.parse(localStorage.getItem("bizzpal_user_session") || "{}");
    return {
      email: String(s.email || "")
        .trim()
        .toLowerCase(),
      name: String(s.name || "") || "Founder",
    };
  } catch {
    return { email: "", name: "" };
  }
}

/**
 * Buying agent credits: pick a pack, pay with Razorpay, and the credits land in the account's wallet once the
 * server has verified the payment. On a machine without Razorpay keys it shows a clearly marked test payment.
 */
export default function BuyCredits({
  onClose,
  onBought,
  needed,
}: {
  onClose: () => void;
  onBought: (credits: number) => void;
  needed?: number;
}) {
  const [packs, setPacks] = useState<CreditPack[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testOrder, setTestOrder] = useState<{
    orderId: string;
    pack: CreditPack;
  } | null>(null);

  useEffect(() => {
    fetch("/api/credits", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list: CreditPack[] = Array.isArray(d.packs) ? d.packs : [];
        setPacks(list);
        // Pre-select the smallest pack that covers what is needed, else the middle one
        const fit = needed ? list.find((p) => p.credits >= needed) : null;
        setSelected(
          (fit || list[Math.min(1, list.length - 1)] || list[0])?.id || "",
        );
      })
      .catch(() => setError("Could not load the credit packs."));
  }, [needed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const finish = async (
    orderId: string,
    paymentId?: string,
    signature?: string,
  ) => {
    const res = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        userName: buyer().name,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.success)
      throw new Error(
        d.error ||
          "We could not confirm the payment. You were not charged twice; please try again.",
      );
    onBought(Number(d.credits) || 0);
  };

  const pay = async () => {
    const pack = packs?.find((p) => p.id === selected);
    if (!pack) return;
    setBusy(true);
    setError("");
    try {
      const b = buyer();
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: pack.id,
          userEmail: b.email,
          userName: b.name,
        }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok || !order.success)
        throw new Error(
          order.error || "We could not start the payment. Please try again.",
        );
      if (order.isSandboxMode) {
        setTestOrder({ orderId: order.orderId, pack });
        return;
      }
      const loaded = await loadRazorpaySDK();
      if (!loaded || !(window as any).Razorpay)
        throw new Error(
          "Could not load the payment window. Check your connection and try again.",
        );
      await new Promise<void>((resolve, reject) => {
        const rz = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "BizzPal™",
          description: `${pack.credits.toLocaleString("en-IN")} agent credits`,
          image: "/logo.png",
          order_id: order.orderId,
          prefill: { name: b.name, email: b.email },
          theme: {
            color: "#B48C36",
            backdrop_color: "rgba(255, 255, 255, 0.12)",
          },
          handler: async (r: any) => {
            clearRazorpayBackdrop();
            try {
              await finish(
                r.razorpay_order_id,
                r.razorpay_payment_id,
                r.razorpay_signature,
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => {
              clearRazorpayBackdrop();
              resolve();
            },
          },
        });
        rz.on("payment.failed", (r: any) => {
          clearRazorpayBackdrop();
          reject(
            new Error(
              r?.error?.description || "The payment did not go through.",
            ),
          );
        });
        rz.open();
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const completeTest = async () => {
    if (!testOrder) return;
    setBusy(true);
    setError("");
    try {
      await finish(
        testOrder.orderId,
        `pay_sim_${Date.now()}`,
        `sig_test_${Date.now()}`,
      );
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Add credits"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-slate-950/40 cursor-default"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-line shadow-2xl">
        <div className="px-6 pt-6 pb-5 border-b border-line flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Add credits</h2>
            <p className="text-sm text-text-muted mt-1">
              Credits pay for the work your AI agents do. 1 credit = ₹1. Unused
              credits stay in your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!packs && !error && (
            <p className="text-sm text-text-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          )}

          {testOrder ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-text">
                Test payment. This machine has no Razorpay keys, so no real
                money moves. On the live site customers pay through Razorpay.
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="text-sm text-text">
                  {testOrder.pack.credits.toLocaleString("en-IN")} credits
                </span>
                <span className="text-sm font-medium text-text">
                  {inr(testOrder.pack.priceInr)}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestOrder(null)}
                  disabled={busy}
                  className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={completeTest}
                  disabled={busy}
                  className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Complete test payment
                </button>
              </div>
            </div>
          ) : (
            packs && (
              <>
                <div
                  role="radiogroup"
                  aria-label="Credit pack"
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {packs.map((p) => {
                    const on = p.id === selected;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setSelected(p.id)}
                        className={`relative rounded-xl border p-4 text-left transition-colors cursor-pointer ${on ? "border-brass bg-brass/[0.05]" : "border-line hover:border-line-strong"}`}
                      >
                        {on && (
                          <Check className="absolute top-3 right-3 w-4 h-4 text-brass" />
                        )}
                        <span className="block text-xl font-semibold text-text tabular-nums">
                          {p.credits.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-xs text-text-muted">
                          credits
                        </span>
                        <span className="block mt-3 text-sm text-text">
                          {inr(p.priceInr)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {needed ? (
                  <p className="text-xs text-text-muted">
                    One task of this agent can use up to {needed} credits;
                    whatever it does not use is returned.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={pay}
                  disabled={busy || !selected}
                  className="w-full h-11 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Pay {inr(packs.find((p) => p.id === selected)?.priceInr || 0)}
                </button>
              </>
            )
          )}
          {error && <p className="text-sm text-rust">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
