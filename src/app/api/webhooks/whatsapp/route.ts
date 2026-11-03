import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { authorizeWhatsApp } from "@/lib/webhookAuth";

// Inbound webhook for WhatsApp replies (Twilio / Meta format)
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let sender = "";
    let messageBody = "";

    // Read the raw body once so the signature can be checked against exactly what was sent.
    const rawBody = await req.text();
    const auth = authorizeWhatsApp(req, rawBody);
    if (auth === "unconfigured") {
      return NextResponse.json({ error: "WhatsApp webhook secret not configured" }, { status: 503 });
    }
    if (auth !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = new URLSearchParams(rawBody);
      sender = formData.get("From") || "";
      messageBody = formData.get("Body") || "";
    } else {
      const json = JSON.parse(rawBody || "{}");
      // Handle Meta Cloud API format or generic JSON
      if (json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const msg = json.entry[0].changes[0].value.messages[0];
        sender = msg.from || "";
        messageBody = msg.text?.body || "";
      } else {
        sender = json.From || json.from || json.sender || "";
        messageBody = json.Body || json.body || json.message || "";
      }
    }

    if (!messageBody.trim()) {
      return NextResponse.json({ error: "Empty message body" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const checkinId = `chk_wa_${Date.now()}`;

    // Structure the message body into check-in answers
    // If structured keywords like 1. / 2. / 3. exist, parse them, otherwise assign rawText
    const answers: Record<string, string> = {
      summary: messageBody.trim(),
      rawInput: messageBody.trim(),
    };

    // Store into daily_checkins
    const existing = db
      .prepare("SELECT id FROM daily_checkins WHERE business_id = ? AND date = ?")
      .get(DEFAULT_BUSINESS_ID, today) as any;

    if (existing) {
      db.prepare(`
        UPDATE daily_checkins SET
          source = 'whatsapp',
          answers = ?,
          raw_text = ?,
          created_at = ?
        WHERE id = ?
      `).run(
        JSON.stringify(answers),
        messageBody.trim(),
        now,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO daily_checkins (id, business_id, date, source, answers, raw_text, created_at)
        VALUES (?, ?, ?, 'whatsapp', ?, ?, ?)
      `).run(
        checkinId,
        DEFAULT_BUSINESS_ID,
        today,
        JSON.stringify(answers),
        messageBody.trim(),
        now
      );
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp response ingested into daily check-in",
      date: today,
      sender,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
