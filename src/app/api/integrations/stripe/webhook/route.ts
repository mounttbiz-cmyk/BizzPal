import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { verifyStripeSignature } from "@/lib/webhookAuth";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Only genuine, signed Stripe events are accepted. Without this anyone could post fake payments.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 503 });
    }
    if (!verifyStripeSignature(rawBody, req.headers.get("stripe-signature"), webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let event: any;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.type || "payment_intent.succeeded";
    // No made-up default amount: a missing amount counts as 0.
    const amount = event.data?.object?.amount ? Number(event.data.object.amount) / 100 : 0;
    const currency = event.data?.object?.currency || "inr";
    const now = new Date().toISOString();

    // Ignore replays of an event we already processed (prevents double-counting revenue).
    if (event.id && db.prepare("SELECT 1 FROM stripe_events WHERE id = ?").get(event.id)) {
      return NextResponse.json({ received: true, eventId: event.id, duplicate: true });
    }

    // 1. Store the incoming Stripe event
    db.prepare(`
      INSERT INTO stripe_events (id, business_id, event_type, amount, currency, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      DEFAULT_BUSINESS_ID,
      eventType,
      amount,
      currency,
      JSON.stringify(event),
      now
    );

    // 2. Ensure Stripe integration is marked 'connected'
    db.prepare(`
      UPDATE integrations SET status = 'connected', updated_at = ?
      WHERE business_id = ? AND tool_key = 'stripe'
    `).run(now, DEFAULT_BUSINESS_ID);

    // 3. Increment monthly revenue if payment event
    if (eventType === "payment_intent.succeeded" || eventType === "invoice.payment_succeeded") {
      db.prepare(`
        UPDATE businesses SET
          monthly_revenue = monthly_revenue + ?,
          updated_at = ?
        WHERE id = ?
      `).run(amount, now, DEFAULT_BUSINESS_ID);
    }

    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      amount,
      currency,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
