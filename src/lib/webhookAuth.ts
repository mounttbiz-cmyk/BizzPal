import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Verify a Stripe `Stripe-Signature` header (`t=...,v1=...`) against the raw request body. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => safeEqualStr(s, expected));
}

/** Verify a Meta/WhatsApp `X-Hub-Signature-256` header (`sha256=<hex>`) against the raw body. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqualStr(header, expected);
}

/** Shared-secret check for webhooks/cron calls: `x-webhook-token` header or `?token=` query. */
export function verifySharedToken(req: Request, secret: string): boolean {
  const supplied = req.headers.get("x-webhook-token") || new URL(req.url).searchParams.get("token") || "";
  return supplied.length > 0 && safeEqualStr(supplied, secret);
}

/**
 * Authorise an inbound WhatsApp webhook. Accepts a valid Meta signature (WHATSAPP_APP_SECRET)
 * or the shared token (WHATSAPP_WEBHOOK_TOKEN, e.g. appended to a Twilio webhook URL as ?token=).
 * Returns "unconfigured" when neither secret is set, so the caller can answer 503.
 */
export function authorizeWhatsApp(req: Request, rawBody: string): "ok" | "denied" | "unconfigured" {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!appSecret && !token) return "unconfigured";
  if (appSecret && verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) return "ok";
  if (token && verifySharedToken(req, token)) return "ok";
  return "denied";
}
