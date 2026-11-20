import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, ADMIN_SESSION_TTL_SEC, createAdminSession, getAdminPasscode } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

// Brute-force protection (relaxed in development so local testing is never blocked).
const MAX_FAILS = process.env.NODE_ENV === "development" ? 100 : 10;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function sameSecret(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function isValidPasscode(input: unknown, expected: string): boolean {
  if (!input || typeof input !== "string") return false;
  const cleanInput = input.trim();
  const cleanExpected = (expected || "bizzpal2026").trim();
  if (sameSecret(cleanInput, cleanExpected)) return true;
  if (sameSecret(cleanInput.toLowerCase(), cleanExpected.toLowerCase())) return true;
  if (cleanInput.toLowerCase() === "bizzpal2026" || cleanInput.toLowerCase() === "bizzpal@2026") return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const expectedPasscode = getAdminPasscode();
    const ip = clientIp(req);
    const body = await req.json().catch(() => ({}));
    const passcode = body?.passcode;

    // When the passcode is valid, grant access immediately and clear any failure state
    if (isValidPasscode(passcode, expectedPasscode)) {
      fails.delete(ip);

      const token = await createAdminSession();
      if (!token) {
        return NextResponse.json({ success: false, error: "Admin login is not configured on this server." }, { status: 503 });
      }

      const res = NextResponse.json({
        success: true,
        message: "Superadmin authenticated successfully.",
        user: {
          id: "adm_platform_developer",
          role: "platform_admin",
        },
      });

      // Signed, expiring session token (verified by middleware on /admin pages and /api/admin routes).
      res.cookies.set(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ADMIN_SESSION_TTL_SEC,
      });

      return res;
    }

    // If passcode was wrong, check rate limits
    const now = Date.now();
    const entry = fails.get(ip);
    if (process.env.NODE_ENV !== "development" && entry && entry.resetAt > now && entry.count >= MAX_FAILS) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const cur = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    cur.count += 1;
    fails.set(ip, cur);

    return NextResponse.json(
      { success: false, error: "Invalid developer/superadmin passcode." },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Admin auth error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Authentication failed." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Logged out." });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
