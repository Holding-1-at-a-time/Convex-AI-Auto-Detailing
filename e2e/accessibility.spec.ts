import { test, expect } from "@playwright/test"
import { injectAxe, checkA11y } from "axe-playwright"

test.describe("Accessibility", () => {
  test("splash page has no accessibility violations", async ({ page }) => {
    await page.goto("/")
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    })
  })

  test("home page has no accessibility violations", async ({ page }) => {
    await page.goto("/home")
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    })
  })

  test("chat page has no accessibility violations", async ({ page }) => {
    await page.goto("/chat")
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    })
  })

  test("keyboard navigation works", async ({ page }) => {
    await page.goto("/home")

    // Tab through interactive elements
    await page.keyboard.press("Tab")
    await expect(page.locator(":focus")).toBeVisible()

    // Continue tabbing and check focus is visible
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab")
      await expect(page.locator(":focus")).toBeVisible()
    }
  })

  test("screen reader content is present", async ({ page }) => {
    await page.goto("/chat")

    // Check for screen reader only content
    const srOnlyElements = await page.locator(".sr-only").count()
    expect(srOnlyElements).toBeGreaterThan(0)

    // Check ARIA labels
    await expect(page.locator("[aria-label]").first()).toBeVisible()
  })
})
