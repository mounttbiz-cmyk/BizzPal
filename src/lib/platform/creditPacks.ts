import { db, getGroupBusinessId, getPlatformConfig } from "@/lib/db";
import { addCredits, walletBalance, WalletError } from "./wallet";

/**
 * Credit packs for AI agent work (1 credit = ₹1). The list comes from platform config ("agent_credit_packs"), so
 * the admin can change it without a deploy; prices are always taken from here on the server, never from the browser.
 */

export interface CreditPack {
  id: string;
  credits: number;
  priceInr: number;
}

const DEFAULT_PACKS: CreditPack[] = [
  { id: "credits_100", credits: 100, priceInr: 100 },
  { id: "credits_500", credits: 500, priceInr: 500 },
  { id: "credits_2000", credits: 2000, priceInr: 2000 },
];

export function creditPacks(): CreditPack[] {
  let packs: any[] = DEFAULT_PACKS;
  try {
    const saved = getPlatformConfig<any[]>("agent_credit_packs", DEFAULT_PACKS);
    if (Array.isArray(saved) && saved.length) packs = saved;
  } catch {}
  return packs
    .filter(p => p && typeof p.id === "string" && p.id.startsWith("credits_") && Number(p.credits) > 0 && Number(p.priceInr) > 0)
    .map(p => ({ id: p.id, credits: Math.round(Number(p.credits)), priceInr: Math.round(Number(p.priceInr)) }));
}

export const isCreditPackId = (id: unknown) => typeof id === "string" && id.startsWith("credits_");
export const resolveCreditPack = (id: string) => creditPacks().find(p => p.id === id) || null;

/**
 * Adds a paid pack to the buyer's group wallet, once. Safe to call from both the checkout and the webhook: the
 * payment row flips to "success" only once, and the ledger refuses a second entry for the same order.
 */
export function confirmCreditPackPayment(data: { orderId: string; paymentId: string; email: string; planId: string; rawResponse?: unknown }) {
  const pack = resolveCreditPack(data.planId);
  if (!pack) throw new WalletError("Unknown credit pack.", "unknown_pack", 400);
  const walletId = getGroupBusinessId(data.email);
  const res: any = db
    .prepare("UPDATE payment_transactions SET payment_id = ?, status = 'success', raw_response = COALESCE(?, raw_response) WHERE order_id = ? AND status != 'success'")
    .run(data.paymentId, data.rawResponse ? JSON.stringify(data.rawResponse) : null, data.orderId);
  if (!res?.changes) return { alreadyApplied: true, credits: pack.credits, wallet: walletBalance(walletId) };
  try {
    addCredits(walletId, pack.credits, { type: "purchase", actor: data.email, reference: data.orderId, note: `${pack.credits} credits bought (payment ${data.paymentId})` });
  } catch (err) {
    if (!(err instanceof WalletError && err.code === "duplicate")) throw err;
  }
  return { alreadyApplied: false, credits: pack.credits, wallet: walletBalance(walletId) };
}
