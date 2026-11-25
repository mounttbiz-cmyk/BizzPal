import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { aiTierFor } from "@/lib/ai/providers";
import { activeBusiness, BriefError, gstFacts, MAX_FILE_BYTES, prepareFile, readLink, suggestBrief } from "@/lib/brief";
import { rateLimit } from "@/lib/rateLimit";
import { BudgetError, checkDailyAiLimit } from "@/lib/platform/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Suggested brief answers from what the owner gives: a description in their words, a link to one of their pages,
 * a file (menu, price list, brochure, visiting card), and their verified GST registration. Nothing is saved here;
 * the owner reviews the suggestions first.
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!rateLimit(`brief-suggest:${auth.email}`, 15, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "You have asked for suggestions several times. Please try again in a while." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Please send a description, a link or a file." }, { status: 400 });
  }

  try {
    const biz = activeBusiness(auth.email);
    const description = String(form.get("description") || "").trim().slice(0, 6000);
    const link = String(form.get("link") || "").trim().slice(0, 500);
    const upload = form.get("file");
    const useGst = form.get("useGst") === "1";

    const sources: Parameters<typeof suggestBrief>[0] = {};
    if (description) sources.description = description;
    if (link) sources.link = await readLink(link);
    if (upload && typeof upload !== "string") {
      if (upload.size > MAX_FILE_BYTES) throw new BriefError("That file is larger than 8 MB. Please upload a smaller one.");
      const prepared = prepareFile(upload.name || "file", upload.type || "", Buffer.from(await upload.arrayBuffer()));
      if (prepared.text) sources.fileText = prepared.text;
      if (prepared.file) sources.file = prepared.file;
    }
    if (useGst) {
      const gst = gstFacts(auth.email, biz.id);
      if (gst) sources.gst = gst;
    }

    const used = [
      sources.description && "your description",
      sources.link && "your link",
      (sources.fileText || sources.file) && "your file",
      sources.gst && "your GST registration",
    ].filter(Boolean) as string[];
    if (used.length === 0) {
      return NextResponse.json({ success: false, error: "Describe the business, paste a link or upload a file first." }, { status: 400 });
    }

    checkDailyAiLimit(auth.email);
    const suggestion = await suggestBrief(sources, biz.name, aiTierFor(auth.email), { businessId: biz.id, feature: "brief" });
    return NextResponse.json({ success: true, ...suggestion, used });
  } catch (err) {
    if (err instanceof BriefError || err instanceof BudgetError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    console.error("[brief/suggest]", err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
