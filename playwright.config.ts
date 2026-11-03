import { defineConfig } from "@playwright/test";

/**
 * Walks docs/demo-path.md. Headed and slow for recording:
 *   npm run demo:walk -- --headed
 * Against a deployment:
 *   DEMO_URL=https://your-deployment npm run demo:walk
 */
const remote = process.env.DEMO_URL;
const slowMo = Number(process.env.DEMO_SLOWMO ?? 0);

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  use: {
    baseURL: remote ?? "http://localhost:3100",
    viewport: { width: 1280, height: 800 },
    video: process.env.DEMO_VIDEO ? "on" : "off",
    launchOptions: { slowMo },
  },
  webServer: remote ? undefined : { command: "npx next dev -p 3100", url: "http://localhost:3100/api/health", reuseExistingServer: true, timeout: 120_000 },
});
