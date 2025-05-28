# Test info

- Name: Visual Regression >> splash page visual appearance
- Location: C:\Users\rrome\Documents\Development\Convex-AI-Auto-Detailing\e2e\visual\visual-regression.spec.ts:4:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     pnpm exec playwright install                                        ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { test, expect } from "@playwright/test"
   2 |
   3 | test.describe("Visual Regression", () => {
>  4 |   test("splash page visual appearance", async ({ page }) => {
     |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   5 |     await page.goto("/")
   6 |     await page.waitForSelector("text=Enter Experience", { timeout: 15000 })
   7 |
   8 |     // Take a screenshot and compare with baseline
   9 |     await expect(page).toHaveScreenshot("splash-page.png", {
  10 |       maxDiffPixelRatio: 0.01,
  11 |     })
  12 |   })
  13 |
  14 |   test("home page visual appearance", async ({ page }) => {
  15 |     await page.goto("/home")
  16 |
  17 |     // Take a screenshot and compare with baseline
  18 |     await expect(page).toHaveScreenshot("home-page.png", {
  19 |       maxDiffPixelRatio: 0.01,
  20 |     })
  21 |   })
  22 |
  23 |   test("chat page visual appearance", async ({ page }) => {
  24 |     await page.goto("/chat")
  25 |
  26 |     // Take a screenshot and compare with baseline
  27 |     await expect(page).toHaveScreenshot("chat-page.png", {
  28 |       maxDiffPixelRatio: 0.01,
  29 |     })
  30 |   })
  31 |
  32 |   test("dashboard page visual appearance", async ({ page }) => {
  33 |     await page.goto("/dashboard")
  34 |
  35 |     // Take a screenshot and compare with baseline
  36 |     await expect(page).toHaveScreenshot("dashboard-page.png", {
  37 |       maxDiffPixelRatio: 0.01,
  38 |     })
  39 |   })
  40 |
  41 |   test("responsive design - mobile", async ({ page }) => {
  42 |     // Set viewport to mobile size
  43 |     await page.setViewportSize({ width: 375, height: 667 })
  44 |
  45 |     // Check home page
  46 |     await page.goto("/home")
  47 |     await expect(page).toHaveScreenshot("home-page-mobile.png", {
  48 |       maxDiffPixelRatio: 0.01,
  49 |     })
  50 |
  51 |     // Check chat page
  52 |     await page.goto("/chat")
  53 |     await expect(page).toHaveScreenshot("chat-page-mobile.png", {
  54 |       maxDiffPixelRatio: 0.01,
  55 |     })
  56 |   })
  57 |
  58 |   test("responsive design - tablet", async ({ page }) => {
  59 |     // Set viewport to tablet size
  60 |     await page.setViewportSize({ width: 768, height: 1024 })
  61 |
  62 |     // Check home page
  63 |     await page.goto("/home")
  64 |     await expect(page).toHaveScreenshot("home-page-tablet.png", {
  65 |       maxDiffPixelRatio: 0.01,
  66 |     })
  67 |
  68 |     // Check chat page
  69 |     await page.goto("/chat")
  70 |     await expect(page).toHaveScreenshot("chat-page-tablet.png", {
  71 |       maxDiffPixelRatio: 0.01,
  72 |     })
  73 |   })
  74 | })
  75 |
```