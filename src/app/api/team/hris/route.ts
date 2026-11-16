import { requireUser } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/verification/store";
import {
  getHrisConnection,
  recordHrisSync,
  disconnectHris,
  HRIS_CATALOG,
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
    catalog: HRIS_CATALOG,
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

  const catalogEntry = HRIS_CATALOG.find((c) => c.id === provider);
  if (!catalogEntry) {
    return NextResponse.json({ error: "Unsupported HRIS/HCM provider." }, { status: 400 });
  }

  const config = b?.config || {};
  const customEmployees = Array.isArray(b?.employees) ? b.employees : undefined;

  try {
    const summary = recordHrisSync(owner, provider, config, customEmployees);
    return NextResponse.json({
      ok: true,
      summary,
      message: `Successfully synchronized ${summary.activeHeadcount} active employee records from ${catalogEntry.name}.`,
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

