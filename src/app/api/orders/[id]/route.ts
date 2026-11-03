import { NextResponse } from "next/server";
import { paypalCredentials } from "@/lib/config";
import { handle, OWNER_COOKIE, readCookie } from "@/lib/http";
import { limitPayPalRead } from "@/lib/ratelimit";
import { orderIdSchema, readOrder } from "@/lib/service";

export const dynamic = "force-dynamic";

/** Re-reads an order from PayPal. Only for the browser that created it. */
export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    paypalCredentials();
    const orderId = orderIdSchema.parse((await context.params).id);
    limitPayPalRead(request);
    return NextResponse.json(await readOrder(orderId, readCookie(request, OWNER_COOKIE)), { headers: { "Cache-Control": "no-store" } });
  });
}
