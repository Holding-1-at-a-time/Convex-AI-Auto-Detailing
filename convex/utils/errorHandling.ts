// Error handling utilities
export class ConvexError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = "UNKNOWN_ERROR", statusCode = 500) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

export const errorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export function handleError(error: unknown): ConvexError {
  if (error instanceof ConvexError) {
    return error
  }

  if (error instanceof Error) {
    // Map common errors to appropriate codes
    if (error.message.includes("Unauthorized")) {
      return new ConvexError(error.message, errorCodes.UNAUTHORIZED, 401)
    }
    if (error.message.includes("not found")) {
      return new ConvexError(error.message, errorCodes.NOT_FOUND, 404)
    }
    if (error.message.includes("already exists")) {
      return new ConvexError(error.message, errorCodes.CONFLICT, 409)
    }

    return new ConvexError(error.message, errorCodes.INTERNAL_ERROR, 500)
  }

  return new ConvexError("An unknown error occurred", errorCodes.INTERNAL_ERROR, 500)
}

export function validateRequired<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new ConvexError(`${fieldName} is required`, errorCodes.VALIDATION_ERROR, 400)
  }
  return value
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ConvexError("Invalid email format", errorCodes.VALIDATION_ERROR, 400)
  }
  return email
}

export function validatePhone(phone: string): string {
  const phoneRegex = /^\+?[0-9]{10,15}$/
  if (!phoneRegex.test(phone.replace(/[^0-9+]/g, ""))) {
    throw new ConvexError("Invalid phone number format", errorCodes.VALIDATION_ERROR, 400)
  }
  return phone
}
