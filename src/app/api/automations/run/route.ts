import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { db, getUserBusinessId } from "@/lib/db";
import { runAutomationNow } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

/** Run one of your automations now. The same check also runs on its own every 6 hours. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const businessId = getUserBusinessId(auth.email);
  try {
    const { id } = await req.json();
    const rule = db.prepare("SELECT id, title, trigger_event, action_event FROM business_automations WHERE id = ? AND business_id = ?").get(String(id || ""), businessId) as any;
    if (!rule) return NextResponse.json({ success: false, error: "Automation not found." }, { status: 404 });
    const outcome = runAutomationNow(businessId, { id: rule.id, title: rule.title, trigger: rule.trigger_event, action: rule.action_event }, "manual");
    return NextResponse.json({ success: true, ...outcome });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
