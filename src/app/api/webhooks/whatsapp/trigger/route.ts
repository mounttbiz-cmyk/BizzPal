import { NextResponse } from "next/server";

/**
 * WhatsApp check-in sender.
 *
 * Switched off on purpose. A webhook call carries no sign-in, so it cannot say which customer it belongs to,
 * and the old version wrote everything to one shared business. It will return once each customer gets their
 * own private webhook address.
 */
export async function POST() {
  return NextResponse.json({ error: "WhatsApp check-in is not available yet." }, { status: 503 });
}
