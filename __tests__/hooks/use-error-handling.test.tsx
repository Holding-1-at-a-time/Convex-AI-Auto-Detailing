import { act, waitFor } from "@testing-library/react"
import { useErrorHandling } from "@/hooks/use-error-handling"
import { renderHookWithProviders, mockToast } from "./test-utils"

// Mock dependencies
jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
}))

// Mock Sentry
const mockSentry = {
  captureException: jest.fn(),
}

Object.defineProperty(window, "Sentry", {
  value: mockSentry,
  configurable: true,
})

describe("useErrorHandling", () => {
  beforeEach(() => {
    mockToast.mockClear()
    mockSentry.captureException.mockClear()
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      expect(result.current.errors).toEqual([])
      expect(result.current.isRetrying).toBe(false)
      expect(result.current.statistics.totalErrors).toBe(0)
    })
  })

  describe("Error Message Mapping", () => {
    it("should map error codes to user-friendly messages", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      expect(result.current.getErrorMessage({ code: "NETWORK_ERROR" })).toBe(
        "Unable to connect. Please check your internet connection.",
      )

      expect(result.current.getErrorMessage({ code: "UNAUTHORIZED" })).toBe(
        "You need to sign in to perform this action.",
      )

      expect(result.current.getErrorMessage({ code: "VALIDATION_ERROR" })).toBe(
        "Please check your input and try again.",
      )
    })

    it("should handle errors with custom messages", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = { message: "Custom error message" }
      expect(result.current.getErrorMessage(error)).toBe("Custom error message")
    })

    it("should clean up technical error messages", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = { message: "Error: fetch failed" }
      expect(result.current.getErrorMessage(error)).toBe("Unable to connect. Please check your internet connection.")
    })

    it("should return default message for unknown errors", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = {}
      expect(result.current.getErrorMessage(error)).toBe("An unexpected error occurred. Please try again.")
    })
  })

  describe("Error Severity Detection", () => {
    it("should classify network errors as warnings", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      expect(result.current.getErrorSeverity({ code: "NETWORK_ERROR" })).toBe("warning")

      expect(result.current.getErrorSeverity({ code: "TIMEOUT" })).toBe("warning")
    })

    it("should classify validation errors as info", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      expect(result.current.getErrorSeverity({ code: "VALIDATION_ERROR" })).toBe("info")

      expect(result.current.getErrorSeverity({ code: "INVALID_INPUT" })).toBe("info")
    })

    it("should default to error severity", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      expect(result.current.getErrorSeverity({ code: "UNKNOWN_ERROR" })).toBe("error")

      expect(result.current.getErrorSeverity({})).toBe("error")
    })
  })

  describe("Error Handling", () => {
    it("should handle errors with toast notifications", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling({ showToast: true }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error)
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].message).toBe("Test error")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Test error",
        variant: "destructive",
        action: undefined,
      })
    })

    it("should handle errors without toast notifications", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling({ showToast: false }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error)
      })

      expect(result.current.errors).toHaveLength(1)
      expect(mockToast).not.toHaveBeenCalled()
    })

    it("should log errors to console when enabled", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      const { result } = renderHookWithProviders(() => useErrorHandling({ logToConsole: true }))

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

    it("should report errors to Sentry when enabled", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling({ reportToSentry: true }))

      const error = new Error("Test error")
      const context = { userId: "123" }

      await act(async () => {
        await result.current.handleError(error, context)
      })

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
        tags: {
          severity: "error",
          code: undefined,
        },
      })
    })

    it("should include retry action for retryable errors", async () => {
      const retryFn = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Test error",
        variant: "destructive",
        action: expect.objectContaining({
          label: "Retry",
        }),
      })
    })
  })

  describe("Retry Logic", () => {
    it("should retry failed operations", async () => {
      const retryFn = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(retryFn).toHaveBeenCalled()
      expect(result.current.errors).toHaveLength(0) // Error should be removed on success
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Operation completed successfully",
        variant: "default",
      })
    })

    it("should handle retry failures", async () => {
      const retryFn = jest.fn().mockRejectedValue(new Error("Retry failed"))
      const { result } = renderHookWithProviders(() => useErrorHandling({ retryAttempts: 1 }))

      const error = new Error("Test error")

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      const errorId = result.current.errors[0].id

      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Retry Failed",
        description: "Maximum retry attempts reached. Please try again later.",
        variant: "destructive",
      })
    })

    it("should auto-retry network errors", async () => {
      jest.useFakeTimers()

      const retryFn = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHookWithProviders(() => useErrorHandling({ retryAttempts: 2, retryDelay: 1000 }))

      const error = { code: "NETWORK_ERROR", message: "Network failed" }

      await act(async () => {
        await result.current.handleError(error, {}, retryFn)
      })

      // Fast-forward time to trigger auto-retry
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(retryFn).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })
  })

  describe("Error Management", () => {
    it("should clear specific errors", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error1 = new Error("Error 1")
      const error2 = new Error("Error 2")

      await act(async () => {
        await result.current.handleError(error1)
        await result.current.handleError(error2)
      })

      expect(result.current.errors).toHaveLength(2)

      const errorId = result.current.errors[0].id

      act(() => {
        result.current.clearError(errorId)
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].message).toBe("Error 2")
    })

    it("should clear all errors", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error1 = new Error("Error 1")
      const error2 = new Error("Error 2")

      await act(async () => {
        await result.current.handleError(error1)
        await result.current.handleError(error2)
      })

      expect(result.current.errors).toHaveLength(2)

      act(() => {
        result.current.clearAllErrors()
      })

      expect(result.current.errors).toHaveLength(0)
    })

    it("should limit error history to 10 items", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      // Add 15 errors
      for (let i = 0; i < 15; i++) {
        await act(async () => {
          await result.current.handleError(new Error(`Error ${i}`))
        })
      }

      expect(result.current.errors).toHaveLength(10)
      expect(result.current.errors[0].message).toBe("Error 14") // Most recent first
    })
  })

  describe("Async Operation Wrapper", () => {
    it("should handle successful async operations", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const asyncFn = jest.fn().mockResolvedValue("success")

      const resultValue = await act(async () => {
        return await result.current.handleAsync(asyncFn, {
          successMessage: "Operation completed",
        })
      })

      expect(resultValue).toBe("success")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Operation completed",
      })
    })

    it("should handle failed async operations", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const asyncFn = jest.fn().mockRejectedValue(new Error("Async failed"))

      const resultValue = await act(async () => {
        return await result.current.handleAsync(asyncFn, {
          errorMessage: "Custom error message",
        })
      })

      expect(resultValue).toBeNull()
      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].message).toBe("Custom error message")
    })

    it("should enable retry for async operations", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const asyncFn = jest.fn().mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce("success")

      await act(async () => {
        await result.current.handleAsync(asyncFn, { retry: true })
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].retry).toBeDefined()

      // Retry the operation
      const errorId = result.current.errors[0].id
      await act(async () => {
        await result.current.retryError(errorId)
      })

      expect(asyncFn).toHaveBeenCalledTimes(2)
      expect(result.current.errors).toHaveLength(0)
    })
  })

  describe("Error Statistics", () => {
    it("should calculate error statistics", async () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      await act(async () => {
        await result.current.handleError({ code: "NETWORK_ERROR" })
        await result.current.handleError({ code: "VALIDATION_ERROR" })
        await result.current.handleError({ code: "UNKNOWN_ERROR" })
      })

      const stats = result.current.statistics

      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsBySeverity.warning).toBe(1) // NETWORK_ERROR
      expect(stats.errorsBySeverity.info).toBe(1) // VALIDATION_ERROR
      expect(stats.errorsBySeverity.error).toBe(1) // UNKNOWN_ERROR
      expect(stats.recentErrors).toHaveLength(3)
    })
  })

  describe("Error Boundary Fallback", () => {
    it("should render error boundary fallback", () => {
      const { result } = renderHookWithProviders(() => useErrorHandling())

      const error = new Error("Component crashed")
      const resetErrorBoundary = jest.fn()

      const FallbackComponent = result.current.ErrorBoundaryFallback

      expect(FallbackComponent).toBeDefined()
      expect(typeof FallbackComponent).toBe("function")
    })
  })
})
