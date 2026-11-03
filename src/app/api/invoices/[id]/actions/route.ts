import { z } from "zod";
import { getModel } from "@/lib/llm";
import { getGateway } from "@/lib/paypal";
import { rehydrateMock } from "@/lib/paypal/mock";
import { resolvePolicy } from "@/lib/policy";
import { readJson, respond } from "@/lib/respond";
import { invoiceViewSchema } from "@/lib/schemas";
import { runInvoiceAction } from "@/lib/service";

export const dynamic = "force-dynamic";

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const { id } = await context.params;
    const idCheck = z.string().regex(/^[A-Za-z0-9_-]{1,127}$/).parse(id);
    const body = (await readJson(request)) as { mockSnapshot?: unknown };
    const gateway = getGateway();
    if (gateway.source === "MOCK") rehydrateMock(invoiceViewSchema.optional().parse(body?.mockSnapshot));
    const invoice = await runInvoiceAction(idCheck, body, { gateway, model: getModel(), policy: resolvePolicy() });
    return { invoice };
  });
}
