import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE integrations SET status = 'not_connected', config = NULL, updated_at = ?
      WHERE business_id = ? AND tool_key = 'google_drive'
    `).run(now, tenantId);

    // Also remove google_drive from connected_tools
    const biz = db.prepare("SELECT connected_tools FROM businesses WHERE id = ?").get(tenantId) as any;
    if (biz && biz.connected_tools) {
      try {
        const tools: string[] = JSON.parse(biz.connected_tools);
        const filtered = tools.filter(t => t !== "google_drive");
        db.prepare("UPDATE businesses SET connected_tools = ?, updated_at = ? WHERE id = ?")
          .run(JSON.stringify(filtered), now, tenantId);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Google Drive disconnected" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

