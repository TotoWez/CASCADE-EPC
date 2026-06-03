import { test, expect } from "@playwright/test";

// Runs under both the `desktop` and `mobile` projects, so this asserts the
// public pages have no horizontal overflow at either viewport.
test.describe("public · responsive", () => {
  for (const path of ["/", "/signin", "/about"]) {
    test(`no horizontal overflow at ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2); // allow sub-pixel rounding
    });
  }
});
