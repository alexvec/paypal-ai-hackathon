import { expect, test, type Page } from "@playwright/test";

/**
 * Walks docs/demo-path.md against real services, so a person can record it. There is no stub here.
 *
 * - The model step spends real money, so it runs only with DEMO_RUN_MODEL=1.
 * - The PayPal steps run only when the deployment reports sandbox credentials. They need headed mode
 *   and a person to approve the order as the sandbox buyer.
 * - The second message is the viewer's: pass DEMO_MESSAGE, or it uses a plainly fictional one.
 */
const runModel = process.env.DEMO_RUN_MODEL === "1";
const CRACKED_MUG = process.env.DEMO_MESSAGE ?? "Fictional demo message. One of the two mugs arrived with a crack. I paid $60 and I want that money back.";
const NOT_ON_ORDER = "Fictional demo message. The teapot I bought from you leaked everywhere. Please refund me.";

async function paypalConnected(page: Page) {
  const health = await (await page.request.get("/api/health")).json();
  return health.paypal.connected as boolean;
}

test("opening the app shows the real connection state", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Refund Referee" })).toBeVisible();
  await expect(page.getByTestId("paypal-status")).toBeVisible();
  await expect(page.getByTestId("model-status")).toBeVisible();

  if (!(await paypalConnected(page))) {
    await expect(page.getByTestId("paypal-not-connected")).toContainText("PAYPAL_CLIENT_ID missing");
    await expect(page.getByTestId("create-order")).toBeDisabled();
    await expect(page.getByTestId("approval-link")).toHaveCount(0);
    await expect(page.getByTestId("refund-id")).toHaveCount(0);
  }
});

test("a real model extraction, with no PayPal record", async ({ page }) => {
  test.skip(!runModel, "Set DEMO_RUN_MODEL=1 to spend one real model call.");
  await page.goto("/");
  await page.getByTestId("fill-example").click();
  await page.getByTestId("read-message").click();
  await expect(page.getByTestId("extract-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("extract-notice")).toContainText("No PayPal record was read");
  await expect(page.getByTestId("claim")).toBeVisible();
});

test("the full demo path on the PayPal sandbox", async ({ page }) => {
  await page.goto("/");
  test.skip(!(await paypalConnected(page)), "PayPal sandbox credentials are not set on this deployment.");

  // 1. Create the order. The approval step is the person's: sign in as the sandbox buyer and pay.
  await page.getByTestId("create-order").click();
  const link = page.getByTestId("approval-link");
  await expect(link).toBeVisible({ timeout: 30_000 });
  await link.click();
  await page.waitForURL(/paypal\.com/, { timeout: 30_000 });
  console.log("Approve the order in the browser as the sandbox buyer. Waiting up to 10 minutes.");
  await page.waitForURL((url) => !url.hostname.includes("paypal.com"), { timeout: 10 * 60 * 1000 });

  // 2. Back on the app: the order is captured, and the record comes from PayPal.
  await expect(page.getByTestId("capture-status")).toHaveText("COMPLETED", { timeout: 30_000 });

  // 3. A contradictory message: the item is not on the order.
  await page.getByTestId("message").fill(NOT_ON_ORDER);
  await page.getByTestId("read-message").click();
  await expect(page.getByTestId("proposal")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("flags").locator('[data-flag="ITEM_NOT_IN_ORDER"]')).toBeVisible();
  await expect(page.getByTestId("approve")).toHaveCount(0);

  // 4. A real partial claim, with the arithmetic shown.
  await page.getByTestId("message").fill(CRACKED_MUG);
  await page.getByTestId("read-message").click();
  await expect(page.getByTestId("arithmetic")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("approve")).toBeVisible();

  // 5. Approve. The receipt comes from PayPal, read back.
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("refund-id")).not.toBeEmpty({ timeout: 60_000 });
  await expect(page.getByTestId("refund-status")).toHaveText(/COMPLETED|PENDING/);

  // 6. Reloaded from PayPal: less left to refund.
  await expect(page.getByTestId("capture-status").first()).toHaveText("PARTIALLY_REFUNDED");
});
