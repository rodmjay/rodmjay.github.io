// Playwright against the built site (out/), served the way Static Web Apps serves it (tests/serve.mjs).
// Run `npm run build` first. Two widths: desktop 1280 and phone 375.
import { defineConfig } from "@playwright/test";

const PORT = 4321;
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, browserName: "chromium" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: `node tests/serve.mjs ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI },
});
