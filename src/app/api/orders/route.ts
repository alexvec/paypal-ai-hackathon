import { NextResponse } from "next/server";
import { originFor, paypalCredentials } from "@/lib/config";
import { handle, OWNER_COOKIE, readCookie, readJson, setOwnerCookie } from "@/lib/http";
import { limitOrderCreate } from "@/lib/ratelimit";
import { createTestOrder, quantitiesSchema } from "@/lib/service";

export const dynamic = "force-dynamic";

/** Creates a sandbox order from the server's catalogue. A visitor picks quantities, never prices. */
export function POST(request: Request) {
  return handle(request, async () => {
    paypalCredentials();
    const quantities = quantitiesSchema.parse(((await readJson(request)) as { quantities?: unknown })?.quantities);
    limitOrderCreate(request);
    const { ownerSecret, ...order } = await createTestOrder(quantities, readCookie(request, OWNER_COOKIE), originFor(request));
    const response = NextResponse.json(order, { status: 201 });
    setOwnerCookie(response, ownerSecret, request);
    return response;
  });
}
