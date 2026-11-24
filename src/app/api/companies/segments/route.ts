import { NextResponse } from "next/server";
import { createSegment, deleteSegment, moveSegment, renameSegment } from "@/lib/companies";
import { audit, failure, readJson, requireGroup } from "@/lib/companiesApi";

export const dynamic = "force-dynamic";

/** Categories the group creates for its companies (for example "IT & Digital" or "Consumer & Retail"). */
export async function POST(req: Request) {
  const g = requireGroup(req, { write: true });
  if (g instanceof NextResponse) return g;
  try {
    const body = await readJson(req);
    const id = createSegment(g.groupId, body.name);
    audit(g.groupId, g.auth.email, `Added category ${String(body.name || "").trim()}`);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return failure(err);
  }
}

/** Rename ({ id, name }) or move one place ({ id, move: "up" | "down" }). */
export async function PATCH(req: Request) {
  const g = requireGroup(req, { write: true });
  if (g instanceof NextResponse) return g;
  try {
    const body = await readJson(req);
    if (!body.id) return NextResponse.json({ success: false, error: "Which category?" }, { status: 400 });
    if (body.move === "up" || body.move === "down") moveSegment(g.groupId, String(body.id), body.move);
    else renameSegment(g.groupId, String(body.id), body.name);
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
    if (!id) return NextResponse.json({ success: false, error: "Which category?" }, { status: 400 });
    deleteSegment(g.groupId, id);
    audit(g.groupId, g.auth.email, "Removed a category");
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}
