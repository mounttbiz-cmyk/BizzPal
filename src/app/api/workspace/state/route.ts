import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getWorkspaceState, setWorkspaceState } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_SCOPES = new Set([
  "reports",
  "playbooks",
  "strategy",
  "gaps",
  "simulator",
  "help",
  "advisors",
  "knowledge_playbooks",
]);

const MAX_PAYLOAD_BYTES = 512 * 1024;

function validateScope(raw: string | null): string | null {
  const clean = (raw || "").trim();
  if (!clean || !ALLOWED_SCOPES.has(clean)) return null;
  return clean;
}

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const businessId = getUserBusinessId(auth.email);

  const url = new URL(req.url);
  const scope = validateScope(url.searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json({ success: false, error: "Invalid workspace scope." }, { status: 400 });
  }

  const data = getWorkspaceState<unknown>(businessId, scope, null);
  return NextResponse.json(
    { success: true, scope, data },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

async function handleWrite(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const businessId = getUserBusinessId(auth.email);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const url = new URL(req.url);
  const scope = validateScope(body?.scope || url.searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json({ success: false, error: "Invalid workspace scope." }, { status: 400 });
  }

  if (body?.data === undefined) {
    return NextResponse.json({ success: false, error: "Missing workspace data." }, { status: 400 });
  }

  const serialized = JSON.stringify(body.data);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ success: false, error: "Workspace payload exceeds 512KB limit." }, { status: 413 });
  }

  setWorkspaceState(businessId, scope, body.data);
  return NextResponse.json({ success: true, scope, data: body.data });
}

export async function PUT(req: Request) {
  return handleWrite(req);
}

export async function POST(req: Request) {
  return handleWrite(req);
}
