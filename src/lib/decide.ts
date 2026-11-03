import type { Claim } from "./claim";
import { fromCents, toCents } from "./money";
import { CHANGE_WINDOW_DAYS, CLAUSE_IDS, FAULT_WINDOW_DAYS, MAX_REFUND_PER_CASE_CENTS } from "./policy";
import type { CaseRecord, RecordLine } from "./record";

export type Outcome = "REFUND_FULL" | "REFUND_PARTIAL" | "DENY" | "ASK_CUSTOMER" | "ESCALATE";

export type FlagCode =
  | "ITEM_NOT_IN_ORDER"
  | "QUANTITY_ABOVE_PURCHASED"
  | "AMOUNT_ABOVE_CAPTURED"
  | "AMOUNT_ABOVE_ENTITLEMENT"
  | "OUTSIDE_WINDOW"
  | "DATE_MISMATCH"
  | "ALREADY_REFUNDED"
  | "FINAL_SALE"
  | "CAPPED_AT_REMAINING"
  | "UNKNOWN_CLAUSE"
  | "DRAFT_MENTIONS_MONEY";

export type Flag = { code: FlagCode; detail: string };

export type Arithmetic = {
  lines: Array<{ id: string; name: string; units: number; unitCents: number; subtotalCents: number }>;
  subtotalCents: number;
  taxCents: number;
  taxFormula: string;
  shippingCents: number;
  shippingNote: string;
  computedCents: number;
  remainingBeforeCents: number;
  amountCents: number;
  remainingAfterCents: number;
};

export type Decision = {
  outcome: Outcome;
  headline: string;
  reasons: string[];
  flags: Flag[];
  citedClauses: Array<{ id: string; why: string }>;
  appliedClause: string | null;
  arithmetic: Arithmetic | null;
  refundLines: Record<string, number>;
  includesShipping: boolean;
};

const DAY_MS = 86_400_000;
const FAULT_REASONS = new Set(["damaged", "wrong_item", "not_as_described"]);
const usd = (cents: number) => `$${fromCents(cents)}`;

const unitsLeft = (line: RecordLine) => Math.max(0, line.quantity - line.refundedUnits);

/** The claim's items as units per line, flagging whatever the PayPal record contradicts. */
function matchClaimToLines(claim: Claim, record: CaseRecord, flags: Flag[]) {
  const wanted = new Map<string, number>();
  let needsQuantity = false;
  const byId = new Map(record.lines.map((line) => [line.id, line]));
  const addAll = () => record.lines.forEach((line) => wanted.set(line.id, line.quantity));

  if (claim.whole_order || (claim.outcome_wanted === "full" && claim.claimed_items.length === 0)) addAll();

  for (const item of claim.claimed_items) {
    const line = item.line_id ? byId.get(item.line_id) : undefined;
    if (!line) {
      flags.push({ code: "ITEM_NOT_IN_ORDER", detail: `The customer mentions "${item.customer_words}". PayPal's record of this order has no such line.` });
      continue;
    }
    if (claim.whole_order) continue;
    if (item.quantity === null) {
      if (line.quantity === 1 || claim.outcome_wanted === "full") wanted.set(line.id, line.quantity);
      else needsQuantity = true;
      continue;
    }
    if (item.quantity > line.quantity) {
      flags.push({ code: "QUANTITY_ABOVE_PURCHASED", detail: `The customer claims ${item.quantity} of ${line.name}. PayPal's record shows ${line.quantity} bought.` });
    }
    wanted.set(line.id, Math.min(item.quantity, line.quantity));
  }
  return { wanted, needsQuantity };
}

function checkAssertions(claim: Claim, record: CaseRecord, flags: Flag[]) {
  const captured = record.capture?.amountCents ?? 0;
  if (claim.asserted_amount !== null && toCents(claim.asserted_amount) > captured) {
    flags.push({ code: "AMOUNT_ABOVE_CAPTURED", detail: `The customer states ${usd(toCents(claim.asserted_amount))}. PayPal captured ${usd(captured)} for this order.` });
  }
  const createTime = record.capture?.createTime;
  if (claim.asserted_date && createTime) {
    const gapDays = Math.abs(Date.parse(`${claim.asserted_date}T00:00:00Z`) - Date.parse(createTime)) / DAY_MS;
    if (gapDays > 2) flags.push({ code: "DATE_MISMATCH", detail: `The customer states ${claim.asserted_date}. PayPal recorded the payment on ${createTime.slice(0, 10)}.` });
  }
}

function citedClauses(claim: Claim, flags: Flag[]) {
  const cited: Decision["citedClauses"] = [];
  for (const clause of claim.clauses) {
    if (CLAUSE_IDS.includes(clause.id)) cited.push(clause);
    else flags.push({ code: "UNKNOWN_CLAUSE", detail: `The model cited clause "${clause.id}", which is not in the policy. It was ignored.` });
  }
  return cited;
}

/** A cumulative rounding, so tax across all refunds of an order adds up to exactly its tax_total. */
function taxUpTo(record: CaseRecord, unitsByLine: Record<string, number>): number {
  if (record.itemTotalCents === 0) return 0;
  const subtotal = record.lines.reduce((sum, line) => sum + line.unitCents * (unitsByLine[line.id] ?? 0), 0);
  return Math.round((record.taxCents * subtotal) / record.itemTotalCents);
}

function compute(record: CaseRecord, units: Record<string, number>, shippingAllowed: boolean): Arithmetic {
  const lines = record.lines
    .filter((line) => (units[line.id] ?? 0) > 0)
    .map((line) => ({ id: line.id, name: line.name, units: units[line.id], unitCents: line.unitCents, subtotalCents: line.unitCents * units[line.id] }));
  const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);

  const before = Object.fromEntries(record.lines.map((line) => [line.id, line.refundedUnits]));
  const after = Object.fromEntries(record.lines.map((line) => [line.id, line.refundedUnits + (units[line.id] ?? 0)]));
  const taxCents = taxUpTo(record, after) - taxUpTo(record, before);

  const everyUnitRefunded = record.lines.every((line) => after[line.id] >= line.quantity);
  const includeShipping = shippingAllowed && everyUnitRefunded && !record.shippingRefunded;
  const shippingCents = includeShipping ? record.shippingCents : 0;
  const shippingNote = includeShipping
    ? "Clause C-FAULT: every unit in the order is now refunded for shop fault."
    : shippingAllowed
      ? "Not included: clause C-FAULT refunds shipping only once every unit is refunded."
      : "Not included: this clause does not refund shipping.";

  const computedCents = subtotalCents + taxCents + shippingCents;
  const amountCents = Math.min(computedCents, record.remainingCents);
  return {
    lines,
    subtotalCents,
    taxCents,
    taxFormula: `${usd(record.taxCents)} order tax x (${usd(subtotalCents)} refunded items / ${usd(record.itemTotalCents)} all items), rounded so the order's tax adds up exactly`,
    shippingCents,
    shippingNote,
    computedCents,
    remainingBeforeCents: record.remainingCents,
    amountCents,
    remainingAfterCents: record.remainingCents - amountCents,
  };
}

/**
 * The referee. A pure function from PayPal's record and the validated claim to a decision. The only
 * things it reads from the model are which lines, which reason, and what the customer asserted.
 * No model value can raise the amount: it is built from PayPal's prices and capped at PayPal's balance.
 */
export function decide(record: CaseRecord, claim: Claim | null, now: number): Decision {
  const flags: Flag[] = [];
  const stop = (outcome: Outcome, headline: string, reasons: string[], appliedClause: string | null = null, cited: Decision["citedClauses"] = []): Decision => ({
    outcome,
    headline,
    reasons,
    flags,
    citedClauses: cited,
    appliedClause,
    arithmetic: null,
    refundLines: {},
    includesShipping: false,
  });

  if (!claim) return stop("ESCALATE", "Needs review: the message could not be read reliably.", ["The model's output did not pass validation. No refund is proposed."]);
  const cited = citedClauses(claim, flags);
  const end = (outcome: Outcome, headline: string, reasons: string[], clause: string | null = null) => stop(outcome, headline, reasons, clause, cited);

  if (claim.cannot_parse) return end("ESCALATE", "Needs review: this does not read as a request about a purchase.", ["No refund is proposed."]);
  if (/[$€£]\s?\d|\b\d+[.,]\d{2}\b/.test(claim.draft_reply)) {
    flags.push({ code: "DRAFT_MENTIONS_MONEY", detail: "The drafted reply mentions a money figure. Use the figure below, not the draft's." });
  }
  checkAssertions(claim, record, flags);

  const capture = record.capture;
  if (!capture) return end("ESCALATE", "This order has not been captured.", ["There is no payment to refund yet."]);
  const refundable = capture.status === "COMPLETED" || capture.status === "PARTIALLY_REFUNDED";
  if (capture.status === "REFUNDED" || (refundable && record.remainingCents === 0)) {
    flags.push({ code: "ALREADY_REFUNDED", detail: `PayPal reports capture ${capture.id} as ${capture.status}, with ${usd(record.remainingCents)} left to refund.` });
    return end("DENY", "Nothing is left to refund on this payment.", ["PayPal's record shows the full amount has been refunded."]);
  }
  if (!refundable) {
    return end("ESCALATE", `PayPal reports this capture as ${capture.status}.`, ["A refund needs a completed capture."]);
  }
  if (record.historyIncomplete || record.unattributedRefunds) {
    return end("ESCALATE", "PayPal's refund history for this payment needs a person.", ["An earlier refund cannot be matched to specific items, so a per-item amount cannot be computed safely."]);
  }
  if (capture.amountCents !== record.orderTotalCents) {
    return end("ESCALATE", "The captured amount differs from the order total.", [`Captured ${usd(capture.amountCents)}, order total ${usd(record.orderTotalCents)}.`]);
  }

  if (claim.outcome_wanted === "replacement") return end("ESCALATE", "The customer wants a replacement, not money back.", ["A replacement is the owner's call. No refund is proposed."]);
  if (claim.reason_category === "not_delivered") return end("ESCALATE", "The customer says the order never arrived.", ["Clause C-MISSING: the owner checks the carrier first. PayPal's record cannot show delivery."], "C-MISSING");

  const { wanted, needsQuantity } = matchClaimToLines(claim, record, flags);
  if (wanted.size === 0) {
    if (flags.some((flag) => flag.code === "ITEM_NOT_IN_ORDER")) return end("DENY", "The item claimed is not on this order.", ["PayPal's record of this order does not include it."]);
    return end("ASK_CUSTOMER", "Ask the customer which item this is about.", ["The message does not identify an item on this order."]);
  }
  if (needsQuantity) return end("ASK_CUSTOMER", "Ask the customer how many units this is about.", ["The order has several of that item, and the message does not say how many."]);
  if (claim.outcome_wanted === "unclear" || claim.reason_category === "unclear" || claim.reason_category === "other") {
    return end("ASK_CUSTOMER", "Ask the customer what went wrong and what they want.", ["The policy depends on the reason, and the message does not give a usable one."]);
  }

  const fault = FAULT_REASONS.has(claim.reason_category);
  const clause = fault ? "C-FAULT" : "C-CHANGE";
  const windowDays = fault ? FAULT_WINDOW_DAYS : CHANGE_WINDOW_DAYS;
  const ageDays = capture.createTime ? (now - Date.parse(capture.createTime)) / DAY_MS : Number.POSITIVE_INFINITY;
  if (ageDays > windowDays) {
    flags.push({ code: "OUTSIDE_WINDOW", detail: `Clause ${clause} allows ${windowDays} days. PayPal recorded this payment ${Number.isFinite(ageDays) ? `${Math.floor(ageDays)} days ago` : "at an unknown time"}.` });
    return end("DENY", `Outside the ${windowDays}-day window.`, [`Clause ${clause} no longer applies to this payment.`], clause);
  }

  const units: Record<string, number> = {};
  for (const line of record.lines) {
    const asked = wanted.get(line.id) ?? 0;
    if (asked === 0) continue;
    if (!fault && line.finalSale) {
      flags.push({ code: "FINAL_SALE", detail: `${line.name} is final sale, so clause C-FINAL excludes it from a change of mind.` });
      continue;
    }
    const available = unitsLeft(line);
    if (asked > available) flags.push({ code: "ALREADY_REFUNDED", detail: `PayPal's refund record shows ${line.refundedUnits} of ${line.quantity} ${line.name} already refunded.` });
    if (available > 0) units[line.id] = Math.min(asked, available);
  }
  if (Object.keys(units).length === 0) {
    return end("DENY", "Nothing on this claim can be refunded.", ["Every item claimed is excluded by the policy or already refunded, according to PayPal's record."], flags.some((f) => f.code === "FINAL_SALE") ? "C-FINAL" : clause);
  }

  const arithmetic = compute(record, units, fault);
  if (arithmetic.computedCents > arithmetic.amountCents) {
    flags.push({ code: "CAPPED_AT_REMAINING", detail: `The policy computes ${usd(arithmetic.computedCents)}, but PayPal shows only ${usd(record.remainingCents)} left on this capture.` });
  }
  if (claim.asserted_amount !== null && toCents(claim.asserted_amount) > arithmetic.amountCents && toCents(claim.asserted_amount) <= capture.amountCents) {
    flags.push({ code: "AMOUNT_ABOVE_ENTITLEMENT", detail: `The customer asks for ${usd(toCents(claim.asserted_amount))}. The policy allows ${usd(arithmetic.amountCents)}.` });
  }
  if (arithmetic.amountCents > MAX_REFUND_PER_CASE_CENTS) {
    return { ...end("ESCALATE", `${usd(arithmetic.amountCents)} is above the ${usd(MAX_REFUND_PER_CASE_CENTS)} per-case limit.`, ["Clause C-CAP: above the limit, nothing is proposed for approval here."], "C-CAP"), arithmetic };
  }

  const isFull = arithmetic.remainingAfterCents === 0;
  return {
    outcome: isFull ? "REFUND_FULL" : "REFUND_PARTIAL",
    headline: `${isFull ? "Refund the rest" : "Partial refund"}: ${usd(arithmetic.amountCents)}`,
    reasons: [`Clause ${clause} applies. The amount comes from PayPal's line prices and tax, not from the message or the model.`],
    flags,
    citedClauses: cited,
    appliedClause: clause,
    arithmetic,
    refundLines: units,
    includesShipping: arithmetic.shippingCents > 0,
  };
}
