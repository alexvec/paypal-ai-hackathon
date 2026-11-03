import { NextResponse } from "next/server";
import { originFor } from "@/lib/config";
import { HttpError } from "@/lib/errors";
import { OWNER_COOKIE, readCookie } from "@/lib/http";
import { limitPayPalRead } from "@/lib/ratelimit";
import { captureOwnedOrder, orderIdSchema } from "@/lib/service";

export const dynamic = "force-dynamic";

/** PayPal sends the buyer back here with ?token=<order id>. Captures, then returns to the page. */
export async function GET(request: Request) {
  const origin = originFor(request);
  const target = new URL("/", origin);
  const parsed = orderIdSchema.safeParse(new URL(request.url).searchParams.get("token"));
  if (!parsed.success) {
    target.searchParams.set("error", "PayPal returned without a valid order id.");
    return NextResponse.redirect(target, 303);
  }
  target.searchParams.set("order", parsed.data);
  try {
    limitPayPalRead(request);
    await captureOwnedOrder(parsed.data, readCookie(request, OWNER_COOKIE));
  } catch (error) {
    target.searchParams.set("error", error instanceof HttpError ? error.message : "The capture failed.");
  }
  return NextResponse.redirect(target, 303);
}
