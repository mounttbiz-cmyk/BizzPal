import { NextResponse } from "next/server";
import { checkDomainProof, emailMatchesDomain, newChallengeToken, normalizeDomain } from "@/lib/verification/domain";
import { cleanEmail, computeLevel, getVerification, rateLimited, saveVerification } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

function instructions(domain: string, token: string) {
  return {
    dns: { type: "TXT", host: `_bizzpal.${domain}`, value: token },
    file: { url: `https://${domain}/.well-known/bizzpal-verify.txt`, content: token },
    meta: { tag: `<meta name="bizzpal-site-verification" content="${token}">` },
  };
}

/**
 * POST { email, domain, action: "challenge" | "check" }
 *  challenge -> returns a one-time token and the three ways to publish it
 *  check     -> looks for that token on the domain; marks the domain verified only if found
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = cleanEmail(body?.email);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please sign in again, then retry." }, { status: 401 });
  }
  if (rateLimited(`dom-ip:${clientIp(req)}`, 60, 3_600_000) || rateLimited(`dom-em:${email}`, 40, 3_600_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a while." }, { status: 429 });
  }

  const domain = normalizeDomain(String(body?.domain || ""));
  if (!domain) {
    return NextResponse.json({ error: "Enter a public website address, for example acme.in" }, { status: 400 });
  }
  const action = body?.action === "check" ? "check" : "challenge";
  const emailMatches = emailMatchesDomain(email, domain);

  const existing = getVerification(email, "domain", domain);

  if (action === "challenge") {
    if (existing?.status === "verified") {
      return NextResponse.json({ ok: true, domain, verified: true, method: existing.evidence?.method, emailMatches, level: computeLevel(email).level });
    }
    const token = existing?.token || newChallengeToken();
    if (!existing) saveVerification(email, "domain", domain, { status: "pending", token });
    return NextResponse.json({ ok: true, domain, verified: false, token, instructions: instructions(domain, token), emailMatches });
  }

  if (!existing?.token) {
    return NextResponse.json({ error: "Start verification first to get your code." }, { status: 400 });
  }
  if (existing.status === "verified") {
    return NextResponse.json({ ok: true, domain, verified: true, method: existing.evidence?.method, emailMatches, level: computeLevel(email).level });
  }

  const proof = await checkDomainProof(domain, existing.token);
  if (proof.verified) {
    saveVerification(email, "domain", domain, {
      status: "verified",
      evidence: { method: proof.method, emailMatches, checkedAt: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true, domain, verified: true, method: proof.method, emailMatches, level: computeLevel(email).level });
  }
  return NextResponse.json({
    ok: false,
    domain,
    verified: false,
    token: existing.token,
    instructions: instructions(domain, existing.token),
    tried: proof.tried,
    emailMatches,
  });
}
