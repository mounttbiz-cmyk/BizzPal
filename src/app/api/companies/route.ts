import { NextResponse } from "next/server";
import { getUserBusinessId } from "@/lib/db";
import { createCompany, deleteCompany, getGroupOverview, updateCompany, type CompanyInput } from "@/lib/companies";
import { audit, failure, readJson, requireGroup } from "@/lib/companiesApi";

export const dynamic = "force-dynamic";

const FIELDS: Array<keyof CompanyInput> = [
  "name",
  "segmentId",
  "parentId",
  "industry",
  "industryLabel",
  "website",
  "teamSize",
  "monthlyRevenue",
  "monthlyBurn",
  "cashOnHand",
];

/** Only the fields that were sent, so a partial update never clears the others. */
function pick(body: any): CompanyInput {
  const out: CompanyInput = {};
  for (const f of FIELDS) if (body[f] !== undefined) (out as any)[f] = body[f];
  return out;
}

/** The group, its categories and companies, and which one the person is working in. */
export async function GET(req: Request) {
  const g = requireGroup(req);
  if (g instanceof NextResponse) return g;
  try {
    return NextResponse.json({
      success: true,
      ...getGroupOverview(g.groupId),
      activeBusinessId: getUserBusinessId(g.auth.email),
      canManage: g.auth.isOwner,
    });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(req: Request) {
  const g = requireGroup(req, { write: true });
  if (g instanceof NextResponse) return g;
  try {
    const body = await readJson(req);
    const id = createCompany(g.groupId, pick(body));
    audit(g.groupId, g.auth.email, `Added company ${String(body.name || "").trim()}`);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(req: Request) {
  const g = requireGroup(req, { write: true });
  if (g instanceof NextResponse) return g;
  try {
    const body = await readJson(req);
    if (!body.id) return NextResponse.json({ success: false, error: "Which company?" }, { status: 400 });
    updateCompany(g.groupId, String(body.id), pick(body));
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(req: Request) {
  const g = requireGroup(req, { write: true });
  if (g instanceof NextResponse) return g;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Which company?" }, { status: 400 });
    const removed = deleteCompany(g.groupId, id);
    audit(g.groupId, g.auth.email, `Removed a company${removed > 1 ? ` and ${removed - 1} under it` : ""}`);
    return NextResponse.json({ success: true, removed });
  } catch (err) {
    return failure(err);
  }
}
