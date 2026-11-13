import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE integrations SET status = 'not_connected', config = NULL, updated_at = ?
      WHERE business_id = ? AND tool_key = 'onedrive'
    `).run(now, DEFAULT_BUSINESS_ID);

    // Also remove onedrive from connected_tools
    const biz = db.prepare("SELECT connected_tools FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
    if (biz && biz.connected_tools) {
      try {
        const tools: string[] = JSON.parse(biz.connected_tools);
        const filtered = tools.filter(t => t !== "onedrive");
        db.prepare("UPDATE businesses SET connected_tools = ?, updated_at = ? WHERE id = ?")
          .run(JSON.stringify(filtered), now, DEFAULT_BUSINESS_ID);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "OneDrive disconnected" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
