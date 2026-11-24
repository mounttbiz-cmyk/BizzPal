import { NextResponse } from "next/server";
import { requireUser, type AuthUser } from "@/lib/auth/requireUser";
import { getGroupBusinessId, addTeamAuditLog } from "@/lib/db";
import { CompanyError } from "@/lib/companies";
import { rateLimit } from "@/lib/rateLimit";

/** Shared checks for the group/company APIs. */

export interface GroupAuth {
  auth: AuthUser;
  groupId: string;
}

/** Signed in, plus the group taken from the session. Changes are for the group's owner only. */
export function requireGroup(req: Request, opts: { write?: boolean } = {}): GroupAuth | NextResponse {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (opts.write) {
    if (!auth.isOwner) {
      return NextResponse.json({ success: false, error: "Only the account owner can change the group." }, { status: 403 });
    }
    const limit = rateLimit(`companies:${auth.email}`, 120, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ success: false, error: "Too many changes in a short time. Please wait a moment." }, { status: 429 });
    }
  }
  return { auth, groupId: getGroupBusinessId(auth.email) };
}

export async function readJson(req: Request): Promise<any> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function failure(err: unknown): NextResponse {
  if (err instanceof CompanyError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status });
  }
  console.error("[companies]", err);
  return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
}

export function audit(groupId: string, email: string, action: string) {
  try {
    addTeamAuditLog({ businessId: groupId, action, userName: email });
  } catch {}
}
