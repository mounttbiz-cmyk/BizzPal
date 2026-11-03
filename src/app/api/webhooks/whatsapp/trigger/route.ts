import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { generateDynamicCheckInQuestions } from "@/lib/checkin/generateQuestions";
import { verifySharedToken } from "@/lib/webhookAuth";

// Outbound scheduled job trigger for WhatsApp check-in
export async function POST(req: Request) {
  try {
    // Only the scheduler (holding the shared token) may trigger outbound messages.
    const secret = process.env.WHATSAPP_WEBHOOK_TOKEN;
    if (!secret) {
      return NextResponse.json({ error: "Trigger token not configured" }, { status: 503 });
    }
    if (!verifySharedToken(req, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (!business.whatsapp_opt_in || !business.whatsapp_number) {
      return NextResponse.json({
        skipped: true,
        reason: "WhatsApp check-in is not opted-in or phone number is missing",
      });
    }

    // Determine dynamic questions linked to recent problems and active tasks
    const { questions: dynamicQuestions } = generateDynamicCheckInQuestions(DEFAULT_BUSINESS_ID);
    const questions = dynamicQuestions.map((q, idx) => `${idx + 1}. [${q.badge}] ${q.title}`);

    const message = `👋 Hi ${business.founder_name || "Founder"}, this is your BizzPal Daily Check-In for ${business.name}!\n\n${questions.join("\n\n")}\n\nReply directly with your updates in 1-2 lines (or voice note).`;

    // In production, dispatch via Twilio / Meta API here.
    // For local environment, we return the outbound payload ready for inspection.
    return NextResponse.json({
      success: true,
      status: "outbound_prompt_dispatched",
      recipient: business.whatsapp_number,
      message,
      questionsCount: questions.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
