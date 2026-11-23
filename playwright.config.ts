// Playwright against the built site (out/), served the way Static Web Apps serves it (tests/serve.mjs).
// Run `npm run build` first. Two widths: desktop 1280 and phone 375.
// BASE_URL=https://<host> runs the same tests against a deployed site instead (no local server).
import { defineConfig } from "@playwright/test";

const PORT = 4321;
const BASE_URL = process.env.BASE_URL;
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: BASE_URL || `http://localhost:${PORT}`, browserName: "chromium" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: BASE_URL ? undefined : { command: `node tests/serve.mjs ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI },
});
