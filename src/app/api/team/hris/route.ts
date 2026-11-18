import { requireUser } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/verification/store";
import {
  getHrisConnection,
  recordHrisSync,
  disconnectHris,
  type HrisProvider
} from "@/lib/team/hris";

export const dynamic = "force-dynamic";

/**
 * GET: returns the current HRIS connection, employee roster, headcount metrics, and available providers catalog
 */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const owner = auth.email;
  if (!owner) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const { connection, summary } = getHrisConnection(owner);
  return NextResponse.json({
    ok: true,
    connection,
    summary,
  });
}

/**
 * POST: connect/sync with an HRIS/HCM provider or alternative verified directory
 * body: { email: string, provider: HrisProvider, config: Record<string, string>, employees?: HrisEmployeeRecord[] }
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const owner = auth.email;
  if (!owner) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  if (rateLimited(`hris:${owner}`, 30, 3_600_000)) {
    return NextResponse.json({ error: "Rate limit reached. Please wait before syncing again." }, { status: 429 });
  }

  const provider = b?.provider as HrisProvider;
  if (!provider) {
    return NextResponse.json({ error: "Provider is required." }, { status: 400 });
  }


  const config = b?.config || {};
  const customEmployees = Array.isArray(b?.employees) ? b.employees : undefined;
  // Live connections to HR systems are not available, and no employees are ever made up: a real list is required.
  if (!customEmployees || customEmployees.length === 0) {
    return NextResponse.json({ error: "Upload your employee list (CSV or Excel) instead. Live HR-system connections are not available." }, { status: 400 });
  }

  try {
    const summary = recordHrisSync(owner, provider, config, customEmployees);
    return NextResponse.json({
      ok: true,
      summary,
      message: `Saved ${summary.activeHeadcount} active employee records from your list.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 });
  }
}

/**
 * DELETE: disconnect and clear synced HRIS records
 */
export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const owner = auth.email;
  if (!owner) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  disconnectHris(owner, b?.provider);
  return NextResponse.json({ ok: true, message: "HRIS connection and cached directory removed." });
}

