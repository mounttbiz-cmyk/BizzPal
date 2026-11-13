import { NextRequest, NextResponse } from "next/server";
import { getOneDriveToken, listOneDriveFiles } from "@/lib/integrations/oneDrive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tokenInfo = await getOneDriveToken();

    if (!tokenInfo.connected || !tokenInfo.accessToken) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: tokenInfo.error || "OneDrive is not connected yet. Please connect your Microsoft account.",
      });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || undefined;
    const folderId = searchParams.get("folderId") || undefined;
    const onlySupported = searchParams.get("all") !== "true";

    const { files } = await listOneDriveFiles(tokenInfo.accessToken, {
      search,
      folderId,
      onlySupported,
    });

    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        email: tokenInfo.email,
        name: tokenInfo.name,
      },
      files,
    });
  } catch (error: any) {
    console.error("[OneDrive Files API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        connected: true,
        error: error.message || "Failed to list OneDrive files",
      },
      { status: 500 }
    );
  }
}
