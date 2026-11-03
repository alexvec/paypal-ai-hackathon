import { DEFAULT_POLICY } from "@/lib/policy";
import type { InvoiceDraft, InvoiceView } from "@/lib/schemas";
import { PayPalGateway } from "@/lib/paypal/types";
import { vi } from "vitest";

export const policy = DEFAULT_POLICY;
export const TODAY = "2026-11-03";

export const draft: InvoiceDraft = {
  clientName: "Example Bakery",
  clientEmail: "sam@example.com",
  currency: "USD",
  invoiceDate: "2026-10-01",
  lines: [
    { description: "Call-out", quantity: 1, unitPrice: "60.00" },
    { description: "Labour", quantity: 3, unitPrice: "85.00" },
  ],
};

export const view = (overrides: Partial<InvoiceView> = {}): InvoiceView => ({
  id: "INV2-TEST-0001",
  status: "SENT",
  number: "0001",
  currency: "USD",
  total: "315.00",
  due: "315.00",
  invoiceDate: "2026-10-01",
  paymentDueDate: null,
  recipientEmail: "sam@example.com",
  recipientName: "Example Bakery",
  recipientViewUrl: null,
  invoicerViewUrl: null,
  source: "PAYPAL_SANDBOX",
  ...overrides,
});

/** A gateway whose write methods are spies, to prove what a guard did or did not let through. */
export function spyGateway(current: InvoiceView = view()) {
  return {
    source: "PAYPAL_SANDBOX",
    createInvoice: vi.fn(async () => view({ status: "DRAFT" })),
    getInvoice: vi.fn(async () => current),
    listInvoices: vi.fn(async () => [current]),
    sendInvoice: vi.fn(async () => view({ status: "SENT" })),
    sendReminder: vi.fn(async () => current),
    recordPayment: vi.fn(async () => view({ status: "PAID", due: "0.00" })),
  } satisfies PayPalGateway;
}

export const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

/** A finished model step for the AI SDK's mock model. */
export const stopResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage,
  warnings: [],
});
