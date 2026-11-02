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

export function getWebhookSecret(): string | null {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return s.length > 6 && !s.includes("YOUR_") ? s : null;
}
