import { NextRequest, NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID, healDatabasePermissions } from "@/lib/db";
import { safeEncrypt } from "@/lib/integrations/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const errorDesc = req.nextUrl.searchParams.get("error_description");
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

  // Derive origin from state or request headers
  const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocal ? (req.headers.get("x-forwarded-proto") || "http") : "https";
  let currentOrigin = configuredOrigin || requestOrigin || `${proto}://${host}`;
  if (!isLocal && currentOrigin.startsWith("http://")) {
    currentOrigin = currentOrigin.replace(/^http:\/\//, "https://");
  }
  const redirectUri = `${currentOrigin}/api/integrations/onedrive/callback`;

  if (oauthError || !code) {
    const errorMsg = errorDesc || oauthError || "No authorization code returned from Microsoft";
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Microsoft Authentication Cancelled - BizzPal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #131b2e; border: 1px solid #e11d48; border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; }
    h2 { color: #f43f5e; margin: 0 0 12px 0; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; margin: 0 0 24px 0; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>OneDrive Connection Cancelled</h2>
    <p>${errorMsg}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'BIZZPAL_ONEDRIVE_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
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

  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId) {
    return new NextResponse("MICROSOFT_CLIENT_ID missing on server", { status: 500 });
  }

  try {
    // 1. Exchange authorization code for tokens
    const bodyParams: Record<string, string> = {
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: "offline_access Files.Read Files.Read.All User.Read",
    };
    if (clientSecret) bodyParams.client_secret = clientSecret;

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(bodyParams),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("[OneDrive OAuth] Token exchange error:", errText);
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json();

    // 2. Fetch authenticated user profile from Microsoft Graph
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let email = "";
    let name = "Microsoft User";
    if (userInfoResponse.ok) {
      const profile = await userInfoResponse.json();
      email = profile.mail || profile.userPrincipalName || "";
      name = profile.displayName || email.split("@")[0] || "Microsoft User";
    }

    const now = new Date().toISOString();
    const expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null;

    const configData = {
      connectedEmail: email,
      accountName: name,
      liveOAuth: true,
      accountDetail: `Connected · Live Microsoft OneDrive: ${email}`,
      connectedAt: now,
      hasRefreshToken: !!tokens.refresh_token,
      accessToken: safeEncrypt(tokens.access_token || ""),
      refreshToken: tokens.refresh_token ? safeEncrypt(tokens.refresh_token) : undefined,
      expiresAt,
    };

    // 3. Persist to database
    try {
      const existing = db
        .prepare("SELECT id, config FROM integrations WHERE business_id = ? AND tool_key = ?")
        .get(DEFAULT_BUSINESS_ID, "onedrive") as any;

      if (existing) {
        db.prepare(`
          UPDATE integrations SET
            status = 'connected',
            config = ?,
            updated_at = ?
          WHERE business_id = ? AND tool_key = 'onedrive'
        `).run(JSON.stringify(configData), now, DEFAULT_BUSINESS_ID);
      } else {
        db.prepare(`
          INSERT INTO integrations (id, business_id, tool_key, name, category, status, config, updated_at)
          VALUES (?, ?, 'onedrive', 'Microsoft OneDrive', 'business', 'connected', ?, ?)
        `).run(`int_${Date.now()}_onedrive`, DEFAULT_BUSINESS_ID, JSON.stringify(configData), now);
      }

      // Update business connected_tools list
      const biz = db.prepare("SELECT connected_tools FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
      if (biz) {
        const tools: string[] = biz.connected_tools ? JSON.parse(biz.connected_tools) : [];
        if (!tools.includes("onedrive")) tools.push("onedrive");
        db.prepare(
          "UPDATE businesses SET connected_tools = ?, no_integrations = 0, updated_at = ? WHERE id = ?"
        ).run(JSON.stringify(tools), now, DEFAULT_BUSINESS_ID);
      }
    } catch (dbErr: any) {
      console.warn("[OneDrive Callback] SQLite write error:", dbErr.message);
      healDatabasePermissions();
    }

    const successData = {
      email,
      name,
      toolKey: "onedrive",
      detail: `Connected · Live Microsoft OneDrive: ${email}`,
    };

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OneDrive Connected - BizzPal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #0f172a; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 20px; padding: 36px; max-width: 440px; text-align: center; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 14px; }
    h2 { color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
    .email { color: #93c5fd; font-size: 14px; font-weight: 500; margin: 0 0 16px 0; }
    .info { color: #64748b; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● Authenticating OneDrive</div>
    <h2>Connected ${name}</h2>
    <p class="email">${email}</p>
    <p class="info">Synchronizing OneDrive with BizzPal Executive Platform...</p>
  </div>
  <script>
    const payload = ${JSON.stringify(successData)};
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'BIZZPAL_ONEDRIVE_AUTH_SUCCESS', data: payload }, '*');
      } catch (e) {}
      setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 300);
    } else {
      setTimeout(() => {
        window.location.href = '${returnTo}?connected=onedrive';
      }, 600);
    }
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    console.error("[OneDrive Callback Error]:", err);
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Error</title></head>
      <body style="font-family:sans-serif;background:#0b0f19;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="background:#131b2e;border:1px solid #e11d48;border-radius:16px;padding:32px;max-width:420px;text-align:center">
          <h2 style="color:#f43f5e">Connection Error</h2>
          <p style="color:#94a3b8;font-size:13px">${err.message}</p>
          <button onclick="window.close()" style="background:#1e293b;color:#f8fafc;border:1px solid #334155;padding:8px 16px;border-radius:8px;cursor:pointer">Close</button>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
