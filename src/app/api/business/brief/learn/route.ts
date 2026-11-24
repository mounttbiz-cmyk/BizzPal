import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { activeBusiness, briefFields, briefProgress, saveBrief } from "@/lib/brief";

export const dynamic = "force-dynamic";

/** Saves one thing an advisor learned in chat, after the owner tapped "Save to business brief". */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const key = String(body?.key || "");
  const value = typeof body?.value === "string" ? body.value : "";
  if (!briefFields().some(f => f.key === key) || !value.trim()) {
    return NextResponse.json({ success: false, error: "Nothing to save." }, { status: 400 });
  }
  const saved = saveBrief(activeBusiness(auth.email).id, { values: { [key]: value } }, "chat", { append: true });
  const progress = briefProgress(saved);
  return NextResponse.json({ success: true, value: saved.values[key]?.value || "", answered: progress.answered, total: progress.total });
}
