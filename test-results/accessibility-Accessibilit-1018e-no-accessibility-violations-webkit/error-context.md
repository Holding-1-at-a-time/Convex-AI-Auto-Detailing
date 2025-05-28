# Test info

- Name: Accessibility >> splash page has no accessibility violations
- Location: C:\Users\rrome\Documents\Development\Convex-AI-Auto-Detailing\e2e\accessibility.spec.ts:5:7

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
   2 | import { injectAxe, checkA11y } from "axe-playwright"
   3 |
   4 | test.describe("Accessibility", () => {
>  5 |   test("splash page has no accessibility violations", async ({ page }) => {
     |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   6 |     await page.goto("/")
   7 |     await injectAxe(page)
   8 |     await checkA11y(page, null, {
   9 |       detailedReport: true,
  10 |       detailedReportOptions: {
  11 |         html: true,
  12 |       },
  13 |     })
  14 |   })
  15 |
  16 |   test("home page has no accessibility violations", async ({ page }) => {
  17 |     await page.goto("/home")
  18 |     await injectAxe(page)
  19 |     await checkA11y(page, null, {
  20 |       detailedReport: true,
  21 |       detailedReportOptions: {
  22 |         html: true,
  23 |       },
  24 |     })
  25 |   })
  26 |
  27 |   test("chat page has no accessibility violations", async ({ page }) => {
  28 |     await page.goto("/chat")
  29 |     await injectAxe(page)
  30 |     await checkA11y(page, null, {
  31 |       detailedReport: true,
  32 |       detailedReportOptions: {
  33 |         html: true,
  34 |       },
  35 |     })
  36 |   })
  37 |
  38 |   test("keyboard navigation works", async ({ page }) => {
  39 |     await page.goto("/home")
  40 |
  41 |     // Tab through interactive elements
  42 |     await page.keyboard.press("Tab")
  43 |     await expect(page.locator(":focus")).toBeVisible()
  44 |
  45 |     // Continue tabbing and check focus is visible
  46 |     for (let i = 0; i < 5; i++) {
  47 |       await page.keyboard.press("Tab")
  48 |       await expect(page.locator(":focus")).toBeVisible()
  49 |     }
  50 |   })
  51 |
  52 |   test("screen reader content is present", async ({ page }) => {
  53 |     await page.goto("/chat")
  54 |
  55 |     // Check for screen reader only content
  56 |     const srOnlyElements = await page.locator(".sr-only").count()
  57 |     expect(srOnlyElements).toBeGreaterThan(0)
  58 |
  59 |     // Check ARIA labels
  60 |     await expect(page.locator("[aria-label]").first()).toBeVisible()
  61 |   })
  62 | })
  63 |
\`\`\`
