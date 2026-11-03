import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokenCache } from "@/lib/paypal/client";
import { runProof, type ProofDeps } from "../scripts/proof-run";
import { FakePayPal } from "./fake-paypal";
import { claim, scriptedModel } from "./helpers";

const ENV = { PAYPAL_CLIENT_ID: "test-client-id", PAYPAL_CLIENT_SECRET: "test-client-secret", AI_GATEWAY_API_KEY: "test-gateway-key" };

function setup(overrides: Partial<ProofDeps> = {}) {
  const lines: string[] = [];
  const model = scriptedModel(JSON.stringify(claim({ claimed_items: [{ line_id: "TEA", quantity: 1, customer_words: "tea" }] })));
  const options: ProofDeps = { env: ENV, print: (line) => lines.push(line), getModel: () => model, logDir: null, sleep: async () => undefined, pollEveryMs: 1, approvalTimeoutMs: 60_000, ...overrides };
  return { lines, model, options };
}

let paypal: FakePayPal;
beforeEach(() => {
  clearTokenCache();
  paypal = new FakePayPal().install();
});
afterEach(() => vi.unstubAllGlobals());

describe("npm run proof", () => {
  it("before keys exist: names the variables, exits non-zero, and calls nothing", async () => {
    const { lines, options, model } = setup({ env: { AI_GATEWAY_API_KEY: "k" } });
    expect(await runProof(options)).toBe(2);
    expect(lines).toContain("not connected: PAYPAL_CLIENT_ID missing");
    expect(lines).toContain("not connected: PAYPAL_CLIENT_SECRET missing");
    expect(paypal.calls).toHaveLength(0);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("names a missing model credential too", async () => {
    const { lines, options } = setup({ env: { PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b" } });
    expect(await runProof(options)).toBe(2);
    expect(lines).toContain("not connected: AI_GATEWAY_API_KEY missing");
  });

  it("runs steps a to g in order against the stub, and prints the ids", async () => {
    const run = setup();
    let polls = 0;
    run.options.sleep = async () => {
      polls += 1;
      if (polls === 2) paypal.approve([...paypal.orders.keys()][0]);
    };
    expect(await runProof(run.options)).toBe(0);
    const order = [...paypal.orders.keys()][0];
    const refund = [...paypal.refunds.keys()][0];
    expect(run.model.doGenerateCalls).toHaveLength(1);
    expect(paypal.calls.map((call) => `${call.method} ${call.path.replace(order, "{order}").replace(/CAP\d+/, "{capture}").replace(refund, "{refund}")}`)).toEqual([
      "POST /v1/oauth2/token",
      "POST /v2/checkout/orders",
      "GET /v2/checkout/orders/{order}",
      "GET /v2/checkout/orders/{order}",
      "POST /v2/checkout/orders/{order}/capture",
      "POST /v2/payments/captures/{capture}/refund",
      "GET /v2/payments/refunds/{refund}",
    ]);
    const refundCall = paypal.callsTo(/\/refund$/)[0];
    expect(refundCall.body.amount.value).toBe("1.00");
    expect(refundCall.headers["paypal-request-id"]).toMatch(/^proof-/);
    const output = run.lines.join("\n");
    expect(output).toContain(`PROVEN. Order ${order}`);
    expect(output).toContain("sandbox.paypal.com/checkoutnow");
    expect(output).not.toMatch(/fake-access-token-value|test-client-secret/);
  });

  it("fails with the status and debug id, and never carries on", async () => {
    const run = setup();
    paypal.failNext = { path: /checkout\/orders$/, status: 403, body: { name: "NOT_AUTHORIZED", message: "No." } };
    expect(await runProof(run.options)).toBe(1);
    const output = run.lines.join("\n");
    expect(output).toContain("FAILED (c) create order: HTTP 403, debug id debug-failure");
    expect(output).not.toContain("PROVEN");
    expect(paypal.callsTo(/\/refund$/)).toHaveLength(0);
  });

  it("times out when the buyer never approves", async () => {
    const run = setup({ approvalTimeoutMs: 0 });
    expect(await runProof(run.options)).toBe(1);
    expect(run.lines.join("\n")).toContain("timed out");
    expect(paypal.callsTo(/capture$/)).toHaveLength(0);
  });

  it("stops when the model output cannot be validated", async () => {
    const run = setup({ getModel: () => scriptedModel("nonsense", "nonsense") });
    expect(await runProof(run.options)).toBe(1);
    expect(paypal.calls).toHaveLength(0);
  });
});
