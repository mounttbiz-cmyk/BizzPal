import { NextRequest, NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID, healDatabasePermissions } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const stateRaw = req.nextUrl.searchParams.get("state");

  let returnTo = "/integrations";
  let requestOrigin = "";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
      if (parsed.returnTo) returnTo = parsed.returnTo;
      if (parsed.origin) requestOrigin = parsed.origin;
    } catch {}
  }

  // Derive origin if not in state
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const currentOrigin = requestOrigin || `${proto}://${host}`;
  const redirectUri = `${currentOrigin}/api/integrations/google/callback`;

  // Handle OAuth error or user rejection
  if (oauthError || !code) {
    const errorMsg = oauthError || "No authorization code returned from Google";
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Google Authentication Cancelled - BizzPal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #131b2e; border: 1px solid #e11d48; border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    h2 { color: #f43f5e; margin: 0 0 12px 0; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Connection Cancelled</h2>
    <p>${errorMsg}. You can try connecting your Google account again anytime.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'BIZZPAL_GOOGLE_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => { window.location.href = '${returnTo}'; }, 2000);
    }
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse("Google OAuth credentials missing on server", { status: 500 });
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("[Google OAuth] Token exchange error:", tokenError);
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    // 2. Fetch authenticated user profile
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch Google profile info");
    }

    const profile = await userInfoResponse.json();
    const email = profile.email || "";
    const name = profile.name || email.split("@")[0] || "Google User";
    const picture = profile.picture || null;
    const now = new Date().toISOString();

    const configData = {
      connectedEmail: email,
      accountName: name,
      picture,
      liveOAuth: true,
      scopes: ["openid", "email", "profile", "calendar.readonly"],
      accountDetail: `Connected · Live Google Account: ${email}`,
      connectedAt: now,
      hasRefreshToken: !!tokens.refresh_token,
    };

    // 3. Persist to database for both 'google' and 'google_calendar'
    try {
      const toolsToUpdate = ["google", "google_calendar"];
      for (const toolKey of toolsToUpdate) {
        const existing = db
          .prepare("SELECT id, config FROM integrations WHERE business_id = ? AND tool_key = ?")
          .get(DEFAULT_BUSINESS_ID, toolKey) as any;

        const displayName = toolKey === "google" ? "Google Account & Workspace" : "Google Calendar";

        if (existing) {
          db.prepare(`
            UPDATE integrations SET
              status = 'connected',
              config = ?,
              updated_at = ?
            WHERE business_id = ? AND tool_key = ?
          `).run(JSON.stringify(configData), now, DEFAULT_BUSINESS_ID, toolKey);
        } else {
          db.prepare(`
            INSERT INTO integrations (id, business_id, tool_key, name, category, status, config, updated_at)
            VALUES (?, ?, ?, ?, 'business', 'connected', ?, ?)
          `).run(
            `int_${Date.now()}_${toolKey}`,
            DEFAULT_BUSINESS_ID,
            toolKey,
            displayName,
            JSON.stringify(configData),
            now
          );
        }
      }

      // Update business connected_tools list
      const biz = db.prepare("SELECT connected_tools FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
      if (biz) {
        const tools: string[] = biz.connected_tools ? JSON.parse(biz.connected_tools) : [];
        if (!tools.includes("google")) tools.push("google");
        if (!tools.includes("google_calendar")) tools.push("google_calendar");
        db.prepare(
          "UPDATE businesses SET connected_tools = ?, no_integrations = 0, updated_at = ? WHERE id = ?"
        ).run(JSON.stringify(tools), now, DEFAULT_BUSINESS_ID);
      }
    } catch (dbErr: any) {
      console.warn("[Google Callback] SQLite write error, attempting repair:", dbErr.message);
      healDatabasePermissions();
    }

    // 4. Return success HTML with window.opener bridge
    const successData = {
      email,
      name,
      picture,
      toolKey: "google",
      detail: `Connected · Live Google Account: ${email}`,
      config: configData,
    };

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Google Connected - BizzPal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 20px;
      padding: 36px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7);
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid #3b82f6;
      margin: 0 auto 16px;
      object-fit: cover;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 14px;
    }
    h2 {
      color: #ffffff;
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 700;
    }
    .email {
      color: #93c5fd;
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 16px 0;
    }
    .info {
      color: #64748b;
      font-size: 12px;
      margin: 0;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    ${picture ? `<img src="${picture}" class="avatar" alt="${name}" />` : ""}
    <div class="badge"><span class="pulse-dot"></span> Live Account Connected</div>
    <h2>Welcome, ${name}!</h2>
    <p class="email">${email}</p>
    <p class="info">Synced with BizzPal Executive Platform. Closing window...</p>
  </div>
  <script>
    const payload = ${JSON.stringify(successData)};
    if (window.opener) {
      window.opener.postMessage({ type: 'BIZZPAL_GOOGLE_AUTH_SUCCESS', data: payload }, '*');
      setTimeout(() => window.close(), 1200);
    } else {
      setTimeout(() => {
        window.location.href = '${returnTo}?connected=google';
      }, 1500);
    }
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]:", err);
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Connection Error - BizzPal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #131b2e; border: 1px solid #e11d48; border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; }
    h2 { color: #f43f5e; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Authentication Error</h2>
    <p>${err.message || "Failed to complete Google OAuth exchange."}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'BIZZPAL_GOOGLE_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
      setTimeout(() => window.close(), 2500);
    }
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
