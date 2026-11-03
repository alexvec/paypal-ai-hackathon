import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Walks docs/demo-path.md with the fictional sample, so a person can record it.
 * It works in any mode. It reads the banners and reports what is real, and with
 * DEMO_REQUIRE_REAL=1 it fails if a mock or canned banner is showing, as a recorded demo must.
 */
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

async function completeLines(page: Page, proposal: Locator) {
  const lines = proposal.getByTestId("line");
  for (let i = 0; i < (await lines.count()); i++) {
    const qty = lines.nth(i).getByTestId("line-qty");
    const price = lines.nth(i).getByTestId("line-price");
    if (!(await qty.inputValue())) await qty.fill("3");
    if (!(await price.inputValue())) await price.fill("40.00");
  }
}

async function proposeSample(page: Page) {
  await page.getByTestId("note").fill("");
  await page.getByTestId("load-sample").click();
  await page.getByTestId("propose").click();
  const proposal = page.getByTestId("proposal");
  await expect(proposal).toBeVisible({ timeout: 90_000 });
  return proposal;
}

async function createInvoice(page: Page, proposal: Locator, invoiceDate: string) {
  const before = await page.getByTestId("invoice-card").count();
  await proposal.getByTestId("invoice-date").fill(invoiceDate);
  await completeLines(page, proposal);
  await page.getByTestId("create-draft").click();
  await expect(page.getByTestId("invoice-card")).toHaveCount(before + 1, { timeout: 60_000 });
  const card = page.getByTestId("invoice-card").first();
  await expect(card.getByTestId("invoice-status")).toHaveText("DRAFT");
  return card;
}

async function sendInvoice(card: Locator) {
  await card.getByRole("button", { name: "Approve and send" }).click();
  await expect(card.getByTestId("invoice-status")).not.toHaveText("DRAFT", { timeout: 60_000 });
}

test("demo path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Billing Desk Agent" })).toBeVisible();
  await expect(page.getByTestId("banner-checking")).toHaveCount(0, { timeout: 45_000 });

  const mock = await page.getByTestId("banner-mock").count();
  const canned = await page.getByTestId("banner-canned").count();
  console.log(`Modes on this run. PayPal: ${mock ? "MOCK" : "SANDBOX"}. Model: ${canned ? "CANNED" : "LIVE"}.`);
  if (process.env.DEMO_REQUIRE_REAL) {
    expect(mock, "A mock banner is showing").toBe(0);
    expect(canned, "A canned banner is showing").toBe(0);
  }

  // Step 1: a note goes in. Step 2: the proposal shows its justification and what is unclear.
  let proposal = await proposeSample(page);
  await expect(proposal.getByTestId("source-highlight").first()).toBeVisible();
  await expect(proposal.getByTestId("line").first()).toBeVisible();
  await expect(page.getByTestId("questions")).toBeVisible();

  // The approval button stays off until a person resolves every open line, unless the model filled them all.
  const problems = await page.getByTestId("problems").count();
  if (problems) await expect(page.getByTestId("create-draft")).toBeDisabled();

  // Step 3: approve. An invoice id and the status read back appear.
  const first = await createInvoice(page, proposal, daysAgo(0));
  await expect(first.getByTestId("invoice-id")).not.toBeEmpty();
  if (mock) await expect(first.getByTestId("invoice-id")).toContainText("MOCK-");

  // Step 5, part 1: an invoice dated 30 days ago is overdue. The agent drafts a reminder, a person approves.
  proposal = await proposeSample(page);
  const overdue = await createInvoice(page, proposal, daysAgo(30));
  await sendInvoice(overdue);
  await overdue.getByTestId("ask-agent").click();
  await expect(overdue.getByTestId("agent-result")).toBeVisible({ timeout: 90_000 });
  await expect(overdue.getByTestId("pending")).toBeVisible();
  await overdue.getByTestId("approve-pending").click();
  await expect(overdue.getByTestId("action-done")).toBeVisible({ timeout: 60_000 });

  // Step 5, part 2: a cash payment, recorded after confirmation.
  proposal = await proposeSample(page);
  const cash = await createInvoice(page, proposal, daysAgo(1));
  await sendInvoice(cash);
  await cash.getByTestId("owner-note").fill("They paid cash in full yesterday.");
  await cash.getByTestId("ask-agent").click();
  await expect(cash.getByTestId("pending")).toBeVisible({ timeout: 90_000 });
  await cash.getByTestId("approve-pending").click();
  await expect(cash.getByTestId("invoice-status")).toContainText("PAID", { timeout: 60_000 });
});

test("the policy limit blocks an over-limit invoice on the server", async ({ page }) => {
  await page.goto("/");
  const proposal = await proposeSample(page);
  await completeLines(page, proposal);
  const lines = proposal.getByTestId("line");
  await lines.first().getByTestId("line-qty").fill("100000");
  await page.getByTestId("create-draft").click();
  await expect(proposal.getByTestId("error")).toContainText("Blocked by policy");
  await expect(page.getByTestId("invoice-card")).toHaveCount(0);
});
