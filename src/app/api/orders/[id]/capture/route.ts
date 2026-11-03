import { NextResponse } from "next/server";
import { paypalCredentials } from "@/lib/config";
import { handle, OWNER_COOKIE, readCookie } from "@/lib/http";
import { limitPayPalRead } from "@/lib/ratelimit";
import { captureOwnedOrder, orderIdSchema } from "@/lib/service";

export const dynamic = "force-dynamic";

/** The same capture as the return handler, for when the buyer approved but the redirect was lost. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    paypalCredentials();
    const orderId = orderIdSchema.parse((await context.params).id);
    limitPayPalRead(request);
    return NextResponse.json(await captureOwnedOrder(orderId, readCookie(request, OWNER_COOKIE)));
  });
}
