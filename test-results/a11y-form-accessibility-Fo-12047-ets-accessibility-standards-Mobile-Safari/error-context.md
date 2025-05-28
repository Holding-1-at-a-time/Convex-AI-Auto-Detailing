# Test info

- Name: Form Accessibility >> chat form meets accessibility standards
- Location: C:\Users\rrome\Documents\Development\Convex-AI-Auto-Detailing\e2e\a11y\form-accessibility.spec.ts:5:7

# Error details

\`\`\`
Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     pnpm exec playwright install                                        ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
\`\`\`

# Test source

\`\`\`ts
   1 | import { test, expect } from "@playwright/test"
   2 | import AxeBuilder from "@axe-core/playwright"
   3 |
   4 | test.describe("Form Accessibility", () => {
>  5 |   test("chat form meets accessibility standards", async ({ page }) => {
     |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   6 |     await page.goto("/chat")
   7 |
   8 |     // Run accessibility tests
   9 |     const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
  10 |
  11 |     // Assert no violations
  12 |     expect(accessibilityScanResults.violations).toEqual([])
  13 |   })
  14 |
  15 |   test("vehicle upload form meets accessibility standards", async ({ page }) => {
  16 |     await page.goto("/chat")
  17 |
  18 |     // Switch to upload tab
  19 |     await page.click("text=Upload Data")
  20 |
  21 |     // Run accessibility tests
  22 |     const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
  23 |
  24 |     // Assert no violations
  25 |     expect(accessibilityScanResults.violations).toEqual([])
  26 |   })
  27 |
  28 |   test("form controls have proper labels", async ({ page }) => {
  29 |     await page.goto("/chat")
  30 |
  31 |     // Switch to upload tab
  32 |     await page.click("text=Upload Data")
  33 |
  34 |     // Check that form controls have labels
  35 |     const vehicleMakeLabel = await page.locator('label[for="vehicle-make"]')
  36 |     expect(await vehicleMakeLabel.isVisible()).toBeTruthy()
  37 |
  38 |     const vehicleModelLabel = await page.locator('label[for="vehicle-model"]')
  39 |     expect(await vehicleModelLabel.isVisible()).toBeTruthy()
  40 |
  41 |     const yearLabel = await page.locator('label[for="vehicle-year"]')
  42 |     expect(await yearLabel.isVisible()).toBeTruthy()
  43 |
  44 |     const notesLabel = await page.locator('label[for="notes"]')
  45 |     expect(await notesLabel.isVisible()).toBeTruthy()
  46 |   })
  47 |
  48 |   test("form is keyboard navigable", async ({ page }) => {
  49 |     await page.goto("/chat")
  50 |
  51 |     // Switch to upload tab
  52 |     await page.click("text=Upload Data")
  53 |
  54 |     // Focus on first input
  55 |     await page.focus('input[id="vehicle-make"]')
  56 |
  57 |     // Tab through form controls
  58 |     await page.keyboard.press("Tab")
  59 |     expect(await page.evaluate(() => document.activeElement?.id)).toBe("vehicle-model")
  60 |
  61 |     await page.keyboard.press("Tab")
  62 |     expect(await page.evaluate(() => document.activeElement?.id)).toBe("vehicle-year")
  63 |
  64 |     await page.keyboard.press("Tab")
  65 |     expect(await page.evaluate(() => document.activeElement?.id)).toBe("notes")
  66 |   })
  67 | })
  68 |
\`\`\`
