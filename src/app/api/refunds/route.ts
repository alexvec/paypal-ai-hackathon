import { NextResponse } from "next/server";
import { z } from "zod";
import { paypalCredentials } from "@/lib/config";
import { handle, OWNER_COOKIE, readCookie, readJson } from "@/lib/http";
import { limitRefund } from "@/lib/ratelimit";
import { approveRefund } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Takes a signed proposal and an explicit approval. It accepts no capture id and no amount. */
const bodySchema = z.object({ approvalToken: z.string().min(1).max(4000), approved: z.literal(true, { message: "The owner has to approve the refund." }) }).strict();

export function POST(request: Request) {
  return handle(request, async () => {
    paypalCredentials();
    const { approvalToken } = bodySchema.parse(await readJson(request));
    limitRefund(request);
    return NextResponse.json(await approveRefund(approvalToken, readCookie(request, OWNER_COOKIE)));
  });
}
