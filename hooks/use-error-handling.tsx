"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, XCircle, AlertTriangle } from "lucide-react"

interface ErrorDetails {
  id: string
  message: string
  code?: string
  severity: "error" | "warning" | "info"
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  retry?: () => Promise<void>
}

interface ErrorHandlingOptions {
  showToast?: boolean
  logToConsole?: boolean
  reportToSentry?: boolean
  retryAttempts?: number
  retryDelay?: number
}

/**
 * Custom hook to handle and display error messages
 *
 * Features:
 * - Centralized error management
 * - Error categorization and severity levels
 * - Automatic retry logic
 * - Error reporting and logging
 * - User-friendly error messages
 *
 * @param options - Configuration options for error handling
 * @returns Error handling utilities and state
 */
export function useErrorHandling(options: ErrorHandlingOptions = {}) {
  const {
    showToast = true,
    logToConsole = true,
    reportToSentry = false,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options

  // State
  const [errors, setErrors] = useState<ErrorDetails[]>([])
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCountRef = useRef<Map<string, number>>(new Map())

  /**
   * Map error codes to user-friendly messages
   */
  const getErrorMessage = useCallback((error: any): string => {
    // Common error mappings
    const errorMappings: Record<string, string> = {
      // Network errors
      NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
      TIMEOUT: "Request timed out. Please try again.",
      OFFLINE: "You appear to be offline. Please check your connection.",

      // Authentication errors
      UNAUTHORIZED: "You need to sign in to perform this action.",
      FORBIDDEN: "You don't have permission to perform this action.",
      SESSION_EXPIRED: "Your session has expired. Please sign in again.",

      // Validation errors
      VALIDATION_ERROR: "Please check your input and try again.",
      INVALID_INPUT: "The information provided is invalid.",
      REQUIRED_FIELD: "Please fill in all required fields.",

      // Business logic errors
      APPOINTMENT_CONFLICT: "This time slot is no longer available.",
      DOUBLE_BOOKING: "This time slot has already been booked.",
      OUTSIDE_BUSINESS_HOURS: "Selected time is outside business hours.",
      SERVICE_UNAVAILABLE: "This service is currently unavailable.",

      // Database errors
      NOT_FOUND: "The requested item could not be found.",
      ALREADY_EXISTS: "This item already exists.",
      DATABASE_ERROR: "A database error occurred. Please try again.",

      // Generic errors
      UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
      SERVER_ERROR: "Server error. Our team has been notified.",
    }

    // Check for error code
    if (error.code && errorMappings[error.code]) {
      return errorMappings[error.code]
    }

    // Check for specific error messages
    if (error.message) {
      // Clean up technical error messages
      if (error.message.includes("fetch failed")) {
        return errorMappings.NETWORK_ERROR
      }
      if (error.message.includes("unauthorized") || error.message.includes("Unauthorized")) {
        return errorMappings.UNAUTHORIZED
      }
      if (error.message.includes("validation") || error.message.includes("Validation")) {
        return errorMappings.VALIDATION_ERROR
      }

      // Return cleaned message
      return error.message.replace(/Error:\s*/i, "")
    }

    return errorMappings.UNKNOWN_ERROR
  }, [])

  /**
   * Get error severity based on error type
   */
  const getErrorSeverity = useCallback((error: any): "error" | "warning" | "info" => {
    if (error.code) {
      // Network and auth errors are warnings
      if (["NETWORK_ERROR", "TIMEOUT", "OFFLINE", "SESSION_EXPIRED"].includes(error.code)) {
        return "warning"
      }
      // Validation errors are info
      if (["VALIDATION_ERROR", "INVALID_INPUT", "REQUIRED_FIELD"].includes(error.code)) {
        return "info"
      }
    }

    // Default to error
    return "error"
  }, [])

  /**
   * Handle error with retry logic
   */
  const handleError = useCallback(
    async (error: any, context?: Record<string, any>, retryFn?: () => Promise<void>): Promise<void> => {
      const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const message = getErrorMessage(error)
      const severity = getErrorSeverity(error)

      const errorDetails: ErrorDetails = {
        id: errorId,
        message,
        code: error.code,
        severity,
        timestamp: new Date(),
        context,
        stack: error.stack,
        retry: retryFn,
      }

      // Add to error list
      setErrors((prev) => [errorDetails, ...prev].slice(0, 10)) // Keep last 10 errors

      // Log to console
      if (logToConsole) {
        console.error("Error handled:", {
          ...errorDetails,
          originalError: error,
        })
      }

      // Report to Sentry
      if (reportToSentry && typeof window !== "undefined" && (window as any).Sentry) {
        ;(window as any).Sentry.captureException(error, {
          extra: context,
          tags: {
            severity,
            code: error.code,
          },
        })
      }

      // Show toast notification
      if (showToast) {
        const Icon = severity === "error" ? XCircle : severity === "warning" ? AlertTriangle : AlertCircle

        toast({
          title: severity === "error" ? "Error" : severity === "warning" ? "Warning" : "Notice",
          description: message,
          variant: severity === "error" ? "destructive" : "default",
          action: retryFn
            ? {
                label: "Retry",
                onClick: () => retryError(errorId),
              }
            : undefined,
        })
      }

      // Auto-retry for network errors
      if (retryFn && error.code && ["NETWORK_ERROR", "TIMEOUT"].includes(error.code)) {
        const retryCount = retryCountRef.current.get(errorId) || 0
        if (retryCount < retryAttempts) {
          setTimeout(() => {
            retryError(errorId)
          }, retryDelay * Math.pow(2, retryCount)) // Exponential backoff
        }
      }
    },
    [getErrorMessage, getErrorSeverity, logToConsole, reportToSentry, showToast, retryAttempts, retryDelay],
  )

  /**
   * Retry a failed operation
   */
  const retryError = useCallback(
    async (errorId: string) => {
      const error = errors.find((e) => e.id === errorId)
      if (!error || !error.retry) return

      const retryCount = retryCountRef.current.get(errorId) || 0
      retryCountRef.current.set(errorId, retryCount + 1)

      setIsRetrying(true)

      try {
        await error.retry()

        // Success - remove error and show success message
        setErrors((prev) => prev.filter((e) => e.id !== errorId))
        retryCountRef.current.delete(errorId)

        toast({
          title: "Success",
          description: "Operation completed successfully",
          variant: "default",
        })
      } catch (retryError) {
        // Retry failed
        if (retryCount + 1 >= retryAttempts) {
          // Max retries reached
          toast({
            title: "Retry Failed",
            description: "Maximum retry attempts reached. Please try again later.",
            variant: "destructive",
          })
          retryCountRef.current.delete(errorId)
        } else {
          // Will retry again
          handleError(retryError, { retryCount: retryCount + 1 }, error.retry)
        }
      } finally {
        setIsRetrying(false)
      }
    },
    [errors, retryAttempts, handleError],
  )

  /**
   * Clear a specific error
   */
  const clearError = useCallback((errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId))
    retryCountRef.current.delete(errorId)
  }, [])

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors([])
    retryCountRef.current.clear()
  }, [])

  /**
   * Handle async operations with error handling
   */
  const handleAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: {
        context?: Record<string, any>
        successMessage?: string
        errorMessage?: string
        retry?: boolean
      },
    ): Promise<T | null> => {
      try {
        const result = await asyncFn()

        if (options?.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          })
        }

        return result
      } catch (error) {
        const retryFn = options?.retry ? () => asyncFn() : undefined

        await handleError(
          {
            ...error,
            message: options?.errorMessage || (error as Error).message,
          },
          options?.context,
          retryFn,
        )

        return null
      }
    },
    [handleError],
  )

  /**
   * Create error boundary fallback
   */
  const ErrorBoundaryFallback = useCallback(
    ({ error, resetErrorBoundary }: any) => {
      const [handledError, setHandledError] = useState(false)

      useEffect(() => {
        if (!handledError) {
          handleError(error, { source: "ErrorBoundary" })
          setHandledError(true)
        }
      }, [error, handledError, handleError])

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-center mb-4 max-w-md">{getErrorMessage(error)}</p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      )
    },
    [handleError, getErrorMessage],
  )

  /**
   * Get error statistics
   */
  const statistics = {
    totalErrors: errors.length,
    errorsBySeverity: {
      error: errors.filter((e) => e.severity === "error").length,
      warning: errors.filter((e) => e.severity === "warning").length,
      info: errors.filter((e) => e.severity === "info").length,
    },
    recentErrors: errors.slice(0, 5),
  }

  return {
    // State
    errors,
    isRetrying,
    statistics,

    // Functions
    handleError,
    handleAsync,
    retryError,
    clearError,
    clearAllErrors,

    // Utilities
    getErrorMessage,
    getErrorSeverity,
    ErrorBoundaryFallback,
  }
}
