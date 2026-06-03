import { test, expect } from "@playwright/test";

test.describe("public · auth screens", () => {
  test("sign-in renders and surfaces an error (no successful login with dummy creds)", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Work email").fill("nobody@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Works whether Supabase is unconfigured ("not configured") or rejects creds:
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("sign-up renders and links back to sign-in", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your organization/i })).toBeVisible();
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("forgot-password flow is reachable", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot$/);
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
  });

  test("protected app route redirects anonymous users to sign-in", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/signin$/);
  });
});
