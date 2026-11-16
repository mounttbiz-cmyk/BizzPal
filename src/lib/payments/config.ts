/** True only when real (non-placeholder) Razorpay API keys are configured server-side. */
export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const isLive = Boolean(
    keyId &&
      keySecret &&
      keyId.startsWith("rzp_") &&
      !keyId.includes("YOUR_KEY") &&
      keySecret.length > 6 &&
      !keySecret.includes("YOUR_")
  );
  return { keyId, keySecret, isLive };
}

/**
 * Test (simulated) checkout. It is always allowed while developing. A real server must not let everyone use it,
 * otherwise anyone could "buy" a plan for free. So on a production build it is allowed only for:
 *   - the people listed in TEST_PAYMENT_EMAILS (comma separated), such as the owner testing the plans, or
 *   - everyone, if ALLOW_SIMULATED_PAYMENTS=true (meant for a local test machine only).
 * Once real Razorpay keys are set, these are not used any more: real payments are taken instead.
 */
export function simulatedPaymentsAllowed(email?: string): boolean {
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_SIMULATED_PAYMENTS === "true") return true;
  const testers = (process.env.TEST_PAYMENT_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return Boolean(email) && testers.includes(String(email).trim().toLowerCase());
}

export function getWebhookSecret(): string | null {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return s.length > 6 && !s.includes("YOUR_") ? s : null;
}
