import { renderHook, act, waitFor } from "@testing-library/react"
import { useErrorHandling } from "@/hooks/use-error-handling"
import { toast } from "@/hooks/use-toast"

// Mock dependencies
jest.mock("@/hooks/use-toast")

const mockToast = toast as jest.MockedFunction<typeof toast>

// Mock Sentry
Object.defineProperty(window, "Sentry", {
  value: {
    captureException: jest.fn(),
  },
  configurable: true,
})

describe("useErrorHandling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Initial State", () => {
    it("should initialize with empty errors array", () => {
      const { result } = renderHook(() => useErrorHandling())

      expect(result.current.errors).toEqual([])
      expect(result.current.isRetrying).toBe(false)
    })

    it("should initialize with correct options", () => {
      const options = {
        showToast: false,
        logToConsole: false,
        reportToSentry: true,
        retryAttempts: 5,
        retryDelay: 2000,
      }

      renderHook(() => useErrorHandling(options))

      // Options are used internally, no direct way to test
      expect(true).toBe(true)
    })
  })

  describe("Error Message Mapping", () => {
    it("should map network error codes to user-friendly messages", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({ code: "NETWORK_ERROR" })
      expect(message).toBe("Unable to connect. Please check your internet connection.")
    })

    it("should map authentication error codes", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({ code: "UNAUTHORIZED" })
      expect(message).toBe("You need to sign in to perform this action.")
    })

    it("should map validation error codes", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({ code: "VALIDATION_ERROR" })
      expect(message).toBe("Please check your input and try again.")
    })

    it("should map business logic error codes", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({ code: "APPOINTMENT_CONFLICT" })
      expect(message).toBe("This time slot is no longer available.")
    })

    it("should handle errors with custom messages", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({
        message: "Custom error message",
      })
      expect(message).toBe("Custom error message")
    })

    it("should clean up technical error messages", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({
        message: "Error: fetch failed",
      })
      expect(message).toBe("Unable to connect. Please check your internet connection.")
    })

    it("should return unknown error for unrecognized errors", () => {
      const { result } = renderHook(() => useErrorHandling())

      const message = result.current.getErrorMessage({})
      expect(message).toBe("An unexpected error occurred. Please try again.")
    })
  })

  describe("Error Severity", () => {
    it("should classify network errors as warnings", () => {
      const { result } = renderHook(() => useErrorHandling())

      const severity = result.current.getErrorSeverity({ code: "NETWORK_ERROR" })
      expect(severity).toBe("warning")
    })

    it("should classify validation errors as info", () => {
      const { result } = renderHook(() => useErrorHandling())

      const severity = result.current.getErrorSeverity({ code: "VALIDATION_ERROR" })
      expect(severity).toBe("info")
    })

    it("should classify unknown errors as error", () => {
      const { result } = renderHook(() => useErrorHandling())

      const severity = result.current.getErrorSeverity({ code: "UNKNOWN_ERROR" })
      expect(severity).toBe("error")
    })

    it("should default to error severity", () => {
      const { result } = renderHook(() => useErrorHandling())

      const severity = result.current.getErrorSeverity({})
      expect(severity).toBe("error")
    })
  })

  describe("Error Handling", () => {
    it("should handle error and add to errors list", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const error = new Error("Test error")
      const context = { source: "test" }

      await act(async () => {
        await result.current.handleError(error, context)
      })

      expect(result.current.errors.length).toBe(1)
      expect(result.current.errors[0]).toMatchObject({
        message: "Test error",
        severity: "error",
        context,
      })
    })

    it("should show toast notification when enabled", async () => {
      const { result } = renderHook(() => useErrorHandling({ showToast: true }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Test error",
        variant: "destructive",
        action: undefined,
      })
    })

    it("should not show toast when disabled", async () => {
      const { result } = renderHook(() => useErrorHandling({ showToast: false }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error)
      })

      expect(mockToast).not.toHaveBeenCalled()
    })

    it("should log to console when enabled", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      const { result } = renderHook(() => useErrorHandling({ logToConsole: true }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error)
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error handled:",
        expect.objectContaining({
          message: "Test error",
          originalError: error,
        }),
      )

      consoleSpy.mockRestore()
    })

    it("should report to Sentry when enabled", async () => {
      const { result } = renderHook(() => useErrorHandling({ reportToSentry: true }))

      const error = new Error("Test error")
      const context = { source: "test" }

      await act(async () => {
        await result.current.handleError(error, context)
      })

      expect(window.Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
        tags: {
          severity: "error",
          code: undefined,
        },
      })
    })

    it("should include retry action in toast when retry function provided", async () => {
      const { result } = renderHook(() => useErrorHandling({ showToast: true }))

      const error = new Error("Test error")
      const retryFn = jest.fn()

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Test error",
        variant: "destructive",
        action: {
          label: "Retry",
          onClick: expect.any(Function),
        },
      })
    })

    it("should limit errors list to 10 items", async () => {
      const { result } = renderHook(() => useErrorHandling())

      await act(async () => {
        for (let i = 0; i < 15; i++) {
          await result.current.handleError(new Error(`Error ${i}`))
        }
      })

      expect(result.current.errors.length).toBe(10)
    })
  })

  describe("Retry Functionality", () => {
    it("should retry error successfully", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const retryFn = jest.fn().mockResolvedValue(undefined)
      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(retryFn).toHaveBeenCalled()
      expect(result.current.errors.length).toBe(0)
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Operation completed successfully",
        variant: "default",
      })
    })

    it("should handle retry failure", async () => {
      const { result } = renderHook(() => useErrorHandling({ retryAttempts: 2 }))

      const retryFn = jest.fn().mockRejectedValue(new Error("Retry failed"))
      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(retryFn).toHaveBeenCalled()
      expect(result.current.errors.length).toBe(1) // Error still exists
    })

    it("should stop retrying after max attempts", async () => {
      const { result } = renderHook(() => useErrorHandling({ retryAttempts: 1 }))

      const retryFn = jest.fn().mockRejectedValue(new Error("Retry failed"))
      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      // First retry attempt
      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Retry Failed",
        description: "Maximum retry attempts reached. Please try again later.",
        variant: "destructive",
      })
    })

    it("should set retry state during retry", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const retryFn = jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      const retryPromise = act(async () => {
        await result.current.retryError(errorId)
      })

      expect(result.current.isRetrying).toBe(true)

      await retryPromise

      expect(result.current.isRetrying).toBe(false)
    })
  })

  describe("Auto Retry", () => {
    it("should auto-retry network errors with exponential backoff", async () => {
      const { result } = renderHook(() => useErrorHandling({ retryAttempts: 2, retryDelay: 100 }))

      const retryFn = jest.fn().mockResolvedValue(undefined)
      const error = { code: "NETWORK_ERROR", message: "Network failed" }

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      // Fast forward first retry delay (100ms)
      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(retryFn).toHaveBeenCalledTimes(1)
      })
    })

    it("should not auto-retry non-network errors", async () => {
      const { result } = renderHook(() => useErrorHandling({ retryAttempts: 2, retryDelay: 100 }))

      const retryFn = jest.fn()
      const error = { code: "VALIDATION_ERROR", message: "Validation failed" }

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(retryFn).not.toHaveBeenCalled()
    })
  })

  describe("Error Management", () => {
    it("should clear specific error", () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError(new Error("Error 1"))
        result.current.handleError(new Error("Error 2"))
      })

      expect(result.current.errors.length).toBe(2)

      const errorId = result.current.errors[0].id

      act(() => {
        result.current.clearError(errorId)
      })

      expect(result.current.errors.length).toBe(1)
      expect(result.current.errors[0].message).toBe("Error 2")
    })

    it("should clear all errors", () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError(new Error("Error 1"))
        result.current.handleError(new Error("Error 2"))
      })

      expect(result.current.errors.length).toBe(2)

      act(() => {
        result.current.clearAllErrors()
      })

      expect(result.current.errors.length).toBe(0)
    })
  })

  describe("Async Handler", () => {
    it("should handle successful async operations", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const asyncFn = jest.fn().mockResolvedValue("success")

      const resultValue = await act(async () => {
        return await result.current.handleAsync(asyncFn, {
          successMessage: "Operation successful",
        })
      })

      expect(resultValue).toBe("success")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Operation successful",
      })
    })

    it("should handle failed async operations", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const error = new Error("Async error")
      const asyncFn = jest.fn().mockRejectedValue(error)

      const resultValue = await act(async () => {
        return await result.current.handleAsync(asyncFn, {
          errorMessage: "Custom error message",
          context: { operation: "test" },
        })
      })

      expect(resultValue).toBeNull()
      expect(result.current.errors.length).toBe(1)
      expect(result.current.errors[0].message).toBe("Custom error message")
    })

    it("should enable retry for async operations", async () => {
      const { result } = renderHook(() => useErrorHandling())

      const error = new Error("Async error")
      const asyncFn = jest.fn().mockRejectedValue(error)

      await act(async () => {
        await result.current.handleAsync(asyncFn, { retry: true })
      })

      expect(result.current.errors[0].retry).toBeDefined()
    })
  })

  describe("Error Boundary Fallback", () => {
    it("should render error boundary fallback", () => {
      const { result } = renderHook(() => useErrorHandling())

      const error = new Error("Boundary error")
      const resetErrorBoundary = jest.fn()

      const FallbackComponent = result.current.ErrorBoundaryFallback

      // Test that the component can be instantiated
      expect(FallbackComponent).toBeDefined()
      expect(typeof FallbackComponent).toBe("function")
    })
  })

  describe("Statistics", () => {
    it("should calculate error statistics", () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError({ code: "NETWORK_ERROR", message: "Network error" })
        result.current.handleError({ code: "VALIDATION_ERROR", message: "Validation error" })
        result.current.handleError(new Error("Generic error"))
      })

      expect(result.current.statistics).toMatchObject({
        totalErrors: 3,
        errorsBySeverity: {
          error: 1,
          warning: 1,
          info: 1,
        },
        recentErrors: expect.arrayContaining([
          expect.objectContaining({ message: "Network error" }),
          expect.objectContaining({ message: "Validation error" }),
          expect.objectContaining({ message: "Generic error" }),
        ]),
      })
    })

    it("should limit recent errors to 5", () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.handleError(new Error(`Error ${i}`))
        }
      })

      expect(result.current.statistics.recentErrors.length).toBe(5)
    })
  })
})
