/**
 * Small in-memory rate limiter. It protects paid endpoints (Google Places, AI providers) and sign-in
 * from being hammered. It is per server process, which is right for a single VM.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function sweep(now: number) {
  if (buckets.size > 5000) {
    Array.from(buckets.entries()).forEach(([k, v]) => {
      if (v.resetAt <= now) buckets.delete(k);
    });
  }
}

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

/** True when this key has already failed `max` times inside its window. Does not count as an attempt. */
export function tooManyFailures(key: string, max: number): boolean {
  const b = buckets.get(key);
  return Boolean(b && b.resetAt > Date.now() && b.count >= max);
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
  } else {
    b.count += 1;
  }
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
}
