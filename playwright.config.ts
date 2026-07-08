import { defineConfig } from "@playwright/test";

/** E2E smoke suite. Expects the dev stack to be running:
 *    backend: uvicorn on :8000   frontend: next dev on :3000
 *  (see start.ps1). Override the frontend URL with PW_BASE_URL. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.PW_BASE_URL || "http://localhost:3000",
    // system Chrome: avoids downloading Playwright's bundled Chromium
    channel: "chrome",
    trace: "retain-on-failure",
  },
});
