import { NextResponse } from "next/server";
import { publicModes } from "@/lib/config";
import { sourceLabels } from "@/lib/respond";

export const dynamic = "force-dynamic";

/** Liveness only. The modes report which keys are configured. No PayPal or model call is made here. */
export function GET() {
  const modes = publicModes();
  return NextResponse.json({
    status: "ok",
    service: "billing-desk-agent",
    ...sourceLabels(),
    paypal: modes.paypal,
    llm: modes.llm,
    warnings: modes.warnings,
  });
}
