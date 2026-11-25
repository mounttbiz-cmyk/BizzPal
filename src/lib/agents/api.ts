import { NextResponse } from "next/server";
import { requireUser, type AuthUser } from "@/lib/auth/requireUser";
import { getGroupBusinessId, getUserBusinessId } from "@/lib/db";
import { AgentError } from "./lifecycle";
import { RuntimeError } from "./runtime";
import { WalletError } from "@/lib/platform/wallet";
import { BudgetError } from "@/lib/platform/usage";

/** Shared pieces for the agent, approval and credit APIs. */

export interface AgentAuth {
  auth: AuthUser;
  /** The company the person is working in: agents and tasks belong to it */
  businessId: string;
  /** The account's group: the credit wallet belongs to it */
  walletBusinessId: string;
}

export function requireAgentUser(req: Request, opts: { owner?: boolean } = {}): AgentAuth | NextResponse {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (opts.owner && !auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can do this." }, { status: 403 });
  return { auth, businessId: getUserBusinessId(auth.email), walletBusinessId: getGroupBusinessId(auth.email) };
}

export async function body(req: Request): Promise<any> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export function failure(err: unknown): NextResponse {
  if (err instanceof AgentError || err instanceof RuntimeError || err instanceof WalletError || err instanceof BudgetError) {
    return NextResponse.json({ success: false, error: err.message, code: (err as any).code }, { status: err.status });
  }
  console.error("[agents]", err);
  return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
}
