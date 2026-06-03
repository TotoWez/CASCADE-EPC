import { test, expect } from "@playwright/test";

test.describe("public · theme", () => {
  test("toggles dark/light and persists across reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/); // SCADA default

    await page.getByRole("button", { name: /toggle theme/i }).first().click();
    await expect(html).toHaveClass(/light/);

    await page.reload();
    await expect(html).toHaveClass(/light/); // persisted via localStorage
  });
});
