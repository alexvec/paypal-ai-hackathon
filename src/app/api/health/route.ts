import { NextResponse } from "next/server";
import { connectionStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Variable names only. "connected" means configured: this route calls neither PayPal nor the model. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "refund-referee", ...connectionStatus() }, { headers: { "Cache-Control": "no-store" } });
}
