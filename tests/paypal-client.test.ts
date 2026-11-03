import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrderBody, priceCart } from "@/lib/catalog";
import { approvalLink, clearTokenCache, PayPalApiError, PayPalClient, scrubRaw } from "@/lib/paypal/client";
import { FakePayPal } from "./fake-paypal";

const credentials = { clientId: "test-client-id", clientSecret: "test-client-secret" };
const body = () => buildOrderBody({ MUG: 1 }, "rr1.owner.sig", { returnUrl: "https://example.test/r", cancelUrl: "https://example.test/c" });

let paypal: FakePayPal;
beforeEach(() => {
  clearTokenCache();
  paypal = new FakePayPal().install();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("PayPal REST client", () => {
  it("uses the documented token request, and caches the token", async () => {
    const client = new PayPalClient(credentials);
    await client.createOrder(body(), "request-1");
    await client.createOrder(body(), "request-2");
    const tokenCalls = paypal.callsTo(/oauth2\/token/);
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0].url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(tokenCalls[0].headers.authorization).toBe(`Basic ${Buffer.from("test-client-id:test-client-secret").toString("base64")}`);
  });

  it("calls the documented paths, with Prefer and PayPal-Request-Id where they matter", async () => {
    const client = new PayPalClient(credentials);
    const { data: order } = await client.createOrder(body(), "request-1");
    paypal.approve(order.id);
    const { data: captured } = await client.captureOrder(order.id, "capture-1");
    const captureId = captured.purchase_units![0].payments!.captures![0].id;
    await client.getCapture(captureId);
    const { data: refund } = await client.refundCapture(captureId, { amount: { currency_code: "USD", value: "1.00" }, note_to_payer: "x", custom_id: "y" }, "refund-1");
    await client.getRefund(refund.id);

    const seen = paypal.calls.filter((call) => !call.path.includes("oauth2")).map((call) => `${call.method} ${call.path}`);
    expect(seen).toEqual([
      "POST /v2/checkout/orders",
      `POST /v2/checkout/orders/${order.id}/capture`,
      `GET /v2/payments/captures/${captureId}`,
      `POST /v2/payments/captures/${captureId}/refund`,
      `GET /v2/payments/refunds/${refund.id}`,
    ]);
    const refundCall = paypal.callsTo(/\/refund$/)[0];
    expect(refundCall.headers["paypal-request-id"]).toBe("refund-1");
    expect(refundCall.headers.prefer).toBe("return=representation");
  });

  it("surfaces PayPal's failing status, issue and debug id", async () => {
    const client = new PayPalClient(credentials);
    paypal.failNext = { path: /checkout\/orders$/, status: 422, body: { name: "UNPROCESSABLE_ENTITY", message: "Nope.", details: [{ issue: "SOME_ISSUE", description: "Why." }] } };
    const failure = await client.createOrder(body(), "r").catch((error) => error);
    expect(failure).toBeInstanceOf(PayPalApiError);
    expect(failure).toMatchObject({ paypalStatus: 422, issue: "SOME_ISSUE", debugId: "debug-failure", step: "create_order" });
    expect(failure.message).toContain("Why.");
  });

  it("never puts the token or client secret in an error", async () => {
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-client-secret");
    const client = new PayPalClient(credentials);
    paypal.failNext = { path: /checkout\/orders$/, status: 500, body: { message: "echo test-client-secret and Bearer fake-access-token-value" } };
    const failure = await client.createOrder(body(), "r").catch((error) => error);
    const seen = JSON.stringify({ message: failure.message, ...failure.extra });
    expect(seen).not.toContain("test-client-secret");
    expect(seen).not.toContain("fake-access-token-value");
  });

  it("accepts the payer-action link documented for payment_source orders, and approve", () => {
    expect(approvalLink({ id: "x", status: "y", links: [{ rel: "self", href: "s" }, { rel: "payer-action", href: "p" }] })).toBe("p");
    expect(approvalLink({ id: "x", status: "y", links: [{ rel: "approve", href: "a" }] })).toBe("a");
    expect(approvalLink({ id: "x", status: "y", links: [] })).toBeNull();
  });

  it("removes buyer and merchant identity from raw responses", () => {
    const scrubbed = scrubRaw({ id: "1", payer: { email_address: "a@b.c" }, nested: [{ merchant_id: "M", kept: true }] });
    expect(scrubbed).toEqual({ id: "1", nested: [{ kept: true }] });
  });
});

describe("the order body", () => {
  it("adds up as PayPal requires", () => {
    const { amount, items } = body().purchase_units[0];
    expect(amount.value).toBe("20.12");
    expect(Number(amount.breakdown.item_total.value) + Number(amount.breakdown.tax_total.value) + Number(amount.breakdown.shipping.value)).toBeCloseTo(20.12);
    expect(items[0]).toMatchObject({ sku: "MUG", quantity: "1", unit_amount: { value: "14.00" } });
  });

  it("refuses unknown items, bad quantities, empty carts and totals over the cap", () => {
    expect(() => priceCart({ GOLD: 1 })).toThrow(/no item/);
    expect(() => priceCart({ MUG: 4 })).toThrow(/whole number/);
    expect(() => priceCart({ MUG: 1.5 })).toThrow(/whole number/);
    expect(() => priceCart({ MUG: -1 })).toThrow(/whole number/);
    expect(() => priceCart({})).toThrow(/at least one/);
    expect(() => priceCart({ MUG: 3, TEA: 3, PRINT: 3 })).toThrow(/cannot exceed/);
  });
});
