import { NextResponse } from "next/server";
import { z } from "zod";
import { paypalCredentials } from "@/lib/config";
import { handle, OWNER_COOKIE, readCookie, readJson } from "@/lib/http";
import { limitModelCall, limitPayPalRead } from "@/lib/ratelimit";
import { messageSchema, openCase, orderIdSchema } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ orderId: orderIdSchema, message: messageSchema });

/** The referee: PayPal's record, the model's reading of the message, code's decision. Moves no money. */
export function POST(request: Request) {
  return handle(request, async () => {
    paypalCredentials();
    const { orderId, message } = bodySchema.parse(await readJson(request));
    limitPayPalRead(request);
    return NextResponse.json(await openCase(orderId, message, readCookie(request, OWNER_COOKIE), () => limitModelCall(request)));
  });
}
