import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { publicModes, redactSecrets } from "./config";
import { HttpError } from "./errors";
import { PayPalError } from "./paypal/types";

/** The labels every API response carries, so no output can be mistaken for real PayPal or model output. */
export function sourceLabels() {
  const modes = publicModes();
  return {
    source: modes.paypal === "mock" ? ("MOCK" as const) : ("PAYPAL_SANDBOX" as const),
    // A route that really called the model overrides this with LIVE_MODEL or CANNED.
    llmSource: modes.llm === "canned" ? ("CANNED" as const) : ("MODEL_CONFIGURED" as const),
  };
}

export async function respond(run: () => Promise<Record<string, unknown>>): Promise<NextResponse> {
  try {
    return NextResponse.json({ ...sourceLabels(), ...(await run()) });
  } catch (error) {
    const labels = sourceLabels();
    if (error instanceof HttpError) {
      return NextResponse.json({ ...labels, error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ ...labels, error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "The request is not valid.", details: error.issues.map((i) => i.message) } }, { status: 400 });
    }
    if (error instanceof PayPalError) {
      return NextResponse.json(
        { ...labels, error: { code: "PAYPAL_ERROR", message: redactSecrets(error.message), details: [], tool: error.tool, paypalStatus: error.httpStatus } },
        { status: 502 },
      );
    }
    console.error("Unhandled route error", redactSecrets(error instanceof Error ? error.message : String(error)));
    return NextResponse.json(
      { ...labels, error: { code: "UPSTREAM_ERROR", message: "The request failed before finishing. Nothing was faked. Check the model and PayPal settings, then try again.", details: [] } },
      { status: 502 },
    );
  }
}

export function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => {
    throw new HttpError(400, "BAD_JSON", "The request body is not valid JSON.");
  });
}
