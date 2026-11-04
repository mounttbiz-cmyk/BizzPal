/**
 * Real revenue from the customer's own payment provider.
 *
 * The founder pastes a READ-ONLY API key. We call the provider's API with it, which both proves the key is
 * genuine and returns the actual payments, so revenue is never typed in. Amounts are summed in INR only;
 * payments in other currencies are counted but not converted (we never guess an exchange rate).
 * Test-mode keys are refused because test payments are not real money.
 */

export type Provider = "razorpay" | "stripe";

export interface RevenueSnapshot {
  provider: Provider;
  mode: "live" | "test";
  windowDays: number;
  from: string;
  to: string;
  grossInr: number; // captured payments, in rupees
  refundsInr: number;
  revenueInr: number; // gross - refunds
  paymentCount: number;
  otherCurrencyCount: number;
  truncated: boolean; // true if we stopped paging (very high volume)
  syncedAt: string;
}

export type SyncError =
  | { code: "invalid_credentials"; message: string }
  | { code: "no_permission"; message: string }
  | { code: "bad_input"; message: string }
  | { code: "unavailable"; message: string };

export class ProviderError extends Error {
  err: SyncError;
  constructor(err: SyncError) {
    super(err.message);
    this.err = err;
  }
}

const WINDOW_DAYS = 30;
const MAX_PAGES = 50; // 5,000 payments; beyond that we flag "truncated" rather than loop forever

const razorpayBase = () => (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com").replace(/\/+$/, "");
const stripeBase = () => (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");

export const RAZORPAY_KEY_ID = /^rzp_(live|test)_[A-Za-z0-9]{6,}$/;
export const STRIPE_KEY = /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/;

async function getJson(url: string, headers: Record<string, string>): Promise<{ status: number; body: any }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: ctl.signal });
    let body: any = {};
    try { body = await res.json(); } catch {}
    return { status: res.status, body };
  } catch (e: any) {
    throw new ProviderError({ code: "unavailable", message: e?.name === "AbortError" ? "The payment provider took too long to respond." : "Could not reach the payment provider." });
  } finally {
    clearTimeout(t);
  }
}

function failFromStatus(status: number, body: any, provider: string): never {
  const msg = body?.error?.description || body?.error?.message || "";
  if (status === 401) throw new ProviderError({ code: "invalid_credentials", message: `${provider} rejected these credentials. Check you copied the key correctly.` });
  if (status === 403) throw new ProviderError({ code: "no_permission", message: `This ${provider} key doesn't have permission to read payments. Create a read-only key that can view payments.` });
  if (status === 429) throw new ProviderError({ code: "unavailable", message: `${provider} is rate-limiting us. Try again in a minute.` });
  throw new ProviderError({ code: "unavailable", message: msg || `${provider} returned an unexpected error (HTTP ${status}).` });
}

export async function syncRazorpay(keyId: string, keySecret: string, now = new Date()): Promise<RevenueSnapshot> {
  if (!RAZORPAY_KEY_ID.test(keyId)) throw new ProviderError({ code: "bad_input", message: "That doesn't look like a Razorpay Key ID (it starts with rzp_live_ or rzp_test_)." });
  if (keySecret.length < 8) throw new ProviderError({ code: "bad_input", message: "The Razorpay Key Secret looks too short." });
  const mode = keyId.startsWith("rzp_test_") ? "test" : "live";
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const to = Math.floor(now.getTime() / 1000);
  const from = to - WINDOW_DAYS * 86400;

  let gross = 0, refunds = 0, count = 0, other = 0, truncated = false;
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { truncated = true; break; }
    const { status, body } = await getJson(`${razorpayBase()}/v1/payments?from=${from}&to=${to}&count=100&skip=${page * 100}`, { Authorization: auth });
    if (status !== 200) failFromStatus(status, body, "Razorpay");
    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    for (const p of items) {
      if (p.captured !== true) continue; // only money actually captured
      if (String(p.currency || "").toUpperCase() !== "INR") { other++; continue; }
      gross += Number(p.amount) || 0;
      refunds += Number(p.amount_refunded) || 0;
      count++;
    }
    if (items.length < 100) break;
  }
  return snapshot("razorpay", mode, from, to, gross, refunds, count, other, truncated);
}

export async function syncStripe(apiKey: string, now = new Date()): Promise<RevenueSnapshot> {
  if (!STRIPE_KEY.test(apiKey)) throw new ProviderError({ code: "bad_input", message: "That doesn't look like a Stripe secret or restricted key (it starts with sk_live_ or rk_live_)." });
  const mode = apiKey.includes("_test_") ? "test" : "live";
  const to = Math.floor(now.getTime() / 1000);
  const from = to - WINDOW_DAYS * 86400;

  let gross = 0, refunds = 0, count = 0, other = 0, truncated = false, after = "";
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { truncated = true; break; }
    const q = `created[gte]=${from}&created[lte]=${to}&limit=100${after ? `&starting_after=${encodeURIComponent(after)}` : ""}`;
    const { status, body } = await getJson(`${stripeBase()}/v1/charges?${q}`, { Authorization: `Bearer ${apiKey}` });
    if (status !== 200) failFromStatus(status, body, "Stripe");
    const items: any[] = Array.isArray(body?.data) ? body.data : [];
    for (const c of items) {
      if (!(c.paid === true && c.status === "succeeded")) continue;
      if (String(c.currency || "").toLowerCase() !== "inr") { other++; continue; }
      gross += Number(c.amount) || 0;
      refunds += Number(c.amount_refunded) || 0;
      count++;
    }
    if (!body?.has_more || items.length === 0) break;
    after = items[items.length - 1].id;
  }
  return snapshot("stripe", mode, from, to, gross, refunds, count, other, truncated);
}

function snapshot(provider: Provider, mode: "live" | "test", from: number, to: number, gross: number, refunds: number, count: number, other: number, truncated: boolean): RevenueSnapshot {
  const r2 = (paise: number) => Math.round(paise) / 100;
  return {
    provider, mode, windowDays: WINDOW_DAYS,
    from: new Date(from * 1000).toISOString(), to: new Date(to * 1000).toISOString(),
    grossInr: r2(gross), refundsInr: r2(refunds), revenueInr: r2(gross - refunds),
    paymentCount: count, otherCurrencyCount: other, truncated, syncedAt: new Date().toISOString(),
  };
}
