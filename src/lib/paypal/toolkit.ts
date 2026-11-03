import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";
import type { InvoiceDraft, InvoiceView } from "../schemas";
import { PayPalError, type PayPalGateway, type RecordPaymentInput } from "./types";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type ToolkitTool = {
  parameters: { parse(input: unknown): unknown };
  execute(input: unknown, options: unknown): Promise<unknown>;
};

// Only what the flow needs is switched on. Anything else is absent from the toolkit instance.
const ENABLED_ACTIONS = {
  invoices: { create: true, get: true, list: true, send: true, sendReminder: true, recordPayment: true },
};

/** The toolkit returns a JSON string and reports failure inside it instead of throwing. */
export function parseToolkitResult(tool: string, output: unknown): Json {
  if (output === undefined || output === null || output === "") return {};
  let data: unknown = output;
  if (typeof output === "string") {
    try {
      data = JSON.parse(output);
    } catch {
      throw new PayPalError(`PayPal toolkit returned unreadable output from ${tool}.`, tool);
    }
  }
  if (data === null || data === undefined || data === "") return {};
  if (typeof data !== "object") throw new PayPalError(`PayPal toolkit returned unexpected output from ${tool}.`, tool);
  const body = data as Json;
  if (body.ok === false) throw new PayPalError(String(body.message ?? "PayPal request failed."), tool, body.status ?? null, body.code ?? null);
  if (body.error) throw new PayPalError(String(body.error.message ?? "PayPal request failed."), tool);
  return body;
}

/** Without a Prefer header PayPal documents no invoice body on create, so the id may be only in a link. */
export function invoiceIdFromCreate(data: Json): string | null {
  const candidates = [data.id, data.href, ...(Array.isArray(data.links) ? data.links.map((l: Json) => l.href) : [])];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const id = candidate.split("?")[0].split("/").filter(Boolean).pop();
    if (id && /^[A-Za-z0-9_-]{1,127}$/.test(id)) return id;
  }
  return null;
}

export function toInvoiceView(data: Json): InvoiceView {
  const recipient = data.primary_recipients?.[0]?.billing_info ?? {};
  const detail = data.detail ?? {};
  return {
    id: String(data.id),
    status: data.status ?? null,
    number: detail.invoice_number ?? null,
    currency: detail.currency_code ?? data.amount?.currency_code ?? null,
    total: data.amount?.value ?? null,
    due: data.due_amount?.value ?? null,
    invoiceDate: detail.invoice_date ?? null,
    paymentDueDate: detail.payment_term?.due_date ?? null,
    recipientEmail: recipient.email_address ?? null,
    recipientName: recipient.business_name ?? null,
    recipientViewUrl: detail.metadata?.recipient_view_url ?? null,
    invoicerViewUrl: detail.metadata?.invoicer_view_url ?? null,
    source: "PAYPAL_SANDBOX",
  };
}

export function toCreateInvoiceArgs(draft: InvoiceDraft): Json {
  const billing: Json = {};
  if (draft.clientEmail) billing.email_address = draft.clientEmail;
  if (draft.clientName) billing.business_name = draft.clientName;
  return {
    currency_code: draft.currency,
    invoice_date: draft.invoiceDate,
    ...(draft.note ? { note: draft.note } : {}),
    ...(Object.keys(billing).length ? { primary_recipients: [{ billing_info: billing }] } : {}),
    items: draft.lines.map((line) => ({
      name: line.description,
      quantity: String(line.quantity),
      unit_amount: { currency_code: draft.currency, value: line.unitPrice },
    })),
  };
}

/**
 * Every PayPal call in the app goes through a toolkit tool here.
 *
 * Build a new gateway per request. Toolkit 1.11.0 caches its access token on the client and has
 * no refresh, so a long-lived instance would keep using an expired token.
 * The sandbox flag is fixed: this app has no path to live PayPal.
 */
export function createToolkitGateway(creds: { clientId: string; clientSecret: string }): PayPalGateway {
  const toolkit = new PayPalAgentToolkit({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    configuration: { actions: ENABLED_ACTIONS, context: { sandbox: true } },
  });
  const tools = toolkit.getTools() as unknown as Record<string, ToolkitTool>;

  async function call(name: string, args: Json): Promise<Json> {
    const tool = tools[name];
    if (!tool) throw new PayPalError(`Toolkit tool ${name} is not available.`, name);
    const output = await tool.execute(tool.parameters.parse(args), { toolCallId: name, messages: [] });
    return parseToolkitResult(name, output);
  }

  const getInvoice = async (id: string) => toInvoiceView(await call("get_invoice", { invoice_id: id }));

  return {
    source: "PAYPAL_SANDBOX",
    getInvoice,

    async createInvoice(draft) {
      const created = await call("create_invoice", toCreateInvoiceArgs(draft));
      const id = invoiceIdFromCreate(created);
      if (!id) throw new PayPalError("PayPal accepted create_invoice but returned no invoice id.", "create_invoice");
      // Read the status back from PayPal instead of assuming it.
      return getInvoice(id);
    },

    async listInvoices() {
      const data = await call("list_invoices", { page: 1, page_size: 20 });
      return (Array.isArray(data.items) ? data.items : []).map(toInvoiceView);
    },

    async sendInvoice(id, note) {
      await call("send_invoice", { invoice_id: id, send_to_recipient: true, ...(note ? { note } : {}) });
      return getInvoice(id);
    },

    async sendReminder(id, reminder) {
      await call("send_invoice_reminder", { invoice_id: id, subject: reminder.subject, note: reminder.note });
      return getInvoice(id);
    },

    async recordPayment(id, payment: RecordPaymentInput) {
      await call("record_payment_for_invoice", {
        invoice_id: id,
        method: payment.method,
        payment_date: payment.paymentDate,
        amount: { currency_code: payment.currency, value: payment.amount },
        ...(payment.note ? { note: payment.note } : {}),
      });
      return getInvoice(id);
    },
  };
}

