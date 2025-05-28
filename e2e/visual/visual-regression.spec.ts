import { test, expect } from "@playwright/test"

test.describe("Visual Regression", () => {
  test("splash page visual appearance", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("text=Enter Experience", { timeout: 15000 })

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot("splash-page.png", {
      maxDiffPixelRatio: 0.01,
    })
  })

  test("home page visual appearance", async ({ page }) => {
    await page.goto("/home")

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot("home-page.png", {
      maxDiffPixelRatio: 0.01,
    })
  })

  test("chat page visual appearance", async ({ page }) => {
    await page.goto("/chat")

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot("chat-page.png", {
      maxDiffPixelRatio: 0.01,
    })
  })

  test("dashboard page visual appearance", async ({ page }) => {
    await page.goto("/dashboard")

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot("dashboard-page.png", {
      maxDiffPixelRatio: 0.01,
    })
  })

  test("responsive design - mobile", async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 })

    // Check home page
    await page.goto("/home")
    await expect(page).toHaveScreenshot("home-page-mobile.png", {
      maxDiffPixelRatio: 0.01,
    })

    // Check chat page
    await page.goto("/chat")
    await expect(page).toHaveScreenshot("chat-page-mobile.png", {
      maxDiffPixelRatio: 0.01,
    })
  })

  test("responsive design - tablet", async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 })

    // Check home page
    await page.goto("/home")
    await expect(page).toHaveScreenshot("home-page-tablet.png", {
      maxDiffPixelRatio: 0.01,
    })

    // Check chat page
    await page.goto("/chat")
    await expect(page).toHaveScreenshot("chat-page-tablet.png", {
      maxDiffPixelRatio: 0.01,
    })
  })
})
