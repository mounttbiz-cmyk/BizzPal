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
 * Test (simulated) checkout is allowed while developing. A real server must never allow it, otherwise
 * anyone could "buy" a plan for free, so on a production build it needs an explicit opt-in that is only
 * meant for a local test machine: ALLOW_SIMULATED_PAYMENTS=true.
 */
export function simulatedPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_SIMULATED_PAYMENTS === "true";
}

export function getWebhookSecret(): string | null {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return s.length > 6 && !s.includes("YOUR_") ? s : null;
}
