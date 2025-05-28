import { test, expect } from "@playwright/test"

test.describe("Chat Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat")
  })

  test("sends and receives messages", async ({ page }) => {
    // Type a message
    const input = page.locator('input[placeholder*="Ask about auto detailing"]')
    await input.fill("How do I remove scratches from my car?")

    // Send the message
    await page.click('button[aria-label="Send"]')

    // Check that the message appears
    await expect(page.locator("text=How do I remove scratches from my car?")).toBeVisible()

    // Wait for response (mocked in development)
    await expect(page.locator("text=Auto Detailing Assistant")).toBeVisible()
  })

  test("switches between chat and upload tabs", async ({ page }) => {
    // Check chat tab is active
    await expect(page.locator('[data-value="chat"][data-state="active"]')).toBeVisible()

    // Switch to upload tab
    await page.click("text=Upload Data")

    // Check upload tab is active
    await expect(page.locator('[data-value="upload"][data-state="active"]')).toBeVisible()

    // Check upload form is visible
    await expect(page.locator('label:has-text("Vehicle Make")')).toBeVisible()
  })

  test("uploads vehicle data", async ({ page }) => {
    // Switch to upload tab
    await page.click("text=Upload Data")

    // Fill in the form
    await page.fill('input[name="make"]', "Honda")
    await page.fill('input[name="model"]', "Accord")
    await page.fill('input[name="year"]', "2023")
    await page.fill('textarea[name="notes"]', "Silver color, needs interior detailing")

    // Save the data
    await page.click("text=Save Vehicle Data")

    // Check for success message or navigation
    await expect(page.locator("text=/Success|saved/i")).toBeVisible({ timeout: 10000 })
  })
})
