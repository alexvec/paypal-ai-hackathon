import { PAYPAL_SANDBOX_BASE_URL, redactSecrets, type PayPalCredentials } from "../config";
import { HttpError } from "../errors";

export type PayPalResult<T> = { status: number; debugId: string | null; data: T };

/** A failed PayPal call. Carries only PayPal's public error fields, never the request's credentials. */
export class PayPalApiError extends HttpError {
  constructor(
    readonly step: string,
    readonly paypalStatus: number | null,
    readonly debugId: string | null,
    readonly paypalName: string | null,
    readonly issue: string | null,
    message: string,
  ) {
    super(502, "PAYPAL_ERROR", redactSecrets(message), { step, paypalStatus, debugId, paypalName, issue });
    this.name = "PayPalApiError";
  }
}

type Money = { currency_code: string; value: string };
export type PayPalLink = { href: string; rel: string; method?: string };
export type PayPalRefund = {
  id: string;
  status: string;
  amount?: Money;
  custom_id?: string;
  note_to_payer?: string;
  create_time?: string;
  seller_payable_breakdown?: { total_refunded_amount?: Money };
  links?: PayPalLink[];
};
export type PayPalCapture = {
  id: string;
  status: string;
  amount?: Money;
  custom_id?: string;
  create_time?: string;
  links?: PayPalLink[];
};
export type PayPalOrder = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    amount?: Money & { breakdown?: { item_total?: Money; tax_total?: Money; shipping?: Money } };
    items?: Array<{ name: string; sku?: string; quantity: string; unit_amount: Money }>;
    payments?: { captures?: PayPalCapture[]; refunds?: PayPalRefund[] };
  }>;
};

let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

export function clearTokenCache() {
  cachedToken = null;
}

type CallOptions = { body?: unknown; requestId?: string; prefer?: boolean };

/**
 * Thin REST client for the Orders v2 and Payments v2 paths in docs/prds/01-refund-referee.md. The
 * base URL is a constant. The token stays in this module and is never returned or logged.
 */
export class PayPalClient {
  constructor(private readonly credentials: PayPalCredentials) {}

  private async token(): Promise<string> {
    if (cachedToken && cachedToken.key === this.credentials.clientId && cachedToken.expiresAt > Date.now()) return cachedToken.token;
    const basic = Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString("base64");
    const response = await this.send("oauth_token", `${PAYPAL_SANDBOX_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const data = (await this.parse("oauth_token", response)) as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new PayPalApiError("oauth_token", response.status, debugIdOf(response), null, null, "PayPal returned no access token.");
    cachedToken = { key: this.credentials.clientId, token: data.access_token, expiresAt: Date.now() + Math.max(0, (data.expires_in ?? 0) - 60) * 1000 };
    return data.access_token;
  }

  /** Proves the credentials work. Returns nothing a caller could leak. */
  async checkToken(): Promise<void> {
    await this.token();
  }

  private async send(step: string, url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(20_000), cache: "no-store" });
    } catch (error) {
      throw new PayPalApiError(step, null, null, null, null, `Could not reach the PayPal sandbox: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async parse(step: string, response: Response): Promise<unknown> {
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (response.ok) return data;
    const failure = (data ?? {}) as { name?: string; message?: string; error?: string; error_description?: string; debug_id?: string; details?: Array<{ issue?: string; description?: string }> };
    if (response.status === 401) clearTokenCache();
    const issue = failure.details?.[0]?.issue ?? null;
    const message = [failure.message ?? failure.error_description ?? `PayPal returned HTTP ${response.status}.`, failure.details?.[0]?.description].filter(Boolean).join(" ");
    throw new PayPalApiError(step, response.status, debugIdOf(response) ?? failure.debug_id ?? null, failure.name ?? failure.error ?? null, issue, message);
  }

  private async call<T>(step: string, method: "GET" | "POST", path: string, options: CallOptions = {}): Promise<PayPalResult<T>> {
    const token = await this.token();
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.requestId) headers["PayPal-Request-Id"] = options.requestId;
    // The documented default is return=minimal: id, status and links only.
    if (options.prefer) headers.Prefer = "return=representation";
    const response = await this.send(step, `${PAYPAL_SANDBOX_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = (await this.parse(step, response)) as T;
    return { status: response.status, debugId: debugIdOf(response), data };
  }

  createOrder(body: unknown, requestId: string) {
    return this.call<PayPalOrder>("create_order", "POST", "/v2/checkout/orders", { body, requestId, prefer: true });
  }

  getOrder(orderId: string) {
    return this.call<PayPalOrder>("get_order", "GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  captureOrder(orderId: string, requestId: string) {
    return this.call<PayPalOrder>("capture_order", "POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { body: {}, requestId, prefer: true });
  }

  getCapture(captureId: string) {
    return this.call<PayPalCapture>("get_capture", "GET", `/v2/payments/captures/${encodeURIComponent(captureId)}`);
  }

  refundCapture(captureId: string, body: { amount: Money; note_to_payer: string; custom_id: string }, requestId: string) {
    return this.call<PayPalRefund>("refund_capture", "POST", `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { body, requestId, prefer: true });
  }

  getRefund(refundId: string) {
    return this.call<PayPalRefund>("get_refund", "GET", `/v2/payments/refunds/${encodeURIComponent(refundId)}`);
  }
}

function debugIdOf(response: Response): string | null {
  return response.headers.get("paypal-debug-id");
}

/**
 * Per the Orders v2 samples, an order created with payment_source.paypal carries a "payer-action"
 * link. A plain order carries "approve". Accept either.
 */
export function approvalLink(order: PayPalOrder): string | null {
  const links = order.links ?? [];
  return (links.find((link) => link.rel === "payer-action") ?? links.find((link) => link.rel === "approve"))?.href ?? null;
}

const PRIVATE_KEYS = new Set(["payer", "payee", "payment_source", "shipping", "email_address", "merchant_id", "payer_id", "account_id", "address", "phone", "access_token", "buyer_context"]);

/** Removes buyer and merchant identity from a raw PayPal response before it is shown or logged. */
export function scrubRaw<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => scrubRaw(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !PRIVATE_KEYS.has(key)).map(([key, item]) => [key, scrubRaw(item)])) as T;
  }
  return value;
}
