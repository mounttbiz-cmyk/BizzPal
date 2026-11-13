import { NextResponse } from "next/server";
import { getGoogleDriveToken } from "@/lib/integrations/googleDrive";

export const dynamic = "force-dynamic";

/**
 * Everything the browser needs to open the Google file picker: a short-lived access token for the
 * connected account, plus the browser API key and the Google Cloud project number.
 */
export async function GET() {
  const apiKey = process.env.GOOGLE_PICKER_API_KEY || "";
  const appId = process.env.GOOGLE_PROJECT_NUMBER || "";

  const tokenInfo = await getGoogleDriveToken();
  if (!tokenInfo.connected || !tokenInfo.accessToken) {
    return NextResponse.json({ success: false, connected: false, error: tokenInfo.error || "Google Drive is not connected yet." });
  }
  if (!apiKey || !appId) {
    return NextResponse.json({
      success: false,
      connected: true,
      configured: false,
      error: "Google Drive picking is not set up on this server yet (GOOGLE_PICKER_API_KEY and GOOGLE_PROJECT_NUMBER are missing).",
    });
  }
  return NextResponse.json({
    success: true,
    connected: true,
    configured: true,
    accessToken: tokenInfo.accessToken,
    apiKey,
    appId,
    email: tokenInfo.email,
  });
}
