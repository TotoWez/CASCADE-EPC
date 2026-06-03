import { test, expect } from "@playwright/test";
import { hasBackend, login, ensureOrg, uniqueCode } from "../helpers/backend";

/**
 * End-to-end against a live Supabase TEST project. Skips unless
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD are set (see e2e/helpers/backend.ts).
 *
 * These run on the `desktop` project only (the inspector is a drawer on mobile).
 */
test.describe("app · live backend", () => {
  test.skip(!hasBackend, "set E2E_TEST_EMAIL/E2E_TEST_PASSWORD + a Supabase-backed dev server");
  test.skip((_, info) => info.project.name === "mobile", "desktop-only");

  test("signs in and loads the authenticated shell", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/app/);
    // Either the projects dashboard or onboarding renders.
    await expect(
      page.getByRole("heading", { name: "Projects" }).or(page.getByRole("heading", { name: /create your organization/i })),
    ).toBeVisible();
  });

  test("creates a project and opens the WBS workspace", async ({ page }) => {
    await login(page);
    await ensureOrg(page);

    const code = uniqueCode();
    await page.getByRole("button", { name: /new project/i }).click();
    await page.getByLabel("Project code").fill(code);
    await page.getByLabel("Project name").fill("E2E Smoke Project");
    await page.getByRole("button", { name: /create project/i }).click();

    // Card appears on the dashboard; open it.
    await page.getByText(code).first().click();
    await expect(page).toHaveURL(/\/app\/projects\//);

    // WBS workspace chrome is present.
    await expect(page.getByRole("button", { name: /expand all/i })).toBeVisible();
    await expect(page.getByText(/\d+ nodes/)).toBeVisible();

    // Build the first node (admin/manager can build).
    await page.getByRole("button", { name: "Root", exact: true }).click();
    await expect(page.getByText("New Root")).toBeVisible();

    // NOTE: deeper per-role / rollup / gate assertions can be layered here once
    // pointed at a known seed — the underlying logic is covered by Vitest unit tests.
  });
});
