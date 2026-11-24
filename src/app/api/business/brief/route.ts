import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { activeBusiness, briefFields, briefProgress, getBrief, gstFacts, saveBrief } from "@/lib/brief";

export const dynamic = "force-dynamic";

/** The brief of the company the person is working in, with the questions it answers. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const biz = activeBusiness(auth.email);
  const brief = getBrief(biz.id);
  const fields = briefFields();
  const progress = briefProgress(brief, fields);
  return NextResponse.json({
    success: true,
    businessName: biz.name,
    fields,
    summary: brief.summary,
    values: Object.fromEntries(Object.entries(brief.values).map(([k, v]) => [k, { value: v.value, source: v.source, updatedAt: v.updatedAt }])),
    answered: progress.answered,
    total: progress.total,
    updatedAt: brief.updatedAt,
    canEdit: auth.isOwner,
    hasGst: Boolean(gstFacts(auth.email, biz.id)),
  });
}

/** Saves the owner's answers. Teammates can read the brief but not change it (enforced for /api/business). */
export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ success: false, error: "Nothing to save." }, { status: 400 });
  const biz = activeBusiness(auth.email);
  const values = body.values && typeof body.values === "object" ? body.values : undefined;
  const saved = saveBrief(biz.id, { summary: typeof body.summary === "string" ? body.summary : undefined, values }, "owner");
  const progress = briefProgress(saved);
  return NextResponse.json({ success: true, answered: progress.answered, total: progress.total, updatedAt: saved.updatedAt });
}
