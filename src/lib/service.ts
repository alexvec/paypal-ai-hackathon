import { randomUUID } from "node:crypto";
import { z } from "zod";
import { buildOrderBody, CATALOG, CURRENCY } from "./catalog";
import { extractClaim, MAX_MESSAGE_CHARS, type ClaimResult } from "./claim";
import { paypalCredentials, type PayPalCredentials } from "./config";
import { decide, type Decision } from "./decide";
import { HttpError } from "./errors";
import { getModel } from "./llm";
import { fromCents } from "./money";
import { approvalLink, PayPalClient, scrubRaw, type PayPalCapture, type PayPalOrder } from "./paypal/client";
import { APPROVAL_TTL_MS, MAX_REFUND_PER_CASE_CENTS, MAX_REFUND_PER_DAY_CENTS } from "./policy";
import { issueApproval, newOwnerSecret, orderCustomId, ownerHash, readApproval, readOrderCustomId, refundMarker, type Approval } from "./provenance";
import { addDailyRefund, dailyRefundedCents } from "./ratelimit";
import { buildRecord, type CaseRecord } from "./record";

export const messageSchema = z.string().trim().min(1, "Write the customer's message first.").max(MAX_MESSAGE_CHARS, `Keep the message under ${MAX_MESSAGE_CHARS} characters.`);
export const orderIdSchema = z.string().regex(/^[A-Z0-9]{10,40}$/, "That is not a PayPal order id.");
export const quantitiesSchema = z.record(z.string(), z.number());

type Session = { credentials: PayPalCredentials; client: PayPalClient };

function connect(): Session {
  const credentials = paypalCredentials();
  return { credentials, client: new PayPalClient(credentials) };
}

const FOREIGN_ORDER = () => new HttpError(403, "NOT_YOUR_ORDER", "Only orders this browser created with this app can be read, captured or refunded here.");

/** Provenance comes from PayPal's stored custom_id. An id alone is never trusted. */
function assertOwned(credentials: PayPalCredentials, order: PayPalOrder, ownerSecret: string | null) {
  const owner = readOrderCustomId(credentials, order.purchase_units?.[0]?.custom_id);
  if (!owner || !ownerSecret || owner !== ownerHash(credentials, ownerSecret)) throw FOREIGN_ORDER();
  return owner;
}

/** PayPal hides order details from other apps, so a foreign id usually fails here as a 404. */
async function readOwnedOrder({ credentials, client }: Session, orderId: string, ownerSecret: string | null) {
  if (!ownerSecret) throw FOREIGN_ORDER();
  const result = await client.getOrder(orderId).catch((error) => {
    if (error instanceof HttpError && error.extra.paypalStatus === 404) throw FOREIGN_ORDER();
    throw error;
  });
  const owner = assertOwned(credentials, result.data, ownerSecret);
  return { order: result.data, debugId: result.debugId, owner };
}

async function readRecord(session: Session, order: PayPalOrder): Promise<CaseRecord> {
  const listed = order.purchase_units?.[0]?.payments?.captures?.[0];
  let capture: PayPalCapture | null = null;
  if (listed) capture = (await session.client.getCapture(listed.id)).data;
  return buildRecord(order, capture);
}

export async function createTestOrder(quantities: Record<string, number>, ownerSecret: string | null, origin: string) {
  const session = connect();
  const secret = ownerSecret ?? newOwnerSecret();
  const customId = orderCustomId(session.credentials, ownerHash(session.credentials, secret));
  const body = buildOrderBody(quantities, customId, { returnUrl: `${origin}/api/paypal/return`, cancelUrl: `${origin}/?cancelled=1` });
  const result = await session.client.createOrder(body, randomUUID());
  const approvalUrl = approvalLink(result.data);
  if (!approvalUrl) throw new HttpError(502, "NO_APPROVAL_LINK", "PayPal created the order but returned no approval link.", { orderId: result.data.id, debugId: result.debugId });
  return { ownerSecret: secret, orderId: result.data.id, status: result.data.status, approvalUrl, debugId: result.debugId };
}

export async function readOrder(orderId: string, ownerSecret: string | null) {
  const session = connect();
  const { order, debugId } = await readOwnedOrder(session, orderId, ownerSecret);
  return { record: await readRecord(session, order), debugId };
}

/** Captures an order this browser created, once the buyer approved it in PayPal. Idempotent by order id. */
export async function captureOwnedOrder(orderId: string, ownerSecret: string | null) {
  const session = connect();
  const { order } = await readOwnedOrder(session, orderId, ownerSecret);
  if (order.status === "COMPLETED") return { record: await readRecord(session, order), debugId: null, raw: null };
  if (order.status !== "APPROVED") throw new HttpError(409, "NOT_APPROVED", `PayPal reports this order as ${order.status}. The sandbox buyer has to approve it first.`, { orderStatus: order.status });
  const captured = await session.client.captureOrder(orderId, `capture-${orderId}`);
  const reread = await session.client.getOrder(orderId);
  return { record: await readRecord(session, reread.data), debugId: captured.debugId, raw: scrubRaw(captured.data) };
}

export type CaseResult = {
  record: CaseRecord;
  extraction: ClaimResult;
  decision: Decision;
  approvalToken: string | null;
  approvalExpiresAt: number | null;
};

/** Everything before the model call is checked first, so a refused request spends nothing. */
export async function openCase(orderId: string, message: string, ownerSecret: string | null, beforeModelCall: () => void, now = Date.now()): Promise<CaseResult> {
  const session = connect();
  const model = getModel();
  const { order, owner } = await readOwnedOrder(session, orderId, ownerSecret);
  const record = await readRecord(session, order);
  if (!record.capture) throw new HttpError(409, "NOT_CAPTURED", "This order has no captured payment yet. Approve it as the sandbox buyer first.");

  beforeModelCall();
  const lines = record.lines.map(({ id, name, quantity }) => ({ id, name, quantity }));
  const extraction = await extractClaim(message, lines, model, `Currency ${record.currency}. The payment record will be checked separately.`);
  const decision = decide(record, extraction.status === "VALID" ? extraction.claim : null, now);

  let approvalToken: string | null = null;
  let approvalExpiresAt: number | null = null;
  if ((decision.outcome === "REFUND_FULL" || decision.outcome === "REFUND_PARTIAL") && decision.arithmetic && decision.appliedClause) {
    approvalExpiresAt = now + APPROVAL_TTL_MS;
    approvalToken = issueApproval(session.credentials, {
      nonce: randomUUID().replaceAll("-", "").slice(0, 24),
      orderId,
      captureId: record.capture.id,
      owner,
      amountCents: decision.arithmetic.amountCents,
      currency: record.currency,
      lines: decision.refundLines,
      includesShipping: decision.includesShipping,
      clauseId: decision.appliedClause,
      expiresAt: approvalExpiresAt,
    });
  }
  return { record, extraction, decision, approvalToken, approvalExpiresAt };
}

/** Re-checks a signed proposal against PayPal's current record. The only code path that moves money. */
function assertStillRefundable(approval: Approval, record: CaseRecord, now: number) {
  if (!record.capture || record.capture.id !== approval.captureId) throw new HttpError(409, "RECORD_CHANGED", "PayPal's record no longer matches this proposal.");
  if (record.capture.status !== "COMPLETED" && record.capture.status !== "PARTIALLY_REFUNDED") throw new HttpError(409, "NOT_REFUNDABLE", `PayPal reports this capture as ${record.capture.status}.`);
  if (approval.amountCents <= 0 || approval.amountCents > MAX_REFUND_PER_CASE_CENTS) throw new HttpError(422, "CASE_CAP", "This amount is outside the per-case limit.");
  if (approval.amountCents > record.remainingCents) throw new HttpError(409, "OVER_REMAINING", `PayPal shows only $${fromCents(record.remainingCents)} left on this payment. Read the message again.`);
  for (const line of record.lines) {
    const asked = approval.lines[line.id] ?? 0;
    if (asked > line.quantity - line.refundedUnits) throw new HttpError(409, "UNITS_ALREADY_REFUNDED", `PayPal's record shows ${line.name} has already been refunded. Read the message again.`);
  }
  if (dailyRefundedCents(now) + approval.amountCents > MAX_REFUND_PER_DAY_CENTS) throw new HttpError(429, "DAY_CAP", "The daily refund limit on this public demo has been reached. Try again tomorrow.");
}

export async function approveRefund(approvalToken: string, ownerSecret: string | null, now = Date.now()) {
  const session = connect();
  const approval = readApproval(session.credentials, approvalToken, now);
  const { order, owner } = await readOwnedOrder(session, approval.orderId, ownerSecret);
  if (owner !== approval.owner) throw FOREIGN_ORDER();
  const record = await readRecord(session, order);

  // A repeated approval returns the refund it already made, found in PayPal's own list.
  const previous = record.refunds.find((refund) => refund.nonce === approval.nonce);
  const requestId = `refund-${approval.nonce}`;
  let refundId: string;
  let created = null;
  let debugId: string | null = null;
  if (previous) {
    refundId = previous.id;
  } else {
    assertStillRefundable(approval, record, now);
    const result = await session.client.refundCapture(
      approval.captureId,
      {
        amount: { currency_code: approval.currency || CURRENCY, value: fromCents(approval.amountCents) },
        // Fixed text. Neither the visitor's message nor the model's output reaches the payer.
        note_to_payer: `Refund under shop policy clause ${approval.clauseId}.`,
        custom_id: refundMarker(approval),
      },
      requestId,
    );
    refundId = result.data.id;
    created = scrubRaw(result.data);
    debugId = result.debugId;
    addDailyRefund(approval.amountCents, now);
  }

  const readBack = await session.client.getRefund(refundId);
  const reread = await session.client.getOrder(approval.orderId);
  return {
    receipt: {
      refundId,
      requestId,
      repeated: Boolean(previous),
      status: readBack.data.status,
      amount: readBack.data.amount?.value ?? fromCents(approval.amountCents),
      currency: readBack.data.amount?.currency_code ?? approval.currency,
      refundDebugId: debugId,
      readBackDebugId: readBack.debugId,
      rawRefund: created,
      rawReadBack: scrubRaw(readBack.data),
    },
    record: await readRecord(session, reread.data),
  };
}

/** The catalogue as the model sees it when there is no PayPal order to check against. */
export const catalogLines = () => CATALOG.map(({ sku, name }) => ({ id: sku, name }));
