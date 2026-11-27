import { db } from "@/lib/db";
import { safeEncrypt, safeDecrypt } from "./crypto";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  recurringEventId?: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

/**
 * Retrieve active Google Calendar access token from SQLite.
 * Auto-refreshes if expired and a refresh token is present.
 */
export async function getGoogleCalendarToken(businessId: string): Promise<{
  connected: boolean;
  accessToken?: string;
  email?: string;
  name?: string;
  error?: string;
}> {
  try {
    let record = db
      .prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ?")
      .get(businessId, "google_calendar") as any;

    if (record && record.status === "not_connected") {
      return { connected: false };
    }

    if (!record || record.status !== "connected") {
      record = db
        .prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ?")
        .get(businessId, "google") as any;
    }

    if (!record || record.status !== "connected" || !record.config) {
      return { connected: false };
    }

    let config: any = {};
    try {
      config = JSON.parse(record.config);
    } catch {
      return { connected: false };
    }

    let accessToken = config.accessToken ? safeDecrypt(config.accessToken) : null;
    const refreshToken = config.refreshToken ? safeDecrypt(config.refreshToken) : null;
    const expiresAt = config.expiresAt ? Number(config.expiresAt) : null;
    const email = config.connectedEmail || config.email || "";
    const name = config.accountName || config.name || "Google User";

    const isExpired = expiresAt ? Date.now() > expiresAt - 120000 : false;

    if ((!accessToken || isExpired) && refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          const newExpiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;

          config.accessToken = safeEncrypt(accessToken!);
          config.expiresAt = newExpiresAt;

          const now = new Date().toISOString();
          for (const key of ["google_calendar", "google"]) {
            db.prepare(`
              UPDATE integrations SET config = ?, updated_at = ?
              WHERE business_id = ? AND tool_key = ?
            `).run(JSON.stringify(config), now, businessId, key);
          }
        }
      }
    }

    if (!accessToken) {
      return { connected: false, error: "Access token missing or expired" };
    }

    return { connected: true, accessToken, email, name };
  } catch (err: any) {
    console.error("[getGoogleCalendarToken] Error:", err);
    return { connected: false, error: err.message };
  }
}
/**
 * List calendars from Google Calendar API v3
 */
export async function listGoogleCalendars(
  accessToken: string
): Promise<{ calendars: CalendarListItem[] }> {
  const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  url.searchParams.set("minAccessRole", "reader");
  url.searchParams.set("showHidden", "false");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawCalendars = data.items || [];

  const calendars: CalendarListItem[] = rawCalendars.map((c: any) => ({
    id: c.id,
    summary: c.summary,
    description: c.description,
    location: c.location,
    timeZone: c.timeZone,
    primary: c.primary || false,
    selected: c.selected || false,
    accessRole: c.accessRole,
    backgroundColor: c.backgroundColor,
    foregroundColor: c.foregroundColor,
  }));

  return { calendars };
}

/**
 * Fetch events from Google Calendar API v3
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  options: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
    q?: string;
  } = {}
): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
  const calendarId = options.calendarId || "primary";
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);

  if (options.timeMin) url.searchParams.set("timeMin", options.timeMin);
  if (options.timeMax) url.searchParams.set("timeMax", options.timeMax);
  if (options.maxResults) url.searchParams.set("maxResults", String(options.maxResults));
  if (options.singleEvents !== undefined) url.searchParams.set("singleEvents", String(options.singleEvents));
  if (options.orderBy) url.searchParams.set("orderBy", options.orderBy);
  if (options.q) url.searchParams.set("q", options.q);

  url.searchParams.set("fields", "nextPageToken,items(id,summary,description,location,start,end,attendees,organizer,status,htmlLink,created,updated,recurringEventId)");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawEvents = data.items || [];

  const events: CalendarEvent[] = rawEvents.map((e: any) => ({
    id: e.id,
    summary: e.summary || "(No title)",
    description: e.description,
    location: e.location,
    start: e.start,
    end: e.end,
    attendees: e.attendees,
    organizer: e.organizer,
    status: e.status,
    htmlLink: e.htmlLink,
    created: e.created,
    updated: e.updated,
    recurringEventId: e.recurringEventId,
  }));

  return { events, nextPageToken: data.nextPageToken };
}

/**
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
  }
): Promise<CalendarEvent> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("sendUpdates", "all");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Calendar event (${res.status}): ${errorText}`);
  }

  const e = await res.json();
  return {
    id: e.id,
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: e.start,
    end: e.end,
    attendees: e.attendees,
    organizer: e.organizer,
    status: e.status,
    htmlLink: e.htmlLink,
    created: e.created,
    updated: e.updated,
    recurringEventId: e.recurringEventId,
  };
}