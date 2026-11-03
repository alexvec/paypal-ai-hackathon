import { randomUUID } from "node:crypto";
import { fromCents, toCents } from "../money";
import { draftTotal } from "../policy";
import type { InvoiceView } from "../schemas";
import { PayPalError, type PayPalGateway } from "./types";

/**
 * MOCK. No request goes to PayPal. Nothing here describes PayPal behaviour.
 * Serverless instances do not share memory, so the browser returns the last snapshot and
 * rehydrateMock() restores it, and the browser's copy wins over a stale instance. The snapshot is ignored entirely outside mock mode.
 */
const store = new Map<string, InvoiceView>();

export function rehydrateMock(snapshot: InvoiceView | undefined): void {
  if (snapshot?.source === "MOCK" && snapshot.id.startsWith("MOCK-")) {
    store.set(snapshot.id, snapshot);
  }
}

function find(id: string, tool: string): InvoiceView {
  const invoice = store.get(id);
  if (!invoice) throw new PayPalError(`MOCK: no invoice ${id}.`, tool, 404, "MOCK_NOT_FOUND");
  return invoice;
}

function save(invoice: InvoiceView): InvoiceView {
  store.set(invoice.id, invoice);
  return invoice;
}

export const mockGateway: PayPalGateway = {
  source: "MOCK",

  async createInvoice(draft) {
    const total = draftTotal(draft);
    return save({
      id: `MOCK-${randomUUID().slice(0, 13).toUpperCase()}`,
      status: "DRAFT",
      number: null,
      currency: draft.currency,
      total,
      due: total,
      invoiceDate: draft.invoiceDate,
      paymentDueDate: null,
      recipientEmail: draft.clientEmail ?? null,
      recipientName: draft.clientName ?? null,
      recipientViewUrl: null,
      invoicerViewUrl: null,
      source: "MOCK",
    });
  },

  async getInvoice(id) {
    return find(id, "get_invoice");
  },

  async listInvoices() {
    return [...store.values()];
  },

  async sendInvoice(id) {
    const invoice = find(id, "send_invoice");
    return save({ ...invoice, status: "SENT" });
  },

  async sendReminder(id) {
    return find(id, "send_invoice_reminder");
  },

  async recordPayment(id, payment) {
    const invoice = find(id, "record_payment_for_invoice");
    const remaining = toCents(invoice.due ?? invoice.total ?? "0") - toCents(payment.amount);
    return save({
      ...invoice,
      status: remaining <= 0 ? "PAID" : "PARTIALLY_PAID",
      due: fromCents(Math.max(remaining, 0)),
    });
  },
};
