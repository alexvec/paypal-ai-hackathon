import { expect, test } from "@playwright/test";

/** Every /api response in this file is stubbed, and every id is plainly a test value. No call leaves the browser. */
const record = (overrides: Record<string, unknown> = {}) => ({
  orderId: "TESTORDER0000001",
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
  capture: { id: "TESTCAPTURE001", status: "COMPLETED", amountCents: 4550, createTime: "2026-11-03T10:00:00Z" },
  refunds: [],
  refundedCents: 0,
  remainingCents: 4550,
  shippingRefunded: false,
  historyIncomplete: false,
  unattributedRefunds: false,
  ...overrides,
});

const claim = {
  language: "English",
  outcome_wanted: "partial",
  reason_category: "damaged",
  reason_summary: "One mug arrived cracked.",
  whole_order: false,
  claimed_items: [{ line_id: "MUG", quantity: 1, customer_words: "one of the mugs" }],
  asserted_amount: "60.00",
  asserted_date: null,
  clauses: [{ id: "C-FAULT", why: "Damage on arrival." }],
  draft_reply: "Thanks for writing in. The owner will confirm the outcome.",
  cannot_parse: false,
};

const decision = {
  outcome: "REFUND_PARTIAL",
  headline: "Partial refund: $15.12",
  reasons: ["Clause C-FAULT applies."],
  flags: [{ code: "AMOUNT_ABOVE_CAPTURED", detail: "The customer states $60.00. PayPal captured $45.50 for this order." }],
  citedClauses: claim.clauses,
  appliedClause: "C-FAULT",
  arithmetic: {
    lines: [{ id: "MUG", name: "Stoneware mug", units: 1, unitCents: 1400, subtotalCents: 1400 }],
    subtotalCents: 1400,
    taxCents: 112,
    taxFormula: "$3.00 order tax x ($14.00 refunded items / $37.50 all items)",
    shippingCents: 0,
    shippingNote: "Not included: clause C-FAULT refunds shipping only once every unit is refunded.",
    computedCents: 1512,
    remainingBeforeCents: 4550,
    amountCents: 1512,
    remainingAfterCents: 3038,
  },
  refundLines: { MUG: 1 },
  includesShipping: false,
};

test("the case, proposal and receipt render, and the refund posts only the approval", async ({ page }) => {
  let refundBody: unknown = null;
  await page.route("**/api/orders/TESTORDER0000001", (route) => route.fulfill({ json: { record: record(), debugId: null } }));
  await page.route("**/api/cases", (route) => route.fulfill({ json: { record: record(), extraction: { status: "VALID", claim, modelCalls: 1 }, decision, approvalToken: "signed.test", approvalExpiresAt: 1 } }));
  await page.route("**/api/refunds", (route) => {
    refundBody = route.request().postDataJSON();
    return route.fulfill({
      json: {
        receipt: { refundId: "TESTREFUND001", requestId: "refund-test", repeated: false, status: "COMPLETED", amount: "15.12", currency: "USD", refundDebugId: "test-debug-1", readBackDebugId: "test-debug-2", rawRefund: { id: "TESTREFUND001" }, rawReadBack: { id: "TESTREFUND001" } },
        record: record({ capture: { id: "TESTCAPTURE001", status: "PARTIALLY_REFUNDED", amountCents: 4550, createTime: "2026-11-03T10:00:00Z" }, refundedCents: 1512, remainingCents: 3038 }),
      },
    });
  });

  await page.goto("/?order=TESTORDER0000001");
  await expect(page.getByTestId("remaining").first()).toHaveText("$45.50");

  await page.getByTestId("message").fill("Fictional: one of the mugs is cracked. I paid $60.");
  await page.getByTestId("read-message").click();
  await expect(page.getByTestId("outcome")).toHaveText("Partial refund");
  await expect(page.getByTestId("amount")).toHaveText("$15.12");
  await expect(page.locator('[data-flag="AMOUNT_ABOVE_CAPTURED"]')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("case.png"), fullPage: true });

  await page.getByTestId("approve").click();
  await expect(page.getByTestId("refund-id")).toHaveText("TESTREFUND001");
  await expect(page.getByTestId("remaining").first()).toHaveText("$30.38");
  await expect(page.getByTestId("approve")).toHaveCount(0);
  expect(refundBody).toEqual({ approvalToken: "signed.test", approved: true });
  await page.screenshot({ path: test.info().outputPath("receipt.png"), fullPage: true });
});

test("a denial offers no approve button", async ({ page }) => {
  await page.route("**/api/orders/TESTORDER0000001", (route) => route.fulfill({ json: { record: record(), debugId: null } }));
  const denied = { ...decision, outcome: "DENY", headline: "The item claimed is not on this order.", arithmetic: null, refundLines: {}, flags: [{ code: "ITEM_NOT_IN_ORDER", detail: "No such line." }] };
  await page.route("**/api/cases", (route) => route.fulfill({ json: { record: record(), extraction: { status: "VALID", claim, modelCalls: 1 }, decision: denied, approvalToken: null, approvalExpiresAt: null } }));
  await page.goto("/?order=TESTORDER0000001");
  await expect(page.getByTestId("remaining").first()).toHaveText("$45.50");
  await page.getByTestId("message").fill("Fictional: the teapot leaked.");
  await page.getByTestId("read-message").click();
  await expect(page.getByTestId("outcome")).toHaveText("Deny");
  await expect(page.getByTestId("approve")).toHaveCount(0);
});
