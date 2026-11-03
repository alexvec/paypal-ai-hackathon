import type { InvoiceView } from "./schemas";

const SETTLED = new Set(["PAID", "MARKED_AS_PAID", "PAID_EXTERNAL", "CANCELLED", "AUTO_CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "MARKED_AS_REFUNDED", "REFUNDED_EXTERNAL"]);
const CHASEABLE = new Set(["SENT", "UNPAID", "PARTIALLY_PAID", "SHARED"]);

export const isSettled = (status: string | null) => status !== null && SETTLED.has(status);
export const isChaseable = (status: string | null) => status !== null && CHASEABLE.has(status);

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export type OverdueState = { overdue: boolean; dueOn: string | null; reason: string };

/**
 * Toolkit 1.11.0 create_invoice has no due-date field, so an invoice made through it may carry no
 * PayPal due date. PayPal's payment_term.due_date wins when present. Otherwise the user's rule
 * applies: overdue this many days after the invoice date.
 */
export function overdueState(invoice: InvoiceView, overdueAfterDays: number, today: string): OverdueState {
  if (!isChaseable(invoice.status)) {
    return { overdue: false, dueOn: null, reason: `Status ${invoice.status ?? "unknown"} cannot be chased.` };
  }
  const dueOn = invoice.paymentDueDate ?? (invoice.invoiceDate ? addDays(invoice.invoiceDate, overdueAfterDays) : null);
  if (!dueOn) return { overdue: false, dueOn: null, reason: "The invoice has no date to measure from." };
  return today > dueOn
    ? { overdue: true, dueOn, reason: `Overdue since ${dueOn}.` }
    : { overdue: false, dueOn, reason: `Not overdue until after ${dueOn}.` };
}
