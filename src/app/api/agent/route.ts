import { resolveLlmMode } from "@/lib/config";
import { getModel } from "@/lib/llm";
import { getGateway } from "@/lib/paypal";
import { rehydrateMock } from "@/lib/paypal/mock";
import { resolvePolicy } from "@/lib/policy";
import { limitLiveModelCalls } from "@/lib/ratelimit";
import { readJson, respond } from "@/lib/respond";
import { agentRequestSchema } from "@/lib/schemas";
import { chase } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST(request: Request) {
  return respond(async () => {
    const input = agentRequestSchema.parse(await readJson(request));
    if (resolveLlmMode().mode === "live") limitLiveModelCalls(request);
    const gateway = getGateway();
    if (gateway.source === "MOCK") rehydrateMock(input.mockSnapshot);
    const result = await chase(input, { gateway, model: getModel(), policy: resolvePolicy() });
    return { ...result };
  });
}
