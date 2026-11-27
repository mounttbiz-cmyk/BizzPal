import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextResponse } from "next/server";
import { getGoogleCalendarToken, listGoogleCalendars } from "@/lib/integrations/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  const tokenInfo = await getGoogleCalendarToken(tenantId);
  if (!tokenInfo.connected || !tokenInfo.accessToken) {
    return NextResponse.json(
      { success: false, connected: false, error: tokenInfo.error || "Google Calendar is not connected yet." },
      { status: 401 }
    );
  }

  try {
    const result = await listGoogleCalendars(tokenInfo.accessToken);

    return NextResponse.json({
      success: true,
      connected: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[Google Calendar List] Error:", err);
    return NextResponse.json(
      { success: false, connected: true, error: err.message || "Failed to fetch calendars" },
      { status: 500 }
    );
  }
}