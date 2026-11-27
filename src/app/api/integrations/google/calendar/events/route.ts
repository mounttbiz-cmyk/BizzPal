import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarToken, listGoogleCalendarEvents, createGoogleCalendarEvent } from "@/lib/integrations/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  const searchParams = req.nextUrl.searchParams;
  const calendarId = searchParams.get("calendarId") || "primary";
  const timeMin = searchParams.get("timeMin") || new Date().toISOString();
  const timeMax = searchParams.get("timeMax") || undefined;
  const maxResults = searchParams.get("maxResults") ? Number(searchParams.get("maxResults")) : 50;
  const q = searchParams.get("q") || undefined;

  try {
    const result = await listGoogleCalendarEvents(tokenInfo.accessToken, {
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
      q,
    });

    return NextResponse.json({
      success: true,
      connected: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[Google Calendar Events] Error:", err);
    return NextResponse.json(
      { success: false, connected: true, error: err.message || "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const {
      calendarId = "primary",
      summary,
      description,
      location,
      start,
      end,
      attendees,
    } = body;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: summary, start, end" },
        { status: 400 }
      );
    }

    const event = await createGoogleCalendarEvent(tokenInfo.accessToken!, calendarId, {
      summary,
      description,
      location,
      start: { dateTime: start.dateTime, timeZone: start.timeZone },
      end: { dateTime: end.dateTime, timeZone: end.timeZone },
      attendees,
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error("[Google Calendar Create Event] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create calendar event" },
      { status: 500 }
    );
  }
}