# Test info

- Name: Splash to Chat Flow >> navigates from splash page to chat
- Location: C:\Users\rrome\Documents\Development\Convex-AI-Auto-Detailing\e2e\splash-to-chat.spec.ts:4:7

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
   2 |
   3 | test.describe("Splash to Chat Flow", () => {
>  4 |   test("navigates from splash page to chat", async ({ page }) => {
     |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\rrome\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   5 |     // Go to splash page
   6 |     await page.goto("/")
   7 |
   8 |     // Wait for loading to complete
   9 |     await page.waitForSelector("text=Enter Experience", { timeout: 15000 })
  10 |
  11 |     // Click enter button
  12 |     await page.click("text=Enter Experience")
  13 |
  14 |     // Should navigate to home page
  15 |     await expect(page).toHaveURL("/home")
  16 |
  17 |     // Check home page content
  18 |     await expect(page.locator("h1")).toContainText("AI-Powered Auto Detailing Assistant")
  19 |
  20 |     // Navigate to chat
  21 |     await page.click("text=Chat with Assistant")
  22 |
  23 |     // Should be on chat page
  24 |     await expect(page).toHaveURL("/chat")
  25 |     await expect(page.locator("h1")).toContainText("Auto Detailing Assistant")
  26 |   })
  27 |
  28 |   test("3D scene loads correctly", async ({ page }) => {
  29 |     await page.goto("/")
  30 |
  31 |     // Check if canvas is present (3D scene)
  32 |     const canvas = await page.locator("canvas")
  33 |     await expect(canvas).toBeVisible()
  34 |
  35 |     // Check loading animation
  36 |     await expect(page.locator("text=/Loading experience/")).toBeVisible()
  37 |   })
  38 | })
  39 |
\`\`\`
