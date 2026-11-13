import { NextRequest, NextResponse } from "next/server";
import { getOneDriveToken, fetchOneDriveFile } from "@/lib/integrations/oneDrive";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tokenInfo = await getOneDriveToken();

    if (!tokenInfo.connected || !tokenInfo.accessToken) {
      return NextResponse.json(
        { success: false, connected: false, error: "OneDrive is not connected." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { itemId, fileName } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "itemId is required" },
        { status: 400 }
      );
    }

    const result = await fetchOneDriveFile(tokenInfo.accessToken, itemId, fileName);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[OneDrive Download API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to download OneDrive file" },
      { status: 500 }
    );
  }
}
