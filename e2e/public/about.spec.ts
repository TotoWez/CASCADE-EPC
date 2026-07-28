import { test, expect } from "@playwright/test";

test.describe("public · about / help", () => {
  test("renders roles, keyboard map and a contact link", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: /cascade-epc/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /who does what/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /keyboard & interaction/i })).toBeVisible();
    // keyboard map includes the copy shortcut
    await expect(page.getByText("Ctrl / Cmd + C", { exact: true })).toBeVisible();
    // contact mailto
    const mailto = page.locator('a[href^="mailto:"]').first();
    await expect(mailto).toHaveAttribute("href", /hello@cascade-epc\.com/);
  });
});
