import { getCurrentTimestamp, parseTimestamp, formatDate, daysBetween } from "@/convex/utils"

describe("Convex Utils", () => {
  describe("getCurrentTimestamp", () => {
    it("returns ISO string timestamp", () => {
      const timestamp = getCurrentTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  describe("parseTimestamp", () => {
    it("parses ISO timestamp to Date object", () => {
      const timestamp = "2025-01-15T10:30:00.000Z"
      const date = parseTimestamp(timestamp)

      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(0) // January is 0
      expect(date.getDate()).toBe(15)
    })
  })

  describe("formatDate", () => {
    it("formats Date object to YYYY-MM-DD", () => {
      const date = new Date("2025-01-15T10:30:00.000Z")
      const formatted = formatDate(date)

      expect(formatted).toBe("2025-01-15")
    })

    it("formats date string to YYYY-MM-DD", () => {
      const dateString = "2025-01-15T10:30:00.000Z"
      const formatted = formatDate(dateString)

      expect(formatted).toBe("2025-01-15")
    })
  })

  describe("daysBetween", () => {
    it("calculates days between two dates", () => {
      const startDate = "2025-01-01T00:00:00.000Z"
      const endDate = "2025-01-15T00:00:00.000Z"
      const days = daysBetween(startDate, endDate)

      expect(days).toBe(14)
    })

    it("calculates days from date to current date when endDate not provided", () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      const days = daysBetween(startDate.toISOString())

      expect(days).toBe(7)
    })

    it("handles same day correctly", () => {
      const date = "2025-01-15T00:00:00.000Z"
      const days = daysBetween(date, date)

      expect(days).toBe(0)
    })
  })
})
