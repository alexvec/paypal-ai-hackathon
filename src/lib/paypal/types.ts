import type { InvoiceDraft, InvoiceView, paymentMethods } from "../schemas";

export type RecordPaymentInput = {
  method: (typeof paymentMethods)[number];
  amount: string;
  currency: string;
  paymentDate: string;
  note?: string;
};

/** The real toolkit gateway and the mock implement this same interface. */
export interface PayPalGateway {
  readonly source: InvoiceView["source"];
  createInvoice(draft: InvoiceDraft): Promise<InvoiceView>;
  getInvoice(id: string): Promise<InvoiceView>;
  listInvoices(): Promise<InvoiceView[]>;
  sendInvoice(id: string, note?: string): Promise<InvoiceView>;
  sendReminder(id: string, reminder: { subject: string; note: string }): Promise<InvoiceView>;
  recordPayment(id: string, payment: RecordPaymentInput): Promise<InvoiceView>;
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly tool: string,
    readonly httpStatus: number | null = null,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}
