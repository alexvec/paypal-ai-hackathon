import type { Env } from "./config";
import { fromCents, lineTotalCents, toCents } from "./money";
import type { InvoiceDraft, InvoiceView } from "./schemas";

export type Policy = { maxInvoiceAmount: string; allowedCurrencies: string[] };

export const DEFAULT_POLICY: Policy = { maxInvoiceAmount: "5000.00", allowedCurrencies: ["USD", "EUR", "GBP"] };

export function resolvePolicy(env: Env = process.env): Policy {
  const rawMax = env.POLICY_MAX_INVOICE_AMOUNT?.trim();
  const rawCurrencies = env.POLICY_ALLOWED_CURRENCIES?.trim();
  const currencies = rawCurrencies
    ?.split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return {
    maxInvoiceAmount: rawMax && /^\d+(\.\d{1,2})?$/.test(rawMax) ? rawMax : DEFAULT_POLICY.maxInvoiceAmount,
    allowedCurrencies: currencies?.length ? currencies : DEFAULT_POLICY.allowedCurrencies,
  };
}

export function draftTotal(draft: InvoiceDraft): string {
  return fromCents(draft.lines.reduce((sum, l) => sum + lineTotalCents(l.quantity, l.unitPrice), 0));
}

function checkAmount(total: string, currency: string, policy: Policy): string[] {
  const violations: string[] = [];
  if (toCents(total) > toCents(policy.maxInvoiceAmount)) {
    violations.push(`Total ${total} ${currency} is over the ${policy.maxInvoiceAmount} per-invoice limit.`);
  }
  if (!policy.allowedCurrencies.includes(currency.toUpperCase())) {
    violations.push(`Currency ${currency} is not allowed. Allowed: ${policy.allowedCurrencies.join(", ")}.`);
  }
  return violations;
}

/** Runs before anything reaches PayPal. An empty list means the draft may be created. */
export function checkDraft(draft: InvoiceDraft, policy: Policy): string[] {
  return checkAmount(draftTotal(draft), draft.currency, policy);
}

/**
 * Runs on the invoice as PayPal reports it, right before send.
 * It fails closed: an amount that cannot be read is a violation, not a pass.
 */
export function checkBeforeSend(invoice: InvoiceView, policy: Policy): string[] {
  const violations: string[] = [];
  if (invoice.status !== "DRAFT") violations.push(`Only a DRAFT invoice can be sent. This one is ${invoice.status ?? "of unknown status"}.`);
  if (!invoice.recipientEmail) violations.push("The invoice has no recipient email address.");
  if (!invoice.total || !invoice.currency) {
    violations.push("The invoice amount could not be read, so the limit cannot be checked.");
  } else {
    violations.push(...checkAmount(invoice.total, invoice.currency, policy));
  }
  return violations;
}
