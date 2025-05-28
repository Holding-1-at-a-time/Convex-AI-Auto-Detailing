# Test info

- Name: Chat Interaction >> uploads vehicle data
- Location: C:\Users\rrome\Documents\Development\Convex-AI-Auto-Detailing\e2e\chat-interaction.spec.ts:37:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\chromium_headless_shell-1169\chrome-win\headless_shell.exe
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
   3 | test.describe("Chat Interaction", () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     await page.goto("/chat")
   6 |   })
   7 |
   8 |   test("sends and receives messages", async ({ page }) => {
   9 |     // Type a message
  10 |     const input = page.locator('input[placeholder*="Ask about auto detailing"]')
  11 |     await input.fill("How do I remove scratches from my car?")
  12 |
  13 |     // Send the message
  14 |     await page.click('button[aria-label="Send"]')
  15 |
  16 |     // Check that the message appears
  17 |     await expect(page.locator("text=How do I remove scratches from my car?")).toBeVisible()
  18 |
  19 |     // Wait for response (mocked in development)
  20 |     await expect(page.locator("text=Auto Detailing Assistant")).toBeVisible()
  21 |   })
  22 |
  23 |   test("switches between chat and upload tabs", async ({ page }) => {
  24 |     // Check chat tab is active
  25 |     await expect(page.locator('[data-value="chat"][data-state="active"]')).toBeVisible()
  26 |
  27 |     // Switch to upload tab
  28 |     await page.click("text=Upload Data")
  29 |
  30 |     // Check upload tab is active
  31 |     await expect(page.locator('[data-value="upload"][data-state="active"]')).toBeVisible()
  32 |
  33 |     // Check upload form is visible
  34 |     await expect(page.locator('label:has-text("Vehicle Make")')).toBeVisible()
  35 |   })
  36 |
> 37 |   test("uploads vehicle data", async ({ page }) => {
     |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\chromium_headless_shell-1169\chrome-win\headless_shell.exe
  38 |     // Switch to upload tab
  39 |     await page.click("text=Upload Data")
  40 |
  41 |     // Fill in the form
  42 |     await page.fill('input[name="make"]', "Honda")
  43 |     await page.fill('input[name="model"]', "Accord")
  44 |     await page.fill('input[name="year"]', "2023")
  45 |     await page.fill('textarea[name="notes"]', "Silver color, needs interior detailing")
  46 |
  47 |     // Save the data
  48 |     await page.click("text=Save Vehicle Data")
  49 |
  50 |     // Check for success message or navigation
  51 |     await expect(page.locator("text=/Success|saved/i")).toBeVisible({ timeout: 10000 })
  52 |   })
  53 | })
  54 |
```