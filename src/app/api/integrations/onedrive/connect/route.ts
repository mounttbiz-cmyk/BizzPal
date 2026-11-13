import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;

  // Origin resolution
  const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocal ? (req.headers.get("x-forwarded-proto") || "http") : "https";
  let origin = configuredOrigin || `${proto}://${host}`;
  if (!isLocal && origin.startsWith("http://")) {
    origin = origin.replace(/^http:\/\//, "https://");
  }

  const redirectUri = `${origin}/api/integrations/onedrive/callback`;
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/integrations";

  if (!clientId) {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Microsoft OneDrive Setup - BizzPal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #131b2e; border: 1px solid #3b82f6; border-radius: 16px; padding: 32px; max-width: 520px; text-align: left; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    h2 { color: #60a5fa; margin: 0 0 12px 0; font-size: 20px; display: flex; align-items: center; gap: 8px; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0; }
    code { background: #1e293b; padding: 3px 6px; border-radius: 6px; color: #38bdf8; font-family: monospace; font-size: 12px; }
    .box { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #cbd5e1; }
    ol { margin: 0; padding-left: 20px; line-height: 1.8; }
    .btn { background: #2563eb; color: #ffffff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-block; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>OneDrive OAuth Credentials Setup</h2>
    <p>To connect live Microsoft OneDrive, add your Microsoft Entra / Azure Client ID to your <code>.env.local</code> file:</p>
    <div class="box">
      <strong>Add to <code>.env.local</code>:</strong><br /><br />
      <code>MICROSOFT_CLIENT_ID=your_azure_client_id</code><br />
      <code>MICROSOFT_CLIENT_SECRET=your_azure_secret</code>
    </div>
    <p><strong>Quick 1-Minute Steps:</strong></p>
    <ol>
      <li>Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" style="color:#60a5fa">Azure Portal -> App Registrations</a></li>
      <li>Click <strong>New registration</strong>, choose <em>"Accounts in any organizational directory and personal Microsoft accounts"</em></li>
      <li>Add Redirect URI (Web): <code>${redirectUri}</code></li>
      <li>Add API Permissions: <code>Files.Read</code>, <code>User.Read</code></li>
      <li>Copy the Application (client) ID into <code>MICROSOFT_CLIENT_ID</code></li>
    </ol>
    <div style="margin-top: 24px; text-align: right;">
      <button onclick="window.close()" class="btn">Close Window</button>
    </div>
  </div>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const state = Buffer.from(JSON.stringify({ returnTo, origin })).toString("base64url");

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  // Files.Read covers the user's own files. Files.Read.All would need an administrator's approval in many company accounts.
  authUrl.searchParams.set("scope", "offline_access Files.Read User.Read");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl.toString());
}

