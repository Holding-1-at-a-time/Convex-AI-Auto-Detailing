import { test, expect } from "@playwright/test"

test.describe("Splash to Chat Flow", () => {
  test("navigates from splash page to chat", async ({ page }) => {
    // Go to splash page
    await page.goto("/")

    // Wait for loading to complete
    await page.waitForSelector("text=Enter Experience", { timeout: 15000 })

    // Click enter button
    await page.click("text=Enter Experience")

    // Should navigate to home page
    await expect(page).toHaveURL("/home")

    // Check home page content
    await expect(page.locator("h1")).toContainText("AI-Powered Auto Detailing Assistant")

    // Navigate to chat
    await page.click("text=Chat with Assistant")

    // Should be on chat page
    await expect(page).toHaveURL("/chat")
    await expect(page.locator("h1")).toContainText("Auto Detailing Assistant")
  })

  test("3D scene loads correctly", async ({ page }) => {
    await page.goto("/")

    // Check if canvas is present (3D scene)
    const canvas = await page.locator("canvas")
    await expect(canvas).toBeVisible()

    // Check loading animation
    await expect(page.locator("text=/Loading experience/")).toBeVisible()
  })
})
