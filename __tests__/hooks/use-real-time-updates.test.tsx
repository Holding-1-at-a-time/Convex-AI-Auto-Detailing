import { act, waitFor } from "@testing-library/react"
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates"
import { renderHookWithProviders, setupMocks, mockConvexQueries, createMockAppointment, mockToast } from "./test-utils"

// Mock dependencies
jest.mock("convex/react", () => ({
  useQuery: jest.fn((query, args) => {
    if (args === "skip") return undefined
    return mockConvexQueries[query]?.() || null
  }),
}))

jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
}))

// Mock Notification API
const mockNotification = jest.fn()
Object.defineProperty(window, "Notification", {
  value: mockNotification,
  configurable: true,
})

Object.defineProperty(Notification, "permission", {
  value: "granted",
  configurable: true,
})

Object.defineProperty(Notification, "requestPermission", {
  value: jest.fn().mockResolvedValue("granted"),
  configurable: true,
})

// Mock Audio API
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  volume: 0.5,
}

Object.defineProperty(window, "Audio", {
  value: jest.fn(() => mockAudio),
  configurable: true,
})

describe("useRealTimeUpdates", () => {
  const mockBusinessId = "business_123" as any
  const mockCustomerId = "customer_123"

  beforeEach(() => {
    setupMocks()
    mockToast.mockClear()
    mockNotification.mockClear()
    mockAudio.play.mockClear()
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHookWithProviders(() => useRealTimeUpdates())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.lastUpdate).toBeNull()
      expect(result.current.updateQueue).toEqual([])
      expect(result.current.isProcessing).toBe(false)
    })

    it("should subscribe to updates when businessId is provided", () => {
      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest.fn().mockReturnValue([])
      mockConvexQueries["api.businessAvailability.subscribeToAvailability"] = jest.fn().mockReturnValue(null)
      mockConvexQueries["api.notifications.subscribeToNotifications"] = jest.fn().mockReturnValue([])

      renderHookWithProviders(() => useRealTimeUpdates({ businessId: mockBusinessId }))

      expect(mockConvexQueries["api.appointments.subscribeToAppointments"]).toHaveBeenCalled()
      expect(mockConvexQueries["api.businessAvailability.subscribeToAvailability"]).toHaveBeenCalled()
      expect(mockConvexQueries["api.notifications.subscribeToNotifications"]).toHaveBeenCalled()
    })
  })

  describe("Appointment Updates", () => {
    it("should detect new appointments", async () => {
      const onUpdate = jest.fn()
      const initialAppointments: any[] = []
      const newAppointments = [createMockAppointment()]

      // Start with empty appointments
      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce(initialAppointments)
        .mockReturnValueOnce(newAppointments)

      const { result, rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      // Trigger update by re-rendering with new data
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "appointment",
            action: "created",
            data: newAppointments[0],
          }),
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "New Appointment",
        description: "A new appointment has been scheduled",
      })
    })

    it("should detect updated appointments", async () => {
      const onUpdate = jest.fn()
      const originalAppointment = createMockAppointment({ status: "scheduled" })
      const updatedAppointment = { ...originalAppointment, status: "confirmed" }

      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce([originalAppointment])
        .mockReturnValueOnce([updatedAppointment])

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "appointment",
            action: "updated",
            data: {
              previous: originalAppointment,
              current: updatedAppointment,
            },
          }),
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Updated",
        description: "An appointment has been modified",
      })
    })

    it("should detect deleted appointments", async () => {
      const onUpdate = jest.fn()
      const appointment = createMockAppointment()

      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce([appointment])
        .mockReturnValueOnce([])

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "appointment",
            action: "deleted",
            data: appointment,
          }),
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Cancelled",
        description: "An appointment has been cancelled",
      })
    })
  })

  describe("Availability Updates", () => {
    it("should detect availability changes", async () => {
      const onUpdate = jest.fn()
      const originalAvailability = { businessHours: { monday: { isOpen: true } } }
      const updatedAvailability = { businessHours: { monday: { isOpen: false } } }

      mockConvexQueries["api.businessAvailability.subscribeToAvailability"] = jest
        .fn()
        .mockReturnValueOnce(originalAvailability)
        .mockReturnValueOnce(updatedAvailability)

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "availability",
            action: "updated",
            data: updatedAvailability,
          }),
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Availability Changed",
        description: "Business availability has been updated",
      })
    })
  })

  describe("Notification Updates", () => {
    it("should detect new notifications", async () => {
      const onUpdate = jest.fn()
      const notification = {
        _id: "notif_123",
        title: "Test Notification",
        message: "This is a test",
        type: "info",
      }

      mockConvexQueries["api.notifications.subscribeToNotifications"] = jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([notification])

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          customerId: mockCustomerId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          customerId: mockCustomerId,
          onUpdate,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "notification",
            action: "created",
            data: notification,
          }),
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Test Notification",
        description: "This is a test",
      })
    })
  })

  describe("Browser Notifications", () => {
    it("should show browser notification for new appointments", async () => {
      const appointment = createMockAppointment()

      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([appointment])

      const { result, rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
        }),
      )

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          "New Appointment",
          expect.objectContaining({
            body: "A new appointment has been scheduled",
            icon: "/icon-192x192.png",
            badge: "/icon-72x72.png",
            tag: "appointment-update",
            renotify: true,
          }),
        )
      })
    })

    it("should request notification permission when needed", async () => {
      Object.defineProperty(Notification, "permission", {
        value: "default",
        configurable: true,
      })

      const { result } = renderHookWithProviders(() => useRealTimeUpdates({ enableNotifications: true }))

      await act(async () => {
        await result.current.showBrowserNotification("Test", "Test message")
      })

      expect(Notification.requestPermission).toHaveBeenCalled()
    })
  })

  describe("Sound Notifications", () => {
    it("should play sound for new appointments when enabled", async () => {
      const appointment = createMockAppointment()

      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([appointment])

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
          enableSound: true,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
          enableSound: true,
        }),
      )

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled()
      })
    })

    it("should not play sound when disabled", async () => {
      const appointment = createMockAppointment()

      mockConvexQueries["api.appointments.subscribeToAppointments"] = jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([appointment])

      const { rerender } = renderHookWithProviders(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
          enableSound: false,
        }),
      )

      // Trigger update
      rerender(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          enableNotifications: true,
          enableSound: false,
        }),
      )

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      expect(mockAudio.play).not.toHaveBeenCalled()
    })
  })

  describe("Update Queue Management", () => {
    it("should add updates to queue", async () => {
      const { result } = renderHookWithProviders(() => useRealTimeUpdates({ enableNotifications: false }))

      const testUpdate = {
        id: "test-123",
        type: "appointment" as const,
        action: "created" as const,
        data: createMockAppointment(),
        timestamp: new Date(),
      }

      act(() => {
        result.current.processUpdate(testUpdate)
      })

      expect(result.current.updateQueue).toContain(testUpdate)
      expect(result.current.lastUpdate).toBeTruthy()
    })

    it("should clear update queue", () => {
      const { result } = renderHookWithProviders(() => useRealTimeUpdates())

      const testUpdate = {
        id: "test-123",
        type: "appointment" as const,
        action: "created" as const,
        data: createMockAppointment(),
        timestamp: new Date(),
      }

      act(() => {
        result.current.processUpdate(testUpdate)
      })

      expect(result.current.updateQueue.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearUpdateQueue()
      })

      expect(result.current.updateQueue).toEqual([])
    })

    it("should batch multiple updates", async () => {
      jest.useFakeTimers()

      const { result } = renderHookWithProviders(() => useRealTimeUpdates({ enableNotifications: true }))

      // Add multiple updates quickly
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.processUpdate({
            id: `test-${i}`,
            type: "appointment",
            action: "created",
            data: createMockAppointment(),
            timestamp: new Date(),
          })
        }
      })

      expect(result.current.updateQueue.length).toBe(5)

      // Fast-forward time to trigger batching
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Multiple Updates",
          description: "5 items have been updated",
        })
      })

      jest.useRealTimers()
    })
  })

  describe("Statistics", () => {
    it("should calculate update statistics", () => {
      const { result } = renderHookWithProviders(() => useRealTimeUpdates())

      // Add different types of updates
      act(() => {
        result.current.processUpdate({
          id: "apt-1",
          type: "appointment",
          action: "created",
          data: {},
          timestamp: new Date(),
        })
        result.current.processUpdate({
          id: "avail-1",
          type: "availability",
          action: "updated",
          data: {},
          timestamp: new Date(),
        })
        result.current.processUpdate({
          id: "notif-1",
          type: "notification",
          action: "created",
          data: {},
          timestamp: new Date(),
        })
      })

      const stats = result.current.statistics

      expect(stats.totalUpdates).toBe(3)
      expect(stats.appointmentUpdates).toBe(1)
      expect(stats.availabilityUpdates).toBe(1)
      expect(stats.notificationUpdates).toBe(1)
    })
  })

  describe("Error Handling", () => {
    it("should handle audio play errors gracefully", async () => {
      mockAudio.play.mockRejectedValue(new Error("Audio failed"))
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      const { result } = renderHookWithProviders(() => useRealTimeUpdates({ enableSound: true }))

      await act(async () => {
        result.current.playNotificationSound()
      })

      expect(consoleSpy).toHaveBeenCalledWith("Error playing notification sound:", expect.any(Error))

      consoleSpy.mockRestore()
    })
  })
})
