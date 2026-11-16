import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getUserBusiness } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  getBusinessAutomations,
  toggleBusinessAutomation,
  createBusinessAutomation,
  db,
  DEFAULT_BUSINESS_ID
} from "@/lib/db";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const automations = getBusinessAutomations();
    const integrations = db
      .prepare("SELECT tool_key, name, status FROM integrations WHERE business_id = ?")
      .all(tenantId) as any[];

    return NextResponse.json({
      success: true,
      automations,
      connectedTools: integrations.filter(i => i.status === "connected").map(i => i.tool_key),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { id, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

    toggleBusinessAutomation(id, enabled);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { title, description, trigger, action, toolKey, category } = body;

    if (!title || !trigger || !action) {
      return NextResponse.json({ error: "Title, trigger and action are required" }, { status: 400 });
    }

    const created = createBusinessAutomation({
      title: title.trim(),
      description: description || "Autonomous workflow",
      trigger: trigger.trim(),
      action: action.trim(),
      toolKey: toolKey || "custom",
      category: category || "Operations",
    });

    return NextResponse.json({
      success: true,
      automation: created,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
