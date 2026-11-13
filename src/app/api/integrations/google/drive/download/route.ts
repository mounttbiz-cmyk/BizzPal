import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveToken, fetchGoogleDriveFile } from "@/lib/integrations/googleDrive";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tokenInfo = await getGoogleDriveToken();

    if (!tokenInfo.connected || !tokenInfo.accessToken) {
      return NextResponse.json(
        { success: false, connected: false, error: "Google Drive is not connected." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fileId, mimeType, fileName } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId is required" },
        { status: 400 }
      );
    }

    const result = await fetchGoogleDriveFile(tokenInfo.accessToken, fileId, mimeType, fileName);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[Google Drive Download API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to download Google Drive file" },
      { status: 500 }
    );
  }
}

