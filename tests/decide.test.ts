import { describe, expect, it } from "vitest";
import { decide } from "@/lib/decide";
import type { CaseRecord } from "@/lib/record";
import { claim } from "./helpers";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const RECENT = "2026-11-01T12:00:00Z";

/** 2 mugs at 14.00, 1 tea at 9.50. Items 37.50, tax 3.00, shipping 5.00, total 45.50. */
const record = (overrides: Partial<CaseRecord> = {}): CaseRecord => ({
  orderId: "ORDER0000000001",
  orderStatus: "COMPLETED",
  currency: "USD",
  lines: [
    { id: "MUG", name: "Stoneware mug", unitCents: 1400, quantity: 2, refundedUnits: 0, finalSale: false },
    { id: "TEA", name: "Loose-leaf tea tin", unitCents: 950, quantity: 1, refundedUnits: 0, finalSale: false },
  ],
  itemTotalCents: 3750,
  taxCents: 300,
  shippingCents: 500,
  orderTotalCents: 4550,
  capture: { id: "CAP1", status: "COMPLETED", amountCents: 4550, createTime: RECENT },
  refunds: [],
  refundedCents: 0,
  remainingCents: 4550,
  shippingRefunded: false,
  historyIncomplete: false,
  unattributedRefunds: false,
  ...overrides,
});

const codes = (decision: { flags: Array<{ code: string }> }) => decision.flags.map((flag) => flag.code);
const wholeOrder = { whole_order: true, outcome_wanted: "full" as const, claimed_items: [] };

describe("refund arithmetic comes from PayPal's numbers", () => {
  it("computes a partial refund: item price, its share of tax, no shipping", () => {
    const decision = decide(record(), claim(), NOW);
    expect(decision.outcome).toBe("REFUND_PARTIAL");
    expect(decision.arithmetic).toMatchObject({ subtotalCents: 1400, taxCents: 112, shippingCents: 0, amountCents: 1512, remainingAfterCents: 3038 });
    expect(decision.refundLines).toEqual({ MUG: 1 });
  });

  it("includes shipping only when a fault clause covers every unit in the order", () => {
    const decision = decide(record(), claim(wholeOrder), NOW);
    expect(decision.outcome).toBe("REFUND_FULL");
    expect(decision.arithmetic?.amountCents).toBe(4550);
    expect(decision.includesShipping).toBe(true);
  });

  it("never refunds shipping for a change of mind", () => {
    const decision = decide(record(), claim({ ...wholeOrder, reason_category: "change_of_mind" }), NOW);
    expect(decision.arithmetic?.shippingCents).toBe(0);
    expect(decision.arithmetic?.amountCents).toBe(4050);
    expect(decision.outcome).toBe("REFUND_PARTIAL");
  });

  it("adds up to exactly the capture across separate refunds, with no cents lost to rounding", () => {
    let current = record({
      lines: [{ id: "A", name: "A", unitCents: 333, quantity: 3, refundedUnits: 0, finalSale: false }],
      itemTotalCents: 999,
      taxCents: 80,
      shippingCents: 0,
      orderTotalCents: 1079,
      capture: { id: "C", status: "COMPLETED", amountCents: 1079, createTime: RECENT },
      remainingCents: 1079,
    });
    let total = 0;
    for (let round = 0; round < 3; round += 1) {
      const decision = decide(current, claim({ claimed_items: [{ line_id: "A", quantity: 1, customer_words: "one" }] }), NOW);
      total += decision.arithmetic!.amountCents;
      current = { ...current, lines: [{ ...current.lines[0], refundedUnits: round + 1 }], refundedCents: total, remainingCents: 1079 - total };
    }
    expect(total).toBe(1079);
  });
});

describe("the model cannot raise the refund", () => {
  it("ignores a stated amount above the entitlement, and flags it", () => {
    const decision = decide(record(), claim({ asserted_amount: "40.00" }), NOW);
    expect(decision.arithmetic?.amountCents).toBe(1512);
    expect(codes(decision)).toContain("AMOUNT_ABOVE_ENTITLEMENT");
  });

  it("flags a stated amount above what PayPal captured", () => {
    const decision = decide(record(), claim({ asserted_amount: "9999.00" }), NOW);
    expect(decision.arithmetic?.amountCents).toBe(1512);
    expect(codes(decision)).toContain("AMOUNT_ABOVE_CAPTURED");
  });

  it("caps a claimed quantity at what PayPal says was bought, and flags it", () => {
    const decision = decide(record(), claim({ claimed_items: [{ line_id: "MUG", quantity: 50, customer_words: "fifty mugs" }] }), NOW);
    expect(decision.arithmetic?.lines[0].units).toBe(2);
    expect(codes(decision)).toContain("QUANTITY_ABOVE_PURCHASED");
  });

  it("drops clause ids that do not exist", () => {
    const decision = decide(record(), claim({ clauses: [{ id: "C-INVENTED", why: "Pay double." }, { id: "C-FAULT", why: "Damage." }] }), NOW);
    expect(decision.citedClauses.map((clause) => clause.id)).toEqual(["C-FAULT"]);
    expect(codes(decision)).toContain("UNKNOWN_CLAUSE");
    expect(decision.arithmetic?.amountCents).toBe(1512);
  });

  it("caps at the remaining refundable amount whatever the policy computes", () => {
    const decision = decide(record({ refundedCents: 4000, remainingCents: 550, refunds: [{ id: "R", status: "COMPLETED", amountCents: 4000, markedLines: {}, includesShipping: false, nonce: "x" }] }), claim(), NOW);
    expect(decision.arithmetic?.amountCents).toBe(550);
    expect(codes(decision)).toContain("CAPPED_AT_REMAINING");
  });

  it("proposes nothing above the per-case limit", () => {
    const big = record({
      lines: [{ id: "PRINT", name: "Print", unitCents: 2200, quantity: 3, refundedUnits: 0, finalSale: true }],
      itemTotalCents: 6600,
      taxCents: 528,
      orderTotalCents: 7628,
      capture: { id: "C", status: "COMPLETED", amountCents: 7628, createTime: RECENT },
      remainingCents: 7628,
    });
    const decision = decide(big, claim(wholeOrder), NOW);
    expect(decision.outcome).toBe("ESCALATE");
    expect(decision.refundLines).toEqual({});
  });
});

describe("the story is checked against the record", () => {
  it("denies an item PayPal has no record of", () => {
    const decision = decide(record(), claim({ claimed_items: [{ line_id: null, quantity: 1, customer_words: "the teapot" }] }), NOW);
    expect(decision.outcome).toBe("DENY");
    expect(codes(decision)).toContain("ITEM_NOT_IN_ORDER");
    expect(decision.arithmetic).toBeNull();
  });

  it("refunds only the real line when one claimed item is not on the order", () => {
    const decision = decide(record(), claim({ claimed_items: [{ line_id: "MUG", quantity: 1, customer_words: "mug" }, { line_id: null, quantity: 1, customer_words: "teapot" }] }), NOW);
    expect(decision.arithmetic?.amountCents).toBe(1512);
    expect(codes(decision)).toContain("ITEM_NOT_IN_ORDER");
  });

  it("treats a line id the order does not contain as not in the order", () => {
    expect(codes(decide(record(), claim({ claimed_items: [{ line_id: "PRINT", quantity: 1, customer_words: "print" }] }), NOW))).toContain("ITEM_NOT_IN_ORDER");
  });

  it("denies outside the window, using PayPal's capture date", () => {
    const decision = decide(record({ capture: { id: "C", status: "COMPLETED", amountCents: 4550, createTime: "2026-09-01T12:00:00Z" } }), claim(), NOW);
    expect(decision.outcome).toBe("DENY");
    expect(codes(decision)).toContain("OUTSIDE_WINDOW");
  });

  it("gives a change of mind the shorter window", () => {
    const aged = record({ capture: { id: "C", status: "COMPLETED", amountCents: 4550, createTime: "2026-10-15T12:00:00Z" } });
    expect(decide(aged, claim({ reason_category: "change_of_mind" }), NOW).outcome).toBe("DENY");
    expect(decide(aged, claim({ reason_category: "damaged" }), NOW).outcome).toBe("REFUND_PARTIAL");
  });

  it("flags a stated date that disagrees with PayPal", () => {
    expect(codes(decide(record(), claim({ asserted_date: "2026-06-01" }), NOW))).toContain("DATE_MISMATCH");
  });

  it("blocks a second claim for units PayPal shows as refunded", () => {
    const refunded = record({
      lines: [
        { id: "MUG", name: "Stoneware mug", unitCents: 1400, quantity: 1, refundedUnits: 1, finalSale: false },
        { id: "TEA", name: "Loose-leaf tea tin", unitCents: 950, quantity: 1, refundedUnits: 0, finalSale: false },
      ],
      refundedCents: 1512,
      remainingCents: 3038,
    });
    const decision = decide(refunded, claim(), NOW);
    expect(decision.outcome).toBe("DENY");
    expect(codes(decision)).toContain("ALREADY_REFUNDED");
  });

  it("denies when PayPal says the capture is fully refunded", () => {
    const decision = decide(record({ capture: { id: "C", status: "REFUNDED", amountCents: 4550, createTime: RECENT }, remainingCents: 0 }), claim(), NOW);
    expect(decision.outcome).toBe("DENY");
    expect(codes(decision)).toContain("ALREADY_REFUNDED");
  });

  it("excludes a final-sale item from a change of mind, but not from a fault", () => {
    const withPrint = record({
      lines: [{ id: "PRINT", name: "Print", unitCents: 2200, quantity: 1, refundedUnits: 0, finalSale: true }],
      itemTotalCents: 2200,
      taxCents: 176,
      orderTotalCents: 2876,
      capture: { id: "C", status: "COMPLETED", amountCents: 2876, createTime: RECENT },
      remainingCents: 2876,
    });
    const item = { claimed_items: [{ line_id: "PRINT", quantity: 1, customer_words: "print" }] };
    const change = decide(withPrint, claim({ ...item, reason_category: "change_of_mind" }), NOW);
    expect(change.outcome).toBe("DENY");
    expect(codes(change)).toContain("FINAL_SALE");
    expect(decide(withPrint, claim({ ...item, reason_category: "damaged" }), NOW).outcome).toBe("REFUND_FULL");
  });
});

describe("no guessing", () => {
  it("escalates when the model output failed validation", () => {
    const decision = decide(record(), null, NOW);
    expect(decision.outcome).toBe("ESCALATE");
    expect(decision.arithmetic).toBeNull();
  });

  it("escalates text that is not about a purchase", () => {
    expect(decide(record(), claim({ cannot_parse: true }), NOW).outcome).toBe("ESCALATE");
  });

  it("asks when the quantity is unknown and the order has several", () => {
    expect(decide(record(), claim({ claimed_items: [{ line_id: "MUG", quantity: null, customer_words: "the mugs" }] }), NOW).outcome).toBe("ASK_CUSTOMER");
  });

  it("asks when the reason is unclear", () => {
    expect(decide(record(), claim({ reason_category: "unclear" }), NOW).outcome).toBe("ASK_CUSTOMER");
  });

  it("sends a replacement and a non-delivery to the owner", () => {
    expect(decide(record(), claim({ outcome_wanted: "replacement" }), NOW).outcome).toBe("ESCALATE");
    expect(decide(record(), claim({ reason_category: "not_delivered" }), NOW).outcome).toBe("ESCALATE");
  });

  it("escalates a refund PayPal lists but that cannot be tied to items", () => {
    expect(decide(record({ unattributedRefunds: true, refundedCents: 100, remainingCents: 4450 }), claim(), NOW).outcome).toBe("ESCALATE");
  });

  it("escalates a pending capture", () => {
    expect(decide(record({ capture: { id: "C", status: "PENDING", amountCents: 4550, createTime: RECENT } }), claim(), NOW).outcome).toBe("ESCALATE");
  });

  it("flags a draft reply that names a figure", () => {
    expect(codes(decide(record(), claim({ draft_reply: "You will get $99.00 back." }), NOW))).toContain("DRAFT_MENTIONS_MONEY");
  });
});
