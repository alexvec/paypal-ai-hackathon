import { getModel } from "@/lib/llm";
import { getGateway } from "@/lib/paypal";
import { resolvePolicy } from "@/lib/policy";
import { readJson, respond } from "@/lib/respond";
import { createFromApproval } from "@/lib/service";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return respond(async () => {
    const body = (await readJson(request)) as { approved?: unknown; draft?: unknown };
    const invoice = await createFromApproval(body, { gateway: getGateway(), model: getModel(), policy: resolvePolicy() });
    return { invoice };
  });
}
