import { defineConfig } from "@playwright/test";

/**
 * Renders the screens that real PayPal data would fill, with API responses stubbed in the browser.
 * This checks the layout and wiring only. It says nothing about PayPal. Lives under tests/ on purpose.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../test-results/ui",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3101", viewport: { width: 1280, height: 900 } },
  webServer: {
    command: "npx next dev -p 3101",
    cwd: "../..",
    url: "http://localhost:3101/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PAYPAL_CLIENT_ID: "ui-test-only", PAYPAL_CLIENT_SECRET: "ui-test-only" },
  },
});
