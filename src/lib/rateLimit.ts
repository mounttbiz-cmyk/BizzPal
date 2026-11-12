/**
 * Small in-memory rate limiter. It protects paid endpoints (Google Places, AI providers)
 * from being hammered. It is per server process, which is right for a single VM.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // keep the map from growing forever
    if (buckets.size > 5000) {
      Array.from(buckets.entries()).forEach(([k, v]) => { if (v.resetAt <= now) buckets.delete(k); });
    }
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
}
