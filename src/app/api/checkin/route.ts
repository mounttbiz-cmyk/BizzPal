import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateDynamicCheckInQuestions } from "@/lib/checkin/generateQuestions";

// Helper to get today's date in YYYY-MM-DD
function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const today = getTodayDateString();

    // Check if check-in exists for today
    const checkin = db
      .prepare("SELECT * FROM daily_checkins WHERE business_id = ? AND date = ?")
      .get(tenantId, today) as any;

    // Dynamically generate context-aware questions based on recent problems, past check-ins, tasks, and industry
    const { questions, contextSummary } = generateDynamicCheckInQuestions(tenantId);

    // Get recent check-ins
    const recentCheckins = db
      .prepare("SELECT * FROM daily_checkins WHERE business_id = ? ORDER BY date DESC LIMIT 7")
      .all(tenantId) as any[];

    return NextResponse.json({
      success: true,
      today,
      isCompletedToday: Boolean(checkin),
      todayCheckin: checkin
        ? {
            id: checkin.id,
            date: checkin.date,
            source: checkin.source,
            answers: JSON.parse(checkin.answers),
            rawText: checkin.raw_text,
            createdAt: checkin.created_at,
          }
        : null,
      questionRules: {
        skipRevenue: contextSummary.skipRevenue,
        skipTech: contextSummary.skipTech,
      },
      questions,
      contextSummary,
      recentCheckins: recentCheckins.map(c => ({
        id: c.id,
        date: c.date,
        source: c.source,
        answers: JSON.parse(c.answers),
        createdAt: c.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { answers = {}, rawText = "", source = "manual_web" } = body;
    const today = getTodayDateString();
    const now = new Date().toISOString();
    const checkinId = `chk_${Date.now()}`;

    // Upsert check-in for today
    const existing = db
      .prepare("SELECT id FROM daily_checkins WHERE business_id = ? AND date = ?")
      .get(tenantId, today) as any;

    if (existing) {
      db.prepare(`
        UPDATE daily_checkins SET
          source = ?,
          answers = ?,
          raw_text = ?,
          created_at = ?
        WHERE id = ?
      `).run(
        source,
        JSON.stringify(answers),
        rawText,
        now,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO daily_checkins (id, business_id, date, source, answers, raw_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkinId,
        tenantId,
        today,
        source,
        JSON.stringify(answers),
        rawText,
        now
      );
    }

    return NextResponse.json({
      success: true,
      message: "Daily check-in saved successfully",
      date: today,
      answers,
      source,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
