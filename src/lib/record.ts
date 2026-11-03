import { isFinalSale } from "./catalog";
import { toCents } from "./money";
import type { PayPalCapture, PayPalOrder } from "./paypal/client";
import { readRefundMarker } from "./provenance";

export type RecordLine = { id: string; name: string; unitCents: number; quantity: number; refundedUnits: number; finalSale: boolean };
export type RecordRefund = { id: string; status: string; amountCents: number; markedLines: Record<string, number> | null; includesShipping: boolean; nonce: string | null };
export type CaseRecord = {
  orderId: string;
  orderStatus: string;
  currency: string;
  lines: RecordLine[];
  itemTotalCents: number;
  taxCents: number;
  shippingCents: number;
  orderTotalCents: number;
  capture: { id: string; status: string; amountCents: number; createTime: string | null } | null;
  refunds: RecordRefund[];
  refundedCents: number;
  remainingCents: number;
  shippingRefunded: boolean;
  /** A capture says it was refunded, but the order does not list a refund that covers the sum. */
  historyIncomplete: boolean;
  /** A listed refund does not say which units it covered. */
  unattributedRefunds: boolean;
};

const cents = (value: string | undefined) => (value === undefined ? 0 : toCents(value));
const CANCELLED_REFUND = new Set(["FAILED", "CANCELLED"]);

/**
 * PayPal's capture resource has a status but no refund list. The documented list of refunds is
 * purchase_units[].payments.refunds[] on the order, so both are read and cross-checked.
 */
export function buildRecord(order: PayPalOrder, captureRead: PayPalCapture | null): CaseRecord {
  const unit = order.purchase_units?.[0];
  const breakdown = unit?.amount?.breakdown;
  const listed = unit?.payments?.refunds ?? [];

  const refunds: RecordRefund[] = listed.map((refund) => {
    const marker = readRefundMarker(refund.custom_id);
    return {
      id: refund.id,
      status: refund.status,
      amountCents: cents(refund.amount?.value),
      markedLines: marker?.lines ?? null,
      includesShipping: marker?.includesShipping ?? false,
      nonce: marker?.nonce ?? null,
    };
  });
  const live = refunds.filter((refund) => !CANCELLED_REFUND.has(refund.status));
  const summed = live.reduce((sum, refund) => sum + refund.amountCents, 0);
  const reported = Math.max(0, ...listed.filter((refund) => !CANCELLED_REFUND.has(refund.status)).map((refund) => cents(refund.seller_payable_breakdown?.total_refunded_amount?.value)));
  const refundedCents = Math.max(summed, reported);

  const refundedUnits: Record<string, number> = {};
  for (const refund of live) for (const [sku, units] of Object.entries(refund.markedLines ?? {})) refundedUnits[sku] = (refundedUnits[sku] ?? 0) + units;

  const listedCapture = unit?.payments?.captures?.[0] ?? null;
  const captureSource = captureRead ?? listedCapture;
  const capture = captureSource
    ? { id: captureSource.id, status: captureSource.status, amountCents: cents(captureSource.amount?.value ?? listedCapture?.amount?.value), createTime: captureSource.create_time ?? listedCapture?.create_time ?? null }
    : null;

  const fullyRefunded = capture?.status === "REFUNDED";
  const remainingCents = !capture ? 0 : fullyRefunded ? 0 : Math.max(0, capture.amountCents - refundedCents);
  const historyIncomplete = Boolean(capture && ((capture.status === "PARTIALLY_REFUNDED" && refundedCents === 0) || (fullyRefunded && refundedCents < capture.amountCents)));

  return {
    orderId: order.id,
    orderStatus: order.status,
    currency: unit?.amount?.currency_code ?? "USD",
    lines: (unit?.items ?? []).map((item) => ({
      id: item.sku ?? item.name,
      name: item.name,
      unitCents: toCents(item.unit_amount.value),
      quantity: Number(item.quantity),
      refundedUnits: refundedUnits[item.sku ?? item.name] ?? 0,
      finalSale: isFinalSale(item.sku ?? ""),
    })),
    itemTotalCents: cents(breakdown?.item_total?.value),
    taxCents: cents(breakdown?.tax_total?.value),
    shippingCents: cents(breakdown?.shipping?.value),
    orderTotalCents: cents(unit?.amount?.value),
    capture,
    refunds,
    refundedCents,
    remainingCents,
    shippingRefunded: live.some((refund) => refund.includesShipping),
    historyIncomplete,
    unattributedRefunds: live.some((refund) => refund.markedLines === null),
  };
}
