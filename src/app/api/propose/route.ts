import { resolveLlmMode } from "@/lib/config";
import { getModel } from "@/lib/llm";
import { limitLiveModelCalls } from "@/lib/ratelimit";
import { readJson, respond } from "@/lib/respond";
import { proposeRequestSchema } from "@/lib/schemas";
import { propose } from "@/lib/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST(request: Request) {
  return respond(async () => {
    const input = proposeRequestSchema.parse(await readJson(request));
    if (resolveLlmMode().mode === "live") limitLiveModelCalls(request);
    return propose(input, { model: getModel() });
  });
}
