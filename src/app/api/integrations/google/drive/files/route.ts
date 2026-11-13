import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveToken, listGoogleDriveFiles } from "@/lib/integrations/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tokenInfo = await getGoogleDriveToken();

    if (!tokenInfo.connected || !tokenInfo.accessToken) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: tokenInfo.error || "Google Drive is not connected yet. Please connect your Google account.",
      });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || undefined;
    const folderId = searchParams.get("folderId") || undefined;
    const onlySupported = searchParams.get("all") !== "true";
    const pageToken = searchParams.get("pageToken") || undefined;

    const { files, nextPageToken } = await listGoogleDriveFiles(tokenInfo.accessToken, {
      search,
      folderId,
      onlySupported,
      pageToken,
    });

    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        email: tokenInfo.email,
        name: tokenInfo.name,
      },
      files,
      nextPageToken,
    });
  } catch (error: any) {
    console.error("[Google Drive Files API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        connected: true,
        error: error.message || "Failed to list Google Drive files",
      },
      { status: 500 }
    );
  }
}
