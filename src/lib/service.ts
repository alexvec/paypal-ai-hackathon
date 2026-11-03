import type { LanguageModel } from "ai";
import { paymentProblem, runAgent } from "./agent";
import { HttpError } from "./errors";
import { extract, type ProposeInput } from "./extract";
import { overdueState, isChaseable, todayUtc } from "./overdue";
import type { PayPalGateway } from "./paypal/types";
import { checkBeforeSend, checkDraft, type Policy } from "./policy";
import { buildProposal } from "./proposal";
import { DEFAULT_RATE_CARD } from "./samples";
import { invoiceDraftSchema, invoiceActionSchema, type RateCardItem, type InvoiceView } from "./schemas";

export type Deps = { gateway: PayPalGateway; model: LanguageModel | null; policy: Policy; today?: string };

export async function propose(input: ProposeInput & { rateCard?: RateCardItem[] }, deps: Pick<Deps, "model" | "today">) {
  const rateCard = input.rateCard?.length ? input.rateCard : DEFAULT_RATE_CARD;
  const { extraction, llmSource, modelError } = await extract(input, rateCard, deps.model);
  return { proposal: buildProposal({ extraction, inputText: input.text, rateCard, today: deps.today ?? todayUtc() }), llmSource, modelError };
}

/** The approval gate and the policy both run here, ahead of the gateway. */
export async function createFromApproval(body: { approved?: unknown; draft?: unknown }, deps: Deps) {
  if (body.approved !== true) throw new HttpError(403, "APPROVAL_REQUIRED", "This action needs an explicit approval click.");
  const parsed = invoiceDraftSchema.safeParse(body.draft);
  if (!parsed.success) {
    throw new HttpError(400, "DRAFT_INCOMPLETE", "The draft is incomplete.", parsed.error.issues.map((i) => `${i.path.join(".") || "draft"}: ${i.message}`));
  }
  const violations = checkDraft(parsed.data, deps.policy);
  if (violations.length) throw new HttpError(422, "POLICY_BLOCKED", "Blocked by policy. Nothing was sent to PayPal.", violations);
  return deps.gateway.createInvoice(parsed.data);
}

export async function runInvoiceAction(id: string, rawAction: unknown, deps: Deps): Promise<InvoiceView> {
  const candidate = rawAction as { action?: string; approved?: unknown } | null;
  if (candidate && candidate.action !== "get" && candidate.approved !== true) {
    throw new HttpError(403, "APPROVAL_REQUIRED", "This action needs an explicit approval click.");
  }
  const parsed = invoiceActionSchema.safeParse(rawAction);
  if (!parsed.success) {
    throw new HttpError(400, "BAD_ACTION", "The request is not valid.", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  }
  const action = parsed.data;
  const { gateway, policy } = deps;
  const today = deps.today ?? todayUtc();

  if (action.action === "get") return gateway.getInvoice(id);

  const invoice = await gateway.getInvoice(id);

  if (action.action === "send") {
    const violations = checkBeforeSend(invoice, policy);
    if (violations.length) throw new HttpError(422, "POLICY_BLOCKED", "Blocked by policy. The invoice was not sent.", violations);
    return gateway.sendInvoice(id, action.note);
  }

  if (action.action === "remind") {
    const state = overdueState(invoice, action.overdueAfterDays, today);
    if (!state.overdue) throw new HttpError(422, "NOT_OVERDUE", `No reminder was sent. ${state.reason}`);
    return gateway.sendReminder(id, { subject: action.subject, note: action.note });
  }

  const problem = paymentProblem(invoice, action.amount);
  if (problem) throw new HttpError(422, "PAYMENT_BLOCKED", `No payment was recorded. ${problem}`);
  if (!invoice.currency || !isChaseable(invoice.status)) throw new HttpError(422, "PAYMENT_BLOCKED", "No payment was recorded. The invoice currency could not be read.");
  return gateway.recordPayment(id, {
    method: action.method,
    amount: action.amount,
    currency: invoice.currency,
    paymentDate: action.paymentDate,
    note: action.note,
  });
}

export function chase(input: { invoiceId: string; userNote: string; overdueAfterDays: number }, deps: Deps) {
  return runAgent(deps.gateway, deps.model, { ...input, today: deps.today ?? todayUtc() });
}
