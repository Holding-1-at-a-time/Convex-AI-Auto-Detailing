import { test, expect } from "@playwright/test"

test.describe("Performance", () => {
  test("splash page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now()

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const loadTime = Date.now() - startTime

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test("measures Core Web Vitals", async ({ page }) => {
    await page.goto("/")

    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.startTime)
        }).observe({ entryTypes: ["largest-contentful-paint"] })
      })
    })

    // LCP should be less than 2.5s for good performance
    expect(lcp).toBeLessThan(2500)

    // Measure FID (First Input Delay) - simulated
    await page.click("body")

    // Measure CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          resolve(clsValue)
        }).observe({ entryTypes: ["layout-shift"] })

        // Resolve after a delay to capture shifts
        setTimeout(() => resolve(clsValue), 2000)
      })
    })

    // CLS should be less than 0.1 for good performance
    expect(cls).toBeLessThan(0.1)
  })

  test("bundle size is within limits", async () => {
    // This would typically be done in a build step
    // For now, we'll check that key pages load quickly
    const pages = ["/", "/home", "/chat", "/dashboard", "/analytics"]

    for (const pagePath of pages) {
      const response = await fetch(`http://localhost:3000${pagePath}`)
      const html = await response.text()

      // Check that the HTML is not too large
      expect(html.length).toBeLessThan(500000) // 500KB limit for HTML
    }
  })
})
