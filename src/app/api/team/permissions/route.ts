import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getUserBusiness } from "@/lib/db";
import { NextResponse } from "next/server";
import { getPlatformConfig, setPlatformConfig, clearMemoryConfigCache } from "@/lib/db";
import { DEFAULT_MATRIX, sanitizeMatrix } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const KEY = "team_permissions";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const saved = getPlatformConfig<any>(KEY, DEFAULT_MATRIX);
    return NextResponse.json({ success: true, matrix: sanitizeMatrix(saved) });
  } catch (error: any) {
    return NextResponse.json({ success: true, matrix: DEFAULT_MATRIX, warning: error.message });
  }
}

export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    if (!body || typeof body.matrix !== "object") {
      return NextResponse.json({ success: false, error: "A permissions matrix is required." }, { status: 400 });
    }
    const matrix = sanitizeMatrix(body.matrix);
    clearMemoryConfigCache(KEY);
    setPlatformConfig(KEY, matrix);
    return NextResponse.json({ success: true, matrix });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Could not save permissions." }, { status: 500 });
  }
}
