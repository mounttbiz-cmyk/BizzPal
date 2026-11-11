import { NextResponse } from "next/server";
import { getGcpBilling } from "@/lib/gcp/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getGcpBilling();
  return NextResponse.json({ success: true, ...result });
}
