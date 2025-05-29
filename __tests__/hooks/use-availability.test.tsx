import { act } from "@testing-library/react"
import { useAvailability } from "@/hooks/use-availability"
import {
  renderHookWithProviders,
  setupMocks,
  mockConvexMutations,
  mockConvexQueries,
  createMockBusinessHours,
  createMockAppointment,
} from "./test-utils"
import { format } from "date-fns"

// Mock dependencies
jest.mock("convex/react", () => ({
  useQuery: jest.fn((query, args) => {
    if (args === "skip") return undefined
    return mockConvexQueries[query]?.() || null
  }),
  useMutation: jest.fn((mutation) => mockConvexMutations[mutation]),
}))

describe("useAvailability", () => {
  const mockBusinessId = "business_123" as any
  const defaultOptions = {
    businessId: mockBusinessId,
    serviceDuration: 60,
  }

  beforeEach(() => {
    setupMocks()
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      expect(result.current.selectedDate).toBeInstanceOf(Date)
      expect(result.current.viewMode).toBe("week")
      expect(result.current.isLoading).toBe(false)
      expect(result.current.dateRange).toHaveProperty("start")
      expect(result.current.dateRange).toHaveProperty("end")
    })

    it("should use custom date range when provided", () => {
      const customRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-07"),
      }

      const { result } = renderHookWithProviders(() =>
        useAvailability({
          ...defaultOptions,
          dateRange: customRange,
        }),
      )

      expect(result.current.dateRange).toEqual(customRange)
    })
  })

  describe("Business Hours Integration", () => {
    it("should load business hours data", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      expect(result.current.businessHours).toEqual(mockHours)
    })

    it("should handle missing business hours", () => {
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(null)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const today = new Date()
      const availability = result.current.getDateAvailability(today)

      expect(availability.isOpen).toBe(false)
      expect(availability.slots).toEqual([])
    })
  })

  describe("Time Slot Generation", () => {
    it("should generate time slots for open days", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      // Test Monday (open 9-17)
      const monday = new Date("2024-01-15") // Assuming this is a Monday
      const availability = result.current.getDateAvailability(monday)

      expect(availability.isOpen).toBe(true)
      expect(availability.openTime).toBe("09:00")
      expect(availability.closeTime).toBe("17:00")
      expect(availability.slots.length).toBeGreaterThan(0)

      // Check first and last slots
      expect(availability.slots[0].startTime).toBe("09:00")
      expect(availability.slots[0].endTime).toBe("10:00")
    })

    it("should handle closed days", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      // Test Sunday (closed)
      const sunday = new Date("2024-01-14") // Assuming this is a Sunday
      const availability = result.current.getDateAvailability(sunday)

      expect(availability.isOpen).toBe(false)
      expect(availability.slots).toEqual([])
    })

    it("should respect service duration when generating slots", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() =>
        useAvailability({
          ...defaultOptions,
          serviceDuration: 120, // 2 hours
        }),
      )

      const monday = new Date("2024-01-15")
      const availability = result.current.getDateAvailability(monday)

      // With 2-hour service duration, slots should be 2 hours long
      const firstSlot = availability.slots[0]
      expect(firstSlot.startTime).toBe("09:00")
      expect(firstSlot.endTime).toBe("11:00")
    })
  })

  describe("Blocked Slots Management", () => {
    it("should mark blocked slots as unavailable", () => {
      const mockHours = createMockBusinessHours()
      const blockedSlots = [
        {
          _id: "blocked_123",
          businessId: mockBusinessId,
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
          reason: "Lunch break",
          isRecurring: false,
        },
      ]

      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)
      mockConvexQueries["api.availability.getBlockedTimeSlots"].mockReturnValue(blockedSlots)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const testDate = new Date("2024-01-15")
      const availability = result.current.getDateAvailability(testDate)

      // Find the blocked slot
      const blockedSlot = availability.slots.find((slot) => slot.startTime === "10:00" && slot.endTime === "11:00")

      expect(blockedSlot?.available).toBe(false)
      expect(availability.blockedSlots).toHaveLength(1)
      expect(availability.blockedSlots[0].reason).toBe("Lunch break")
    })

    it("should block time slots successfully", async () => {
      mockConvexMutations["api.availability.blockTimeSlot"].mockResolvedValue(undefined)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      await act(async () => {
        const success = await result.current.handleBlockTimeSlot("2024-01-15", "10:00", "11:00", "Lunch break")
        expect(success).toBe(true)
      })

      expect(mockConvexMutations["api.availability.blockTimeSlot"]).toHaveBeenCalledWith({
        businessId: mockBusinessId,
        date: "2024-01-15",
        startTime: "10:00",
        endTime: "11:00",
        reason: "Lunch break",
        isRecurring: undefined,
        recurringPattern: undefined,
      })
    })

    it("should handle block time slot errors", async () => {
      mockConvexMutations["api.availability.blockTimeSlot"].mockRejectedValue(new Error("Block failed"))

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      await act(async () => {
        const success = await result.current.handleBlockTimeSlot("2024-01-15", "10:00", "11:00")
        expect(success).toBe(false)
      })
    })

    it("should remove blocked slots successfully", async () => {
      mockConvexMutations["api.availability.removeBlockedTimeSlot"].mockResolvedValue(undefined)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      await act(async () => {
        const success = await result.current.handleRemoveBlockedSlot("blocked_123" as any)
        expect(success).toBe(true)
      })

      expect(mockConvexMutations["api.availability.removeBlockedTimeSlot"]).toHaveBeenCalledWith({
        slotId: "blocked_123",
      })
    })
  })

  describe("Appointment Conflicts", () => {
    it("should mark booked slots as unavailable", () => {
      const mockHours = createMockBusinessHours()
      const appointments = [
        createMockAppointment({
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
          status: "scheduled",
        }),
      ]

      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const testDate = new Date("2024-01-15")
      const availability = result.current.getDateAvailability(testDate)

      // Find the booked slot
      const bookedSlot = availability.slots.find((slot) => slot.startTime === "10:00" && slot.endTime === "11:00")

      expect(bookedSlot?.available).toBe(false)
    })

    it("should not mark cancelled appointments as conflicts", () => {
      const mockHours = createMockBusinessHours()
      const appointments = [
        createMockAppointment({
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
          status: "cancelled",
        }),
      ]

      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const testDate = new Date("2024-01-15")
      const availability = result.current.getDateAvailability(testDate)

      // Find the slot that would have been booked
      const slot = availability.slots.find((slot) => slot.startTime === "10:00" && slot.endTime === "11:00")

      expect(slot?.available).toBe(true)
    })
  })

  describe("Navigation", () => {
    it("should navigate to previous week", () => {
      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const initialDate = result.current.selectedDate

      act(() => {
        result.current.navigatePrevious()
      })

      const newDate = result.current.selectedDate
      const daysDifference = (initialDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDifference).toBe(7)
    })

    it("should navigate to next week", () => {
      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const initialDate = result.current.selectedDate

      act(() => {
        result.current.navigateNext()
      })

      const newDate = result.current.selectedDate
      const daysDifference = (newDate.getTime() - initialDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDifference).toBe(7)
    })

    it("should navigate to today", () => {
      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      // Navigate away from today first
      act(() => {
        result.current.navigateNext()
      })

      act(() => {
        result.current.navigateToday()
      })

      const today = new Date()
      const selectedDate = result.current.selectedDate

      expect(selectedDate.toDateString()).toBe(today.toDateString())
    })

    it("should change view mode", () => {
      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      expect(result.current.viewMode).toBe("week")

      act(() => {
        result.current.setViewMode("month")
      })

      expect(result.current.viewMode).toBe("month")
    })
  })

  describe("Next Available Slot", () => {
    it("should find next available slot", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const nextSlot = result.current.findNextAvailableSlot()

      expect(nextSlot).toBeTruthy()
      expect(nextSlot?.available).toBe(true)
      expect(nextSlot?.startTime).toContain("09:00")
    })

    it("should return null when no slots available", () => {
      // Mock closed business
      const closedHours = createMockBusinessHours({
        businessHours: {
          monday: { isOpen: false },
          tuesday: { isOpen: false },
          wednesday: { isOpen: false },
          thursday: { isOpen: false },
          friday: { isOpen: false },
          saturday: { isOpen: false },
          sunday: { isOpen: false },
        },
      })
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(closedHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const nextSlot = result.current.findNextAvailableSlot()

      expect(nextSlot).toBeNull()
    })
  })

  describe("Statistics", () => {
    it("should calculate availability statistics", () => {
      const mockHours = createMockBusinessHours()
      const appointments = [
        createMockAppointment({
          date: format(new Date(), "yyyy-MM-dd"),
          startTime: "10:00",
          endTime: "11:00",
          status: "scheduled",
        }),
      ]

      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const stats = result.current.statistics

      expect(stats.totalSlots).toBeGreaterThan(0)
      expect(stats.bookedSlots).toBeGreaterThan(0)
      expect(stats.utilizationRate).toBeGreaterThan(0)
      expect(stats.utilizationRate).toBeLessThanOrEqual(100)
    })
  })

  describe("Caching", () => {
    it("should cache availability data", () => {
      const mockHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(mockHours)

      const { result } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const testDate = new Date("2024-01-15")

      // First call
      const availability1 = result.current.getDateAvailability(testDate)

      // Second call should return cached result
      const availability2 = result.current.getDateAvailability(testDate)

      expect(availability1).toBe(availability2) // Same object reference
    })

    it("should clear cache when dependencies change", () => {
      const { result, rerender } = renderHookWithProviders(() => useAvailability(defaultOptions))

      const testDate = new Date("2024-01-15")
      result.current.getDateAvailability(testDate)

      // Change service duration
      rerender(() =>
        useAvailability({
          ...defaultOptions,
          serviceDuration: 120,
        }),
      )

      // Cache should be cleared, new calculation should happen
      const newAvailability = result.current.getDateAvailability(testDate)
      expect(newAvailability).toBeTruthy()
    })
  })
})
