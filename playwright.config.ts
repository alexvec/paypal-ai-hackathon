import { defineConfig } from "@playwright/test";

/**
 * Walks docs/demo-path.md. Headed and slow for recording:
 *   DEMO_URL=https://paypal-ai-hackathon-phi.vercel.app DEMO_SLOWMO=600 DEMO_VIDEO=1 npm run demo:walk -- --headed
 * With no DEMO_URL it starts the app locally on port 3100.
 */
const remote = process.env.DEMO_URL;

export default defineConfig({
  testDir: "./e2e",
  // The buyer's approval in PayPal is a human step with a 10 minute allowance.
  timeout: 15 * 60 * 1000,
  use: {
    baseURL: remote ?? "http://localhost:3100",
    viewport: { width: 1280, height: 800 },
    video: process.env.DEMO_VIDEO ? "on" : "off",
    launchOptions: { slowMo: Number(process.env.DEMO_SLOWMO ?? 0) },
  },
  webServer: remote ? undefined : { command: "npx next dev -p 3100", url: "http://localhost:3100/api/health", reuseExistingServer: true, timeout: 120_000 },
});
