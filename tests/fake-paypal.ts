import { vi } from "vitest";

/**
 * A stub of PayPal's HTTP API for unit tests only, shaped from PayPal's published Orders v2 and
 * Payments v2 schemas. It proves our logic, not PayPal's behaviour. Nothing in src/ imports it.
 */
const HOST = "https://api-m.sandbox.paypal.com";

type Order = {
  id: string;
  status: string;
  purchase_units: Array<Record<string, any>>;
  links: Array<{ rel: string; href: string }>;
};

export type FakeCall = { method: string; url: string; path: string; headers: Record<string, string>; body: any };

export class FakePayPal {
  orders = new Map<string, Order>();
  captures = new Map<string, any>();
  refunds = new Map<string, any>();
  requestIds = new Map<string, any>();
  calls: FakeCall[] = [];
  private counter = 0;
  /** Set to make the next matching path fail, like a real PayPal error. */
  failNext: { path: RegExp; status: number; body: unknown } | null = null;
  captureCreateTime = "2026-11-03T10:00:00Z";

  private id(prefix: string) {
    this.counter += 1;
    return `${prefix}${String(this.counter).padStart(14, "0")}`;
  }

  install() {
    vi.stubGlobal("fetch", vi.fn((input: string | URL, init?: RequestInit) => this.handle(String(input), init)));
    return this;
  }

  approve(orderId: string) {
    this.orders.get(orderId)!.status = "APPROVED";
  }

  callsTo(pattern: RegExp, method?: string) {
    return this.calls.filter((call) => pattern.test(call.path) && (!method || call.method === method));
  }

  /** An order from another app or merchant flow, with no signature from this app. */
  seedForeignOrder(customId?: string) {
    const id = this.id("FOREIGN");
    this.orders.set(id, { id, status: "APPROVED", links: [], purchase_units: [{ custom_id: customId, amount: { currency_code: "USD", value: "10.00" }, items: [] }] });
    return id;
  }

  private json(status: number, body: unknown, debugId = `debug-${this.counter}`) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "paypal-debug-id": debugId } });
  }

  private async handle(url: string, init?: RequestInit): Promise<Response> {
    if (!url.startsWith(`${HOST}/`)) throw new Error(`The test blocked a request to a host other than the sandbox: ${url}`);
    const path = url.slice(HOST.length);
    const method = init?.method ?? "GET";
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    let body: any = init?.body;
    if (typeof body === "string" && headers["content-type"]?.includes("json")) body = JSON.parse(body);
    this.calls.push({ method, url, path, headers, body });

    if (this.failNext?.path.test(path)) {
      const failure = this.failNext;
      this.failNext = null;
      return this.json(failure.status, failure.body, "debug-failure");
    }

    if (path === "/v1/oauth2/token") {
      if (!headers.authorization?.startsWith("Basic ") || body !== "grant_type=client_credentials") return this.json(401, { error: "invalid_client" });
      return this.json(200, { access_token: "fake-access-token-value", token_type: "Bearer", expires_in: 32400 });
    }
    if (headers.authorization !== "Bearer fake-access-token-value") return this.json(401, { name: "AUTHENTICATION_FAILURE" });

    if (path === "/v2/checkout/orders" && method === "POST") return this.createOrder(body);
    let match = path.match(/^\/v2\/checkout\/orders\/([^/]+)$/);
    if (match && method === "GET") {
      const order = this.orders.get(match[1]);
      return order ? this.json(200, this.withPayer(order)) : this.json(404, { name: "RESOURCE_NOT_FOUND", details: [{ issue: "INVALID_RESOURCE_ID" }] });
    }
    match = path.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (match && method === "POST") return this.capture(match[1]);
    match = path.match(/^\/v2\/payments\/captures\/([^/]+)$/);
    if (match && method === "GET") return this.captures.has(match[1]) ? this.json(200, this.captures.get(match[1])) : this.json(404, { name: "RESOURCE_NOT_FOUND" });
    match = path.match(/^\/v2\/payments\/captures\/([^/]+)\/refund$/);
    if (match && method === "POST") return this.refund(match[1], body, headers);
    match = path.match(/^\/v2\/payments\/refunds\/([^/]+)$/);
    if (match && method === "GET") return this.refunds.has(match[1]) ? this.json(200, this.refunds.get(match[1])) : this.json(404, { name: "RESOURCE_NOT_FOUND" });
    return this.json(404, { name: "NOT_FOUND" });
  }

  private withPayer(order: Order) {
    return { ...order, payer: { email_address: "buyer@example.com", payer_id: "FICTIONALPAYER" } };
  }

  private createOrder(body: any) {
    const unit = body.purchase_units[0];
    const breakdown = unit.amount.breakdown;
    const sum = Number(breakdown.item_total.value) + Number(breakdown.tax_total.value) + Number(breakdown.shipping.value);
    if (sum.toFixed(2) !== unit.amount.value) return this.json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "AMOUNT_MISMATCH" }] });
    const id = this.id("ORDER");
    const order: Order = {
      id,
      status: "PAYER_ACTION_REQUIRED",
      purchase_units: [JSON.parse(JSON.stringify(unit))],
      links: [
        { rel: "self", href: `${HOST}/v2/checkout/orders/${id}` },
        { rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` },
      ],
    };
    this.orders.set(id, order);
    return this.json(200, order);
  }

  private capture(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) return this.json(404, { name: "RESOURCE_NOT_FOUND" });
    if (order.status !== "APPROVED") return this.json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] });
    const unit = order.purchase_units[0];
    const capture = { id: this.id("CAP"), status: "COMPLETED", amount: { currency_code: unit.amount.currency_code, value: unit.amount.value }, custom_id: unit.custom_id, create_time: this.captureCreateTime, final_capture: true };
    this.captures.set(capture.id, capture);
    unit.payments = { captures: [capture] };
    order.status = "COMPLETED";
    return this.json(201, this.withPayer(order));
  }

  private refund(captureId: string, body: any, headers: Record<string, string>) {
    const capture = this.captures.get(captureId);
    if (!capture) return this.json(404, { name: "RESOURCE_NOT_FOUND" });
    const requestId = headers["paypal-request-id"];
    if (requestId && this.requestIds.has(requestId)) return this.json(200, this.requestIds.get(requestId));
    const order = [...this.orders.values()].find((candidate) => candidate.purchase_units[0].payments?.captures?.[0]?.id === captureId)!;
    const unit = order.purchase_units[0];
    const already = (unit.payments.refunds ?? []).reduce((sum: number, refund: any) => sum + Math.round(Number(refund.amount.value) * 100), 0);
    const asked = Math.round(Number(body.amount.value) * 100);
    const captured = Math.round(Number(capture.amount.value) * 100);
    if (already + asked > captured) {
      return this.json(422, { name: "UNPROCESSABLE_ENTITY", message: "The requested action could not be performed.", details: [{ issue: "REFUND_AMOUNT_EXCEEDED", description: "The refund amount must be less than or equal to the capture amount that has not yet been refunded." }] });
    }
    const refund = {
      id: this.id("REF"),
      status: "COMPLETED",
      amount: body.amount,
      custom_id: body.custom_id,
      note_to_payer: body.note_to_payer,
      create_time: "2026-11-03T11:00:00Z",
      seller_payable_breakdown: { total_refunded_amount: { currency_code: "USD", value: ((already + asked) / 100).toFixed(2) } },
      payer: { email_address: "merchant@example.com", merchant_id: "FICTIONALMERCHANT" },
    };
    this.refunds.set(refund.id, refund);
    if (requestId) this.requestIds.set(requestId, refund);
    unit.payments.refunds = [...(unit.payments.refunds ?? []), refund];
    capture.status = already + asked === captured ? "REFUNDED" : "PARTIALLY_REFUNDED";
    return this.json(201, refund);
  }
}
