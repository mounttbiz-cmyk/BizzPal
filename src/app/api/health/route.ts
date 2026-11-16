import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For uptime monitors: answers 200 when the app and its database are working. Shows nothing private. */
export async function GET() {
  try {
    db.prepare("SELECT 1").get();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
