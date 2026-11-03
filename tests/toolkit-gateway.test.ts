import nock from "nock";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { invoiceIdFromCreate, createToolkitGateway, parseToolkitResult } from "@/lib/paypal/toolkit";
import { PayPalError } from "@/lib/paypal/types";
import { draft } from "./helpers";

/**
 * These run the real @paypal/agent-toolkit code against a stubbed HTTP layer. The response bodies
 * are written from PayPal's published schema, so they prove our request shape and parsing. They do
 * not prove what the sandbox does.
 */
// Toolkit 1.11.0 PayPalClient uses api.sandbox.paypal.com for both the token and API calls, not api-m.
const HOST = "https://api.sandbox.paypal.com";
const ID = "INV2-AAAA-BBBB-CCCC-DDDD";
const creds = { clientId: "stub-client-id", clientSecret: "stub-client-secret" };

const invoiceBody = (status: string) => ({
  id: ID,
  status,
  detail: {
    invoice_number: "0001",
    currency_code: "USD",
    invoice_date: "2026-10-01",
    metadata: { recipient_view_url: "https://www.sandbox.paypal.com/invoice/p/#stub" },
  },
  primary_recipients: [{ billing_info: { email_address: "sam@example.com", business_name: "Example Bakery" } }],
  amount: { currency_code: "USD", value: "315.00" },
  due_amount: { currency_code: "USD", value: "315.00" },
});

const stubToken = () => nock(HOST).post("/v1/oauth2/token").reply(200, { access_token: "stub-token", expires_in: 3600 });

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());
afterAll(() => nock.enableNetConnect());

describe("real toolkit path, against stubbed HTTP", () => {
  it("creates through the toolkit on the sandbox host, then reads the real status back", async () => {
    stubToken();
    let posted: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    nock(HOST)
      .post("/v2/invoicing/invoices", (body) => ((posted = body), true))
      .matchHeader("authorization", "Bearer stub-token")
      .reply(201, { rel: "self", href: `${HOST}/v2/invoicing/invoices/${ID}`, method: "GET" });
    nock(HOST).get(`/v2/invoicing/invoices/${ID}`).reply(200, invoiceBody("DRAFT"));

    const invoice = await createToolkitGateway(creds).createInvoice(draft);

    expect(invoice).toMatchObject({ id: ID, status: "DRAFT", total: "315.00", source: "PAYPAL_SANDBOX", recipientEmail: "sam@example.com" });
    expect(invoice.recipientViewUrl).toContain("sandbox.paypal.com");
    expect(posted.detail).toMatchObject({ currency_code: "USD", invoice_date: "2026-10-01" });
    expect(posted.items[1]).toMatchObject({ name: "Labour", quantity: "3", unit_amount: { currency_code: "USD", value: "85.00" } });
    expect(posted.primary_recipients[0].billing_info.email_address).toBe("sam@example.com");
    expect(nock.isDone()).toBe(true);
  });

  it("sends, reminds and records through the matching toolkit tools", async () => {
    stubToken();
    const bodies: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    const capture = (key: string) => (body: unknown) => ((bodies[key] = body), true);
    nock(HOST).post(`/v2/invoicing/invoices/${ID}/send`, capture("send")).reply(200, { rel: "payer-view", href: "https://www.sandbox.paypal.com/invoice/p/#stub", method: "GET" });
    nock(HOST).post(`/v2/invoicing/invoices/${ID}/remind`, capture("remind")).reply(204);
    nock(HOST).post(`/v2/invoicing/invoices/${ID}/payments`, capture("pay")).reply(200, { payment_id: "stub" });
    nock(HOST).get(`/v2/invoicing/invoices/${ID}`).reply(200, invoiceBody("SENT"));
    nock(HOST).get(`/v2/invoicing/invoices/${ID}`).reply(200, invoiceBody("SENT"));
    nock(HOST).get(`/v2/invoicing/invoices/${ID}`).reply(200, invoiceBody("PAID"));

    const gateway = createToolkitGateway(creds);
    expect((await gateway.sendInvoice(ID)).status).toBe("SENT");
    expect((await gateway.sendReminder(ID, { subject: "Reminder", note: "Please pay." })).status).toBe("SENT");
    const paid = await gateway.recordPayment(ID, { method: "CASH", amount: "315.00", currency: "USD", paymentDate: "2026-11-03" });

    expect(paid.status).toBe("PAID");
    expect(bodies.send).toMatchObject({ send_to_recipient: true });
    expect(bodies.remind).toMatchObject({ subject: "Reminder", note: "Please pay." });
    expect(bodies.pay).toMatchObject({ method: "CASH", payment_date: "2026-11-03", amount: { currency_code: "USD", value: "315.00" } });
  });

  it("gets a fresh token per gateway, since the toolkit caches and does not refresh", async () => {
    const tokens = nock(HOST).post("/v1/oauth2/token").times(2).reply(200, { access_token: "stub-token" });
    nock(HOST).get(`/v2/invoicing/invoices/${ID}`).times(3).reply(200, invoiceBody("SENT"));
    const first = createToolkitGateway(creds);
    await first.getInvoice(ID);
    await first.getInvoice(ID);
    await createToolkitGateway(creds).getInvoice(ID);
    expect(tokens.isDone()).toBe(true);
  });

  it("raises an error on bad credentials and does not leak the secret", async () => {
    nock(HOST).post("/v1/oauth2/token").reply(401, { error: "invalid_client", error_description: "Client Authentication failed" });
    const error = await createToolkitGateway(creds).getInvoice(ID).catch((e) => e);
    expect(error).toBeInstanceOf(PayPalError);
    expect(error.message).toContain("Client Authentication failed");
    expect(error.message).not.toContain("stub-client-secret");
  });

  it("raises PayPal API errors, including a missing invoicing scope", async () => {
    stubToken();
    nock(HOST).post("/v2/invoicing/invoices").reply(403, { name: "NOT_AUTHORIZED", message: "Authorization failed due to insufficient permissions." });
    const error = await createToolkitGateway(creds).createInvoice(draft).catch((e) => e);
    expect(error).toBeInstanceOf(PayPalError);
    expect(error.message).toContain("insufficient permissions");
  });

  it("fails if PayPal accepts a create but gives no id, instead of making one up", async () => {
    stubToken();
    nock(HOST).post("/v2/invoicing/invoices").reply(201, {});
    await expect(createToolkitGateway(creds).createInvoice(draft)).rejects.toThrow("no invoice id");
  });
});

describe("toolkit result parsing", () => {
  it("reads the failure shapes the toolkit reports inside a string", () => {
    expect(() => parseToolkitResult("t", JSON.stringify({ ok: false, status: 404, code: "X", message: "gone" }))).toThrow("gone");
    expect(() => parseToolkitResult("t", JSON.stringify({ error: { message: "nope", type: "paypal_error" } }))).toThrow("nope");
    expect(() => parseToolkitResult("t", "not json")).toThrow(PayPalError);
    expect(parseToolkitResult("t", undefined)).toEqual({});
  });

  it("reads an invoice id from an id, a link, or a links array", () => {
    expect(invoiceIdFromCreate({ id: "INV2-1" })).toBe("INV2-1");
    expect(invoiceIdFromCreate({ href: "https://x/v2/invoicing/invoices/INV2-2" })).toBe("INV2-2");
    expect(invoiceIdFromCreate({ links: [{ href: "https://x/v2/invoicing/invoices/INV2-3" }] })).toBe("INV2-3");
    expect(invoiceIdFromCreate({})).toBeNull();
  });
});
