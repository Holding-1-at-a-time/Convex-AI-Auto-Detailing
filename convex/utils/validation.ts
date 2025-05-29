/**
 * Comprehensive validation utilities for data integrity
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Phone validation regex (supports various formats)
const PHONE_REGEX = /^[+]?[1-9][\d]{0,15}$/

// Time format validation (HH:MM)
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

// Date format validation (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

/**
 * Validate required fields
 */
export function validateRequired<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  return value
}

/**
 * Validate email format
 */
export function validateEmail(email: string, fieldName = "email"): string {
  if (!email) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName)
  }
  return email.trim().toLowerCase()
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string, fieldName = "phone"): string {
  if (!phone) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, "")

  if (!PHONE_REGEX.test(cleanPhone)) {
    throw new ValidationError(`Invalid ${fieldName} format. Use format: +1234567890`, fieldName)
  }

  return cleanPhone
}

/**
 * Validate time format (HH:MM)
 */
export function validateTime(time: string, fieldName = "time"): string {
  if (!time) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!TIME_REGEX.test(time)) {
    throw new ValidationError(`Invalid ${fieldName} format. Use HH:MM format`, fieldName)
  }
  return time
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(date: string, fieldName = "date"): string {
  if (!date) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!DATE_REGEX.test(date)) {
    throw new ValidationError(`Invalid ${fieldName} format. Use YYYY-MM-DD format`, fieldName)
  }

  // Check if date is valid
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName)
  }

  return date
}

/**
 * Validate that date is not in the past
 */
export function validateFutureDate(date: string, fieldName = "date"): string {
  validateDate(date, fieldName)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appointmentDate = new Date(date)
  appointmentDate.setHours(0, 0, 0, 0)

  if (appointmentDate < today) {
    throw new ValidationError(`${fieldName} cannot be in the past`, fieldName)
  }

  return date
}

/**
 * Validate time range (start time before end time)
 */
export function validateTimeRange(startTime: string, endTime: string): void {
  validateTime(startTime, "startTime")
  validateTime(endTime, "endTime")

  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)

  if (start >= end) {
    throw new ValidationError("Start time must be before end time")
  }

  // Validate minimum duration (15 minutes)
  if (end - start < 15) {
    throw new ValidationError("Minimum appointment duration is 15 minutes")
  }

  // Validate maximum duration (8 hours)
  if (end - start > 480) {
    throw new ValidationError("Maximum appointment duration is 8 hours")
  }
}

/**
 * Validate rating (1-5 scale)
 */
export function validateRating(rating: number, fieldName = "rating"): number {
  if (rating === undefined || rating === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError(`${fieldName} must be an integer between 1 and 5`, fieldName)
  }
  return rating
}

/**
 * Validate price (positive number)
 */
export function validatePrice(price: number, fieldName = "price"): number {
  if (price === undefined || price === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (typeof price !== "number" || price < 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName)
  }
  if (price > 10000) {
    throw new ValidationError(`${fieldName} cannot exceed $10,000`, fieldName)
  }
  return Math.round(price * 100) / 100 // Round to 2 decimal places
}

/**
 * Validate duration in minutes
 */
export function validateDuration(duration: number, fieldName = "duration"): number {
  if (duration === undefined || duration === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!Number.isInteger(duration) || duration < 15) {
    throw new ValidationError(`${fieldName} must be at least 15 minutes`, fieldName)
  }
  if (duration > 480) {
    throw new ValidationError(`${fieldName} cannot exceed 8 hours (480 minutes)`, fieldName)
  }
  return duration
}

/**
 * Validate day of week (0-6)
 */
export function validateDayOfWeek(day: number, fieldName = "dayOfWeek"): number {
  if (day === undefined || day === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new ValidationError(`${fieldName} must be an integer between 0 (Sunday) and 6 (Saturday)`, fieldName)
  }
  return day
}

/**
 * Validate appointment status
 */
export function validateAppointmentStatus(status: string): string {
  const validStatuses = ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show", "rescheduled"]
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid appointment status. Must be one of: ${validStatuses.join(", ")}`)
  }
  return status
}

/**
 * Validate notification type
 */
export function validateNotificationType(type: string): string {
  const validTypes = [
    "appointment_confirmation",
    "appointment_reminder",
    "appointment_cancelled",
    "appointment_rescheduled",
    "feedback_request",
    "system_update",
    "marketing",
  ]
  if (!validTypes.includes(type)) {
    throw new ValidationError(`Invalid notification type. Must be one of: ${validTypes.join(", ")}`)
  }
  return type
}

/**
 * Validate notification priority
 */
export function validateNotificationPriority(priority: string): string {
  const validPriorities = ["low", "medium", "high", "urgent"]
  if (!validPriorities.includes(priority)) {
    throw new ValidationError(`Invalid notification priority. Must be one of: ${validPriorities.join(", ")}`)
  }
  return priority
}

/**
 * Validate business hours
 */
export function validateBusinessHours(
  openTime: string,
  closeTime: string,
  breakTimes?: Array<{ startTime: string; endTime: string }>,
): void {
  validateTime(openTime, "openTime")
  validateTime(closeTime, "closeTime")

  const open = parseTimeToMinutes(openTime)
  const close = parseTimeToMinutes(closeTime)

  if (open >= close) {
    throw new ValidationError("Open time must be before close time")
  }

  // Validate minimum business hours (1 hour)
  if (close - open < 60) {
    throw new ValidationError("Business must be open for at least 1 hour")
  }

  // Validate maximum business hours (24 hours)
  if (close - open > 1440) {
    throw new ValidationError("Business hours cannot exceed 24 hours")
  }

  // Validate break times if provided
  if (breakTimes && breakTimes.length > 0) {
    for (const breakTime of breakTimes) {
      validateTime(breakTime.startTime, "break startTime")
      validateTime(breakTime.endTime, "break endTime")

      const breakStart = parseTimeToMinutes(breakTime.startTime)
      const breakEnd = parseTimeToMinutes(breakTime.endTime)

      if (breakStart >= breakEnd) {
        throw new ValidationError("Break start time must be before break end time")
      }

      if (breakStart < open || breakEnd > close) {
        throw new ValidationError("Break times must be within business hours")
      }
    }

    // Check for overlapping break times
    for (let i = 0; i < breakTimes.length; i++) {
      for (let j = i + 1; j < breakTimes.length; j++) {
        const break1Start = parseTimeToMinutes(breakTimes[i].startTime)
        const break1End = parseTimeToMinutes(breakTimes[i].endTime)
        const break2Start = parseTimeToMinutes(breakTimes[j].startTime)
        const break2End = parseTimeToMinutes(breakTimes[j].endTime)

        if (
          (break1Start < break2End && break1End > break2Start) ||
          (break2Start < break1End && break2End > break1Start)
        ) {
          throw new ValidationError("Break times cannot overlap")
        }
      }
    }
  }
}

/**
 * Validate text length
 */
export function validateTextLength(text: string, minLength: number, maxLength: number, fieldName = "text"): string {
  if (!text) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  const trimmedText = text.trim()

  if (trimmedText.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName)
  }

  if (trimmedText.length > maxLength) {
    throw new ValidationError(`${fieldName} cannot exceed ${maxLength} characters`, fieldName)
  }

  return trimmedText
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName = "url"): string {
  if (!url) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  try {
    new URL(url)
    return url
  } catch {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName)
  }
}

/**
 * Validate appointment conflicts
 */
export function validateAppointmentConflict(
  existingAppointments: Array<{ startTime: string; endTime: string; _id?: string }>,
  newStartTime: string,
  newEndTime: string,
  excludeId?: string,
): void {
  const newStart = parseTimeToMinutes(newStartTime)
  const newEnd = parseTimeToMinutes(newEndTime)

  for (const appointment of existingAppointments) {
    // Skip if this is the same appointment being updated
    if (excludeId && appointment._id === excludeId) {
      continue
    }

    const existingStart = parseTimeToMinutes(appointment.startTime)
    const existingEnd = parseTimeToMinutes(appointment.endTime)

    // Check for overlap
    if ((newStart < existingEnd && newEnd > existingStart) || (existingStart < newEnd && existingEnd > newStart)) {
      throw new ValidationError(
        `Appointment conflicts with existing appointment from ${appointment.startTime} to ${appointment.endTime}`,
      )
    }
  }
}

/**
 * Helper function to parse time string to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Helper function to format minutes to time string
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

/**
 * Validate recurring pattern
 */
export function validateRecurringPattern(pattern: string): string {
  const validPatterns = ["daily", "weekly", "monthly"]
  if (!validPatterns.includes(pattern)) {
    throw new ValidationError(`Invalid recurring pattern. Must be one of: ${validPatterns.join(", ")}`)
  }
  return pattern
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): void {
  validateDate(startDate, "startDate")
  validateDate(endDate, "endDate")

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    throw new ValidationError("Start date must be before or equal to end date")
  }

  // Validate maximum date range (1 year)
  const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
  if (end.getTime() - start.getTime() > maxRange) {
    throw new ValidationError("Date range cannot exceed 1 year")
  }
}

/**
 * Validate staff specialties
 */
export function validateStaffSpecialties(specialties: string[]): string[] {
  const validSpecialties = [
    "exterior_wash",
    "interior_cleaning",
    "waxing",
    "polishing",
    "ceramic_coating",
    "paint_correction",
    "engine_cleaning",
    "headlight_restoration",
    "scratch_removal",
    "odor_removal",
  ]

  for (const specialty of specialties) {
    if (!validSpecialties.includes(specialty)) {
      throw new ValidationError(`Invalid specialty: ${specialty}. Must be one of: ${validSpecialties.join(", ")}`)
    }
  }

  return specialties
}

/**
 * Comprehensive appointment validation
 */
export function validateAppointmentData(data: {
  customerId: string
  date: string
  startTime: string
  endTime: string
  serviceType: string
  price?: number
  vehicleId?: string
  businessId?: string
  notes?: string
}): void {
  // Validate required fields
  validateRequired(data.customerId, "customerId")
  validateRequired(data.serviceType, "serviceType")

  // Validate date and time
  validateFutureDate(data.date)
  validateTimeRange(data.startTime, data.endTime)

  // Validate price if provided
  if (data.price !== undefined) {
    validatePrice(data.price)
  }

  // Validate notes length if provided
  if (data.notes) {
    validateTextLength(data.notes, 1, 1000, "notes")
  }

  // Validate service type
  validateTextLength(data.serviceType, 1, 100, "serviceType")
}

/**
 * Comprehensive feedback validation
 */
export function validateFeedbackData(data: {
  rating: number
  comment?: string
  serviceQuality?: number
  timeliness?: number
  professionalism?: number
  valueForMoney?: number
}): void {
  // Validate overall rating
  validateRating(data.rating)

  // Validate individual ratings if provided
  if (data.serviceQuality !== undefined) {
    validateRating(data.serviceQuality, "serviceQuality")
  }
  if (data.timeliness !== undefined) {
    validateRating(data.timeliness, "timeliness")
  }
  if (data.professionalism !== undefined) {
    validateRating(data.professionalism, "professionalism")
  }
  if (data.valueForMoney !== undefined) {
    validateRating(data.valueForMoney, "valueForMoney")
  }

  // Validate comment length if provided
  if (data.comment) {
    validateTextLength(data.comment, 1, 2000, "comment")
  }
}
