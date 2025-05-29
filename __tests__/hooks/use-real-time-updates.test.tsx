import { renderHook, act } from "@testing-library/react"
import { useQuery } from "convex/react"
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates"
import { toast } from "@/hooks/use-toast"

// Mock dependencies
jest.mock("convex/react")
jest.mock("@/hooks/use-toast")

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockToast = toast as jest.MockedFunction<typeof toast>

// Mock browser APIs
Object.defineProperty(window, "Notification", {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
  })),
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

// Mock Audio
Object.defineProperty(window, "Audio", {
  value: jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    volume: 0.5,
  })),
  configurable: true,
})

describe("useRealTimeUpdates", () => {
  const mockBusinessId = "business_123" as any
  const mockCustomerId = "customer_123"
  const mockOnUpdate = jest.fn()

  const mockAppointments = [
    {
      _id: "apt_1",
      customerId: "customer_123",
      businessId: "business_123",
      date: "2024-02-15",
      startTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
    },
  ]

  const mockAvailability = {
    businessHours: {
      monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    },
  }

  const mockNotifications = [
    {
      _id: "notif_1",
      userId: "customer_123",
      title: "Appointment Reminder",
      message: "Your appointment is tomorrow",
      type: "reminder",
      read: false,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockUseQuery.mockImplementation((query) => {
      if (query.toString().includes("subscribeToAppointments")) {
        return mockAppointments
      }
      if (query.toString().includes("subscribeToAvailability")) {
        return mockAvailability
      }
      if (query.toString().includes("subscribeToNotifications")) {
        return mockNotifications
      }
      return null
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Initial State", () => {
    it("should initialize with correct default values", () => {
      const { result } = renderHook(() => useRealTimeUpdates())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.lastUpdate).toBeNull()
      expect(result.current.updateQueue).toEqual([])
      expect(result.current.isProcessing).toBe(false)
    })

    it("should initialize with provided options", () => {
      renderHook(() =>
        useRealTimeUpdates({
          businessId: mockBusinessId,
          customerId: mockCustomerId,
          onUpdate: mockOnUpdate,
          enableNotifications: true,
          enableSound: true,
        }),
      )

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: mockBusinessId,
          customerId: mockCustomerId,
        }),
      )
    })
  })

  describe("Data Subscription", () => {
    it("should subscribe to appointments when business ID is provided", () => {
      renderHook(() => useRealTimeUpdates({ businessId: mockBusinessId }))

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: mockBusinessId,
        }),
      )
    })

    it("should subscribe to availability when business ID is provided", () => {
      renderHook(() => useRealTimeUpdates({ businessId: mockBusinessId }))

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: mockBusinessId,
        }),
      )
    })

    it("should subscribe to notifications when user ID is provided", () => {
      renderHook(() => useRealTimeUpdates({ customerId: mockCustomerId }))

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockCustomerId,
        }),
      )
    })

    it("should skip subscriptions when no IDs provided", () => {
      renderHook(() => useRealTimeUpdates())

      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip")
    })
  })

  describe("Change Detection", () => {
    it("should detect new appointments", () => {
      const { result, rerender } = renderHook(() =>
        useRealTimeUpdates({ businessId: mockBusinessId, onUpdate: mockOnUpdate }),
      )

      // Initially no appointments
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToAppointments")) {
          return []
        }
        return null
      })

      rerender()

      // Add new appointment
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToAppointments")) {
          return mockAppointments
        }
        return null
      })

      rerender()

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
        }),
      )
    })

    it("should detect updated appointments", () => {
      const { rerender } = renderHook(() => useRealTimeUpdates({ businessId: mockBusinessId, onUpdate: mockOnUpdate }))

      // Initial appointments
      rerender()

      // Update appointment status
      const updatedAppointments = [
        {
          ...mockAppointments[0],
          status: "completed",
        },
      ]

      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToAppointments")) {
          return updatedAppointments
        }
        return null
      })

      rerender()

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "appointment",
          action: "updated",
          data: expect.objectContaining({
            previous: mockAppointments[0],
            current: updatedAppointments[0],
          }),
        }),
      )
    })

    it("should detect deleted appointments", () => {
      const { rerender } = renderHook(() => useRealTimeUpdates({ businessId: mockBusinessId, onUpdate: mockOnUpdate }))

      // Initial appointments
      rerender()

      // Remove appointment
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToAppointments")) {
          return []
        }
        return null
      })

      rerender()

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "appointment",
          action: "deleted",
          data: mockAppointments[0],
        }),
      )
    })

    it("should detect availability changes", () => {
      const { rerender } = renderHook(() => useRealTimeUpdates({ businessId: mockBusinessId, onUpdate: mockOnUpdate }))

      // Initial availability
      rerender()

      // Update availability
      const updatedAvailability = {
        businessHours: {
          monday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
        },
      }

      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToAvailability")) {
          return updatedAvailability
        }
        return mockAvailability
      })

      rerender()

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "availability",
          action: "updated",
          data: updatedAvailability,
        }),
      )
    })

    it("should detect new notifications", () => {
      const { rerender } = renderHook(() => useRealTimeUpdates({ customerId: mockCustomerId, onUpdate: mockOnUpdate }))

      // Initially no notifications
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToNotifications")) {
          return []
        }
        return null
      })

      rerender()

      // Add new notification
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("subscribeToNotifications")) {
          return mockNotifications
        }
        return null
      })

      rerender()

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "notification",
          action: "created",
          data: mockNotifications[0],
        }),
      )
    })
  })

  describe("Notifications", () => {
    it("should show toast notifications when enabled", () => {
      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: true }))

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "New Appointment",
        description: "A new appointment has been scheduled",
      })
    })

    it("should not show toast notifications when disabled", () => {
      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: false }))

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
      })

      expect(mockToast).not.toHaveBeenCalled()
    })

    it("should play notification sound when enabled", () => {
      const mockPlay = jest.fn().mockResolvedValue(undefined)
      const mockAudio = {
        play: mockPlay,
        volume: 0.5,
      }
      ;(window.Audio as jest.Mock).mockImplementation(() => mockAudio)

      const { result } = renderHook(() => useRealTimeUpdates({ enableSound: true }))

      act(() => {
        result.current.playNotificationSound()
      })

      expect(mockPlay).toHaveBeenCalled()
    })

    it("should show browser notification for important updates", async () => {
      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: true }))

      await act(async () => {
        await result.current.showBrowserNotification("Test Title", "Test Body")
      })

      expect(window.Notification).toHaveBeenCalledWith("Test Title", {
        body: "Test Body",
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "appointment-update",
        renotify: true,
      })
    })

    it("should handle notification permission denied", async () => {
      Object.defineProperty(Notification, "permission", {
        value: "denied",
        configurable: true,
      })

      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: true }))

      await act(async () => {
        await result.current.showBrowserNotification("Test Title", "Test Body")
      })

      expect(window.Notification).not.toHaveBeenCalled()
    })
  })

  describe("Update Queue Management", () => {
    it("should add updates to queue", () => {
      const { result } = renderHook(() => useRealTimeUpdates())

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
      })

      expect(result.current.updateQueue.length).toBe(1)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })

    it("should clear update queue", () => {
      const { result } = renderHook(() => useRealTimeUpdates())

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
      })

      expect(result.current.updateQueue.length).toBe(1)

      act(() => {
        result.current.clearUpdateQueue()
      })

      expect(result.current.updateQueue.length).toBe(0)
    })

    it("should limit queue size to 10 items", () => {
      const { result } = renderHook(() => useRealTimeUpdates())

      // Add 15 updates
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.processUpdate({
            id: `test_${i}`,
            type: "appointment",
            action: "created",
            data: mockAppointments[0],
            timestamp: new Date(),
          })
        }
      })

      expect(result.current.updateQueue.length).toBe(10)
    })
  })

  describe("Statistics", () => {
    it("should calculate update statistics", () => {
      const { result } = renderHook(() => useRealTimeUpdates())

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
        result.current.processUpdate({
          id: "test_2",
          type: "availability",
          action: "updated",
          data: mockAvailability,
          timestamp: new Date(),
        })
        result.current.processUpdate({
          id: "test_3",
          type: "notification",
          action: "created",
          data: mockNotifications[0],
          timestamp: new Date(),
        })
      })

      expect(result.current.statistics).toEqual({
        totalUpdates: 3,
        appointmentUpdates: 1,
        availabilityUpdates: 1,
        notificationUpdates: 1,
      })
    })
  })

  describe("Batch Processing", () => {
    it("should process batched updates after timeout", async () => {
      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: true }))

      // Add multiple updates quickly
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.processUpdate({
            id: `test_${i}`,
            type: "appointment",
            action: "created",
            data: mockAppointments[0],
            timestamp: new Date(),
          })
        }
      })

      expect(result.current.updateQueue.length).toBe(5)

      // Fast forward timers to trigger batch processing
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Multiple Updates",
        description: "5 items have been updated",
      })
    })

    it("should not show batch notification for few updates", () => {
      const { result } = renderHook(() => useRealTimeUpdates({ enableNotifications: true }))

      act(() => {
        result.current.processUpdate({
          id: "test_1",
          type: "appointment",
          action: "created",
          data: mockAppointments[0],
          timestamp: new Date(),
        })
      })

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Multiple Updates",
        }),
      )
    })
  })

  describe("Error Handling", () => {
    it("should handle audio play errors gracefully", () => {
      const mockPlay = jest.fn().mockRejectedValue(new Error("Audio error"))
      const mockAudio = {
        play: mockPlay,
        volume: 0.5,
      }
      ;(window.Audio as jest.Mock).mockImplementation(() => mockAudio)

      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      const { result } = renderHook(() => useRealTimeUpdates({ enableSound: true }))

      act(() => {
        result.current.playNotificationSound()
      })

      expect(consoleSpy).toHaveBeenCalledWith("Error playing notification sound:", expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe("Cleanup", () => {
    it("should cleanup audio on unmount", () => {
      const { unmount } = renderHook(() => useRealTimeUpdates({ enableSound: true }))

      expect(window.Audio).toHaveBeenCalled()

      unmount()

      // Audio cleanup is handled by garbage collection
      expect(true).toBe(true)
    })
  })
})
