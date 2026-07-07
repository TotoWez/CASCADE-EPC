import { test, expect } from "@playwright/test";

test.describe("public · landing + routing", () => {
  /** On mobile the nav links live behind the hamburger — open it if present. */
  async function openNavIfMobile(page: import("@playwright/test").Page) {
    const burger = page.getByRole("button", { name: "Open menu" });
    if (await burger.isVisible()) await burger.click();
  }

  test("landing renders the brand, hero, features and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CASCADE-EPC/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("CASCADE");
    // feature cards (6)
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
    // shared footer
    await expect(page.getByText(/Plan it\. Track it\. CASCADE it\./i).last()).toBeVisible();
    // status legend chips
    await expect(page.getByText("Blocked", { exact: true }).first()).toBeVisible();
  });

  test("primary nav links route correctly", async ({ page }) => {
    await page.goto("/");
    await openNavIfMobile(page);
    await page.getByRole("link", { name: "Sign up", exact: true }).first().click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /create your organization/i })).toBeVisible();

    await page.goto("/");
    await openNavIfMobile(page);
    await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("unknown route shows the 404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/no path in the tree/i)).toBeVisible();
  });
});
