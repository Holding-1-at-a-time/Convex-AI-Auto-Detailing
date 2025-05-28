import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test.describe("Form Accessibility", () => {
  test("chat form meets accessibility standards", async ({ page }) => {
    await page.goto("/chat")

    // Run accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test("vehicle upload form meets accessibility standards", async ({ page }) => {
    await page.goto("/chat")

    // Switch to upload tab
    await page.click("text=Upload Data")

    // Run accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test("form controls have proper labels", async ({ page }) => {
    await page.goto("/chat")

    // Switch to upload tab
    await page.click("text=Upload Data")

    // Check that form controls have labels
    const vehicleMakeLabel = await page.locator('label[for="vehicle-make"]')
    expect(await vehicleMakeLabel.isVisible()).toBeTruthy()

    const vehicleModelLabel = await page.locator('label[for="vehicle-model"]')
    expect(await vehicleModelLabel.isVisible()).toBeTruthy()

    const yearLabel = await page.locator('label[for="vehicle-year"]')
    expect(await yearLabel.isVisible()).toBeTruthy()

    const notesLabel = await page.locator('label[for="notes"]')
    expect(await notesLabel.isVisible()).toBeTruthy()
  })

  test("form is keyboard navigable", async ({ page }) => {
    await page.goto("/chat")

    // Switch to upload tab
    await page.click("text=Upload Data")

    // Focus on first input
    await page.focus('input[id="vehicle-make"]')

    // Tab through form controls
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("vehicle-model")

    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("vehicle-year")

    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("notes")
  })
})
