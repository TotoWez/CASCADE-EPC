import type { Page } from "@playwright/test";

/**
 * Backend specs require:
 *  - the dev server running with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set
 *    (point them at a throwaway Supabase TEST project, not production), and
 *  - a pre-confirmed test user provided via E2E_TEST_EMAIL / E2E_TEST_PASSWORD.
 *
 * When the credentials are absent the backend specs skip, so `npm run e2e`
 * stays green with zero configuration.
 */
export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
export const hasBackend = Boolean(TEST_EMAIL && TEST_PASSWORD);

/** UI sign-in with the test user; resolves once the app shell is loaded. */
export async function login(page: Page): Promise<void> {
  await page.goto("/signin");
  await page.getByLabel("Work email").fill(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app/, { timeout: 15_000 });
}

/** Ensure the user has an org; create one through onboarding if needed. */
export async function ensureOrg(page: Page): Promise<void> {
  if (/create your organization/i.test(await page.locator("body").innerText())) {
    await page.getByLabel(/organization name/i).fill(`E2E Org ${Date.now()}`);
    await page.getByRole("button", { name: /create organization/i }).click();
    await page.getByRole("heading", { name: "Projects" }).waitFor();
  }
}

export const uniqueCode = () => `E2E-${Date.now().toString().slice(-6)}`;
