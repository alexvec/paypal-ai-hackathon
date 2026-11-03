import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LanguageModel } from "ai";
import { buildOrderBody } from "../src/lib/catalog";
import { extractClaim } from "../src/lib/claim";
import { missingModelVariables, missingPayPalVariables, PAYPAL_SANDBOX_BASE_URL, PRODUCTION_ORIGIN, redactSecrets, type Env } from "../src/lib/config";
import { approvalLink, PayPalApiError, PayPalClient, scrubRaw, type PayPalOrder } from "../src/lib/paypal/client";
import { orderCustomId, ownerHash } from "../src/lib/provenance";

export type ProofDeps = {
  env: Env;
  print: (line: string) => void;
  getModel: () => LanguageModel;
  /** Where the redacted log goes. Null writes none. */
  logDir: string | null;
  sleep: (ms: number) => Promise<void>;
  pollEveryMs: number;
  approvalTimeoutMs: number;
};

const PROOF_MESSAGE = "Fictional proof message, not a real customer. The tea tin arrived dented and I would like a refund for it.";
const PROOF_REFUND = "1.00";

/**
 * docs/prds/01-refund-referee.md, "First-day slice". Real calls only, stopping at the first failure.
 * Returns the process exit code: 0 proven, 1 a real call failed, 2 not connected and nothing called.
 */
export async function runProof(deps: ProofDeps): Promise<number> {
  const { env, print } = deps;
  print(`Refund Referee proof. PayPal host: ${PAYPAL_SANDBOX_BASE_URL} (fixed in code).`);

  const missing = [...missingPayPalVariables(env), ...missingModelVariables(env)];
  if (missing.length) {
    for (const name of missing) print(`not connected: ${name} missing`);
    print("Stopped before any call. No model call, no PayPal call, no result. Put the variables in .env. See .env.example.");
    return 2;
  }

  const log: Array<Record<string, unknown>> = [];
  let current = "(a) model";
  const finish = (code: number) => {
    if (deps.logDir) {
      mkdirSync(deps.logDir, { recursive: true });
      const path = resolve(deps.logDir, `proof-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      writeFileSync(path, `${redactSecrets(JSON.stringify({ exitCode: code, host: PAYPAL_SANDBOX_BASE_URL, steps: log }, null, 2), env)}\n`);
      print(`Redacted log: ${path}`);
    }
    return code;
  };

  try {
    print(`${current}: one structured-output call, checked against the schema.`);
    const extraction = await extractClaim(PROOF_MESSAGE, [{ id: "TEA", name: "Loose-leaf tea tin", quantity: 1 }], deps.getModel());
    log.push({ step: "model", status: extraction.status, modelCalls: extraction.modelCalls });
    if (extraction.status !== "VALID") {
      print(`FAILED ${current}: ${extraction.reason}`);
      return finish(1);
    }
    print(`  ok: output passed the schema in ${extraction.modelCalls} call(s). reason_category=${extraction.claim.reason_category}`);

    const credentials = { clientId: env.PAYPAL_CLIENT_ID!.trim(), clientSecret: env.PAYPAL_CLIENT_SECRET!.trim() };
    const client = new PayPalClient(credentials);
    current = "(b) token";
    print(`${current}: POST /v1/oauth2/token`);
    await client.checkToken();
    log.push({ step: "token", ok: true });
    print("  ok: token received. It is not printed or logged.");

    current = "(c) create order";
    print(`${current}: POST /v2/checkout/orders`);
    const customId = orderCustomId(credentials, ownerHash(credentials, randomUUID()));
    const urls = { returnUrl: `${PRODUCTION_ORIGIN}/proof-approved`, cancelUrl: `${PRODUCTION_ORIGIN}/proof-approved` };
    const created = await client.createOrder(buildOrderBody({ TEA: 1 }, customId, urls), randomUUID());
    const orderId = created.data.id;
    const link = approvalLink(created.data);
    log.push({ step: "create_order", orderId, status: created.data.status, debugId: created.debugId });
    if (!link) {
      print(`FAILED ${current}: no approval link. HTTP ${created.status}, debug id ${created.debugId}`);
      return finish(1);
    }
    print(`  ok: order ${orderId}, status ${created.data.status}, debug id ${created.debugId}`);
    print(`  Approve it as the sandbox buyer: ${link}`);

    current = "(d) poll for approval";
    print(`${current}: GET /v2/checkout/orders/${orderId}, for up to ${Math.round(deps.approvalTimeoutMs / 60_000)} minutes.`);
    const deadline = Date.now() + deps.approvalTimeoutMs;
    let order: PayPalOrder = created.data;
    while (order.status !== "APPROVED") {
      if (Date.now() >= deadline) {
        print(`FAILED ${current}: timed out. Last order status ${order.status}.`);
        log.push({ step: "poll", orderId, lastStatus: order.status, timedOut: true });
        return finish(1);
      }
      await deps.sleep(deps.pollEveryMs);
      order = (await client.getOrder(orderId)).data;
    }
    log.push({ step: "poll", orderId, status: order.status });
    print("  ok: APPROVED");

    current = "(e) capture";
    print(`${current}: POST /v2/checkout/orders/${orderId}/capture`);
    const captured = await client.captureOrder(orderId, `capture-${orderId}`);
    const capture = captured.data.purchase_units?.[0]?.payments?.captures?.[0];
    log.push({ step: "capture", orderId, debugId: captured.debugId, raw: scrubRaw(captured.data) });
    if (!capture || capture.status !== "COMPLETED") {
      print(`FAILED ${current}: capture status ${capture?.status ?? "missing"}. HTTP ${captured.status}, debug id ${captured.debugId}`);
      return finish(1);
    }
    print(`  ok: capture ${capture.id}, status ${capture.status}, debug id ${captured.debugId}`);

    current = "(f) refund 1.00";
    const requestId = `proof-${randomUUID()}`;
    print(`${current}: POST /v2/payments/captures/${capture.id}/refund, PayPal-Request-Id ${requestId}`);
    const refund = await client.refundCapture(
      capture.id,
      { amount: { currency_code: "USD", value: PROOF_REFUND }, note_to_payer: "Proof run for a sandbox test purchase.", custom_id: "rr1|proof|TEA:0|noship" },
      requestId,
    );
    log.push({ step: "refund", requestId, debugId: refund.debugId, raw: scrubRaw(refund.data) });
    print(`  ok: refund ${refund.data.id}, status ${refund.data.status}, debug id ${refund.debugId}`);

    current = "(g) read refund";
    print(`${current}: GET /v2/payments/refunds/${refund.data.id}`);
    const readBack = await client.getRefund(refund.data.id);
    log.push({ step: "get_refund", debugId: readBack.debugId, raw: scrubRaw(readBack.data) });
    if (readBack.data.amount?.value !== PROOF_REFUND) {
      print(`FAILED ${current}: expected ${PROOF_REFUND}, PayPal read back ${readBack.data.amount?.value}. Debug id ${readBack.debugId}`);
      return finish(1);
    }
    print(`  ok: ${readBack.data.amount.value} ${readBack.data.amount.currency_code}, status ${readBack.data.status}, debug id ${readBack.debugId}`);
    print(`PROVEN. Order ${orderId}, capture ${capture.id}, refund ${refund.data.id}.`);
    return finish(0);
  } catch (error) {
    if (error instanceof PayPalApiError) {
      print(`FAILED ${current}: HTTP ${error.paypalStatus ?? "none"}, debug id ${error.debugId ?? "none"}, ${error.paypalName ?? ""} ${error.issue ?? ""} ${error.message}`.replace(/\s+/g, " "));
      log.push({ step: current, failed: true, paypalStatus: error.paypalStatus, debugId: error.debugId, name: error.paypalName, issue: error.issue });
    } else {
      const text = redactSecrets(error instanceof Error ? error.message : String(error), env);
      print(`FAILED ${current}: ${text}`);
      log.push({ step: current, failed: true, message: text });
    }
    return finish(1);
  }
}
