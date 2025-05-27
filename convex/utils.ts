/**
 * Utility functions for Convex operations
 */

/**
 * Get the current timestamp in ISO format
 * @returns ISO string timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Parse an ISO timestamp string to a Date object
 * @param timestamp ISO string timestamp
 * @returns Date object
 */
export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

/**
 * Format a date for display
 * @param date Date string or object
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toISOString().split("T")[0]
}

/**
 * Calculate days between two dates
 * @param startDate Start date string
 * @param endDate End date string (defaults to current date)
 * @returns Number of days between dates
 */
export function daysBetween(startDate: string, endDate?: string): number {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
