import { requireUser } from "@/lib/auth/requireUser";
import { getGroupBusinessId, getUserBusiness } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamAuditLogs
} from "@/lib/db";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getGroupBusinessId(auth.email);

  try {
    const activeBiz = getUserBusiness(auth.email);
    const members = getTeamMembers(tenantId);
    const auditLogs = getTeamAuditLogs(tenantId);

    return NextResponse.json({
      success: true,
      business: activeBiz,
      members,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getGroupBusinessId(auth.email);

  try {
    const body = await req.json();
    const { name, email, role, department, twoFactor } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const newMember = addTeamMember({
      businessId: tenantId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "Operator",
      department: department || "Operations",
      twoFactor: Boolean(twoFactor),
    });

    return NextResponse.json({
      success: true,
      member: newMember,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getGroupBusinessId(auth.email);

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const updated = updateTeamMember(id, updates, tenantId);
    return NextResponse.json({ success: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getGroupBusinessId(auth.email);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const deleted = deleteTeamMember(id, tenantId);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
