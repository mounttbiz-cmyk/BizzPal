/**
 * The demo account(s) used to show BizzPal to reviewers and prospects.
 * They always have the highest plan ("enterprise") so every feature can be seen, and they skip set-up.
 * They hold no made-up figures: a demo business starts with only its name, like any new account, and shows whatever is entered into it.
 */

export const DEFAULT_DEMO_CREDENTIALS = {
  email: "demo@bizzpal.ai",
  password: "BizzPal@2026",
  name: "BizzPal Demo",
};

export const HIGHEST_PLAN_ID = "enterprise";
export const HIGHEST_PLAN_NAME = "Enterprise Custom";

const KNOWN_DEMO_EMAILS = [
  "demo@bizzpal.ai",
  "demo.founder@bizzpal.ai",
  "reviewer@bizzpal.ai",
  "razorpay@bizzpal.ai",
];

export function demoEmails(): string[] {
  const envEmails = (
    process.env.DEMO_ACCOUNT_EMAILS ||
    process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS ||
    ""
  )
    .split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...envEmails, ...KNOWN_DEMO_EMAILS]));
}

export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  if (demoEmails().includes(clean)) return true;
  if (clean.startsWith("demo") && clean.endsWith("@bizzpal.ai")) return true;
  return false;
}

/** A subscription record that is always on the highest plan, for demo accounts only. */
export function demoSubscription(email: string) {
  return {
    id: "demo_subscription",
    user_id: null,
    user_email: email.trim().toLowerCase(),
    business_id: null,
    plan_id: HIGHEST_PLAN_ID,
    plan_name: HIGHEST_PLAN_NAME,
    amount: 0,
    currency: "INR",
    status: "active",
    razorpay_order_id: null,
    razorpay_payment_id: null,
    created_at: new Date(0).toISOString(),
    current_period_end: null,
  };
}
