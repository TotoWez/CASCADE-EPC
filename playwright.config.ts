import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for CASCADE-EPC.
 *
 * Backend-free specs (e2e/public/**) run with no Supabase. Specs that need a
 * live backend (e2e/app/**) read E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY and
 * skip themselves when those are absent, so `npm run e2e` is always green.
 */
const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],

  // Vite dev server is started automatically (reused locally if already up).
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
