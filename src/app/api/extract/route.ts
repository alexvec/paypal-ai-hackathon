import { NextResponse } from "next/server";
import { extractClaim } from "@/lib/claim";
import { CLAUSE_IDS } from "@/lib/policy";
import { gatewayModelId } from "@/lib/config";
import { handle, readJson } from "@/lib/http";
import { getModel } from "@/lib/llm";
import { limitModelCall } from "@/lib/ratelimit";
import { catalogLines, messageSchema } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The real model call on a visitor's text, with no PayPal record behind it. It reads the message
 * and validates the JSON. It decides nothing about money, and the response says so.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const message = messageSchema.parse(((await readJson(request)) as { message?: unknown })?.message);
    const model = getModel();
    limitModelCall(request);
    const extraction = await extractClaim(message, catalogLines(), model, "No payment record is available for this message.");
    const unknownClauses = extraction.status === "VALID" ? extraction.claim.clauses.map((clause) => clause.id).filter((id) => !CLAUSE_IDS.includes(id)) : [];
    return NextResponse.json({
      model: `gateway/${gatewayModelId()}`,
      extraction,
      unknownClauses,
      refundDecision: null,
      notice: "Model extraction only. No PayPal record was read and no refund decision was made.",
    });
  });
}
