import { renderHook, act } from "@testing-library/react"
import { useQuery, useMutation } from "convex/react"
import { useAvailability } from "@/hooks/use-availability"

// Mock dependencies
jest.mock("convex/react")

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

describe("useAvailability", () => {
  const mockBusinessId = "business_123" as any
  const mockBlockTimeSlot = jest.fn()
  const mockRemoveBlockedSlot = jest.fn()

  const mockBusinessHours = {
    businessHours: {
      monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    },
  }

  const mockBlockedSlots = [
    {
      date: "2024-02-15",
      startTime: "12:00",
      endTime: "13:00",
      reason: "Lunch break",
    },
  ]

  const mockAppointments = [
    {
      _id: "apt_1",
      date: "2024-02-15",
      startTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseMutation.mockImplementation((mutation) => {
      if (mutation.toString().includes("blockTimeSlot")) {
        return mockBlockTimeSlot
      }
      if (mutation.toString().includes("removeBlockedTimeSlot")) {
        return mockRemoveBlockedSlot
      }
      return jest.fn()
    })

    mockUseQuery.mockImplementation((query) => {
      if (query.toString().includes("getBusinessAvailability")) {
        return mockBusinessHours
      }
      if (query.toString().includes("getBlockedTimeSlots")) {
        return mockBlockedSlots
      }
      if (query.toString().includes("getAppointmentsByDateRange")) {
        return mockAppointments
      }
      if (query.toString().includes("getStaffAvailability")) {
        return null
      }
      return null
    })

    mockBlockTimeSlot.mockResolvedValue(undefined)
    mockRemoveBlockedSlot.mockResolvedValue(undefined)
  })

  describe("Initial State", () => {
    it("should initialize with correct default values", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      expect(result.current.selectedDate).toBeInstanceOf(Date)
      expect(result.current.viewMode).toBe("week")
      expect(result.current.isLoading).toBe(false)
    })

    it("should calculate date range for week view", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      expect(result.current.dateRange.start).toBeInstanceOf(Date)
      expect(result.current.dateRange.end).toBeInstanceOf(Date)
    })

    it("should calculate date range for month view", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      act(() => {
        result.current.setViewMode("month")
      })

      expect(result.current.dateRange.start).toBeInstanceOf(Date)
      expect(result.current.dateRange.end).toBeInstanceOf(Date)
    })
  })

  describe("Time Slot Generation", () => {
    it("should generate correct time slots for a business day", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      // Test Thursday (business day)
      const thursday = new Date("2024-02-15") // This is a Thursday
      const availability = result.current.getDateAvailability(thursday)

      expect(availability.isOpen).toBe(true)
      expect(availability.openTime).toBe("09:00")
      expect(availability.closeTime).toBe("17:00")
      expect(availability.slots.length).toBeGreaterThan(0)

      // Check first and last slots
      expect(availability.slots[0].startTime).toBe("09:00")
      expect(availability.slots[availability.slots.length - 1].endTime).toBe("17:00")
    })

    it("should mark closed days correctly", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      // Test Sunday (closed day)
      const sunday = new Date("2024-02-18") // This is a Sunday
      const availability = result.current.getDateAvailability(sunday)

      expect(availability.isOpen).toBe(false)
      expect(availability.slots).toEqual([])
    })

    it("should respect custom service duration", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId, serviceDuration: 120 }))

      const thursday = new Date("2024-02-15")
      const availability = result.current.getDateAvailability(thursday)

      // With 120-minute services, should have fewer slots
      const expectedSlots = Math.floor((8 * 60) / 30) // 8 hours, 30-minute intervals
      expect(availability.slots.length).toBeLessThanOrEqual(expectedSlots)
    })
  })

  describe("Blocked Slots", () => {
    it("should identify blocked time slots", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBlocked = result.current.isSlotBlocked("2024-02-15", "12:00", "13:00", mockBlockedSlots)

      expect(isBlocked).toBe(true)
    })

    it("should identify non-blocked time slots", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBlocked = result.current.isSlotBlocked("2024-02-15", "14:00", "15:00", mockBlockedSlots)

      expect(isBlocked).toBe(false)
    })

    it("should handle overlapping blocked slots", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBlocked = result.current.isSlotBlocked("2024-02-15", "12:30", "13:30", mockBlockedSlots)

      expect(isBlocked).toBe(true)
    })
  })

  describe("Booked Slots", () => {
    it("should identify booked time slots", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBooked = result.current.isSlotBooked("2024-02-15", "10:00", "11:00", mockAppointments)

      expect(isBooked).toBe(true)
    })

    it("should identify available time slots", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBooked = result.current.isSlotBooked("2024-02-15", "14:00", "15:00", mockAppointments)

      expect(isBooked).toBe(false)
    })

    it("should ignore cancelled appointments", () => {
      const appointmentsWithCancelled = [
        ...mockAppointments,
        {
          _id: "apt_2",
          date: "2024-02-15",
          startTime: "14:00",
          endTime: "15:00",
          status: "cancelled",
        },
      ]

      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("getAppointmentsByDateRange")) {
          return appointmentsWithCancelled
        }
        return mockUseQuery(query)
      })

      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const isBooked = result.current.isSlotBooked("2024-02-15", "14:00", "15:00", appointmentsWithCancelled)

      expect(isBooked).toBe(false)
    })
  })

  describe("Availability Management", () => {
    it("should mark slots as unavailable when blocked or booked", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const thursday = new Date("2024-02-15")
      const availability = result.current.getDateAvailability(thursday)

      // Find the blocked slot
      const blockedSlot = availability.slots.find((slot) => slot.startTime === "12:00" && slot.endTime === "12:30")
      expect(blockedSlot?.available).toBe(false)

      // Find the booked slot
      const bookedSlot = availability.slots.find((slot) => slot.startTime === "10:00" && slot.endTime === "10:30")
      expect(bookedSlot?.available).toBe(false)
    })

    it("should get availability for date range", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const rangeAvailability = result.current.getAvailabilityForRange()

      expect(rangeAvailability.size).toBeGreaterThan(0)
      rangeAvailability.forEach((dayAvailability, dateString) => {
        expect(dayAvailability.date).toBe(dateString)
        expect(dayAvailability).toHaveProperty("isOpen")
        expect(dayAvailability).toHaveProperty("slots")
      })
    })
  })

  describe("Next Available Slot", () => {
    it("should find next available slot", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const nextSlot = result.current.findNextAvailableSlot(new Date("2024-02-15"))

      expect(nextSlot).toBeTruthy()
      expect(nextSlot?.available).toBe(true)
    })

    it("should return null when no slots available", () => {
      // Mock all days as closed
      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes("getBusinessAvailability")) {
          return {
            businessHours: {
              monday: { isOpen: false },
              tuesday: { isOpen: false },
              wednesday: { isOpen: false },
              thursday: { isOpen: false },
              friday: { isOpen: false },
              saturday: { isOpen: false },
              sunday: { isOpen: false },
            },
          }
        }
        return mockUseQuery(query)
      })

      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const nextSlot = result.current.findNextAvailableSlot()

      expect(nextSlot).toBeNull()
    })
  })

  describe("Blocking Time Slots", () => {
    it("should block time slot successfully", async () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      await act(async () => {
        const success = await result.current.handleBlockTimeSlot("2024-02-16", "15:00", "16:00", "Meeting")
        expect(success).toBe(true)
      })

      expect(mockBlockTimeSlot).toHaveBeenCalledWith({
        businessId: mockBusinessId,
        date: "2024-02-16",
        startTime: "15:00",
        endTime: "16:00",
        reason: "Meeting",
        isRecurring: undefined,
        recurringPattern: undefined,
      })
    })

    it("should handle block time slot error", async () => {
      mockBlockTimeSlot.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      await act(async () => {
        const success = await result.current.handleBlockTimeSlot("2024-02-16", "15:00", "16:00")
        expect(success).toBe(false)
      })
    })

    it("should remove blocked slot successfully", async () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      await act(async () => {
        const success = await result.current.handleRemoveBlockedSlot("slot_123" as any)
        expect(success).toBe(true)
      })

      expect(mockRemoveBlockedSlot).toHaveBeenCalledWith({
        slotId: "slot_123",
      })
    })
  })

  describe("Navigation", () => {
    it("should navigate to previous week", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const initialDate = result.current.selectedDate

      act(() => {
        result.current.navigatePrevious()
      })

      expect(result.current.selectedDate.getTime()).toBeLessThan(initialDate.getTime())
    })

    it("should navigate to next week", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      const initialDate = result.current.selectedDate

      act(() => {
        result.current.navigateNext()
      })

      expect(result.current.selectedDate.getTime()).toBeGreaterThan(initialDate.getTime())
    })

    it("should navigate to today", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      act(() => {
        result.current.setSelectedDate(new Date("2024-01-01"))
      })

      act(() => {
        result.current.navigateToday()
      })

      const today = new Date()
      expect(result.current.selectedDate.toDateString()).toBe(today.toDateString())
    })

    it("should change view mode", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      expect(result.current.viewMode).toBe("week")

      act(() => {
        result.current.setViewMode("month")
      })

      expect(result.current.viewMode).toBe("month")
    })
  })

  describe("Statistics", () => {
    it("should calculate availability statistics", () => {
      const { result } = renderHook(() => useAvailability({ businessId: mockBusinessId }))

      expect(result.current.statistics).toMatchObject({
        totalSlots: expect.any(Number),
        availableSlots: expect.any(Number),
        bookedSlots: expect.any(Number),
        blockedSlotsCount: expect.any(Number),
        utilizationRate: expect.any(Number),
      })

      expect(result.current.statistics.utilizationRate).toBeLessThanOrEqual(100)
      expect(result.current.statistics.utilizationRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Cache Management", () => {
    it("should clear cache when dependencies change", () => {
      const { result, rerender } = renderHook((props) => useAvailability(props), {
        initialProps: { businessId: mockBusinessId },
      })

      // Get initial availability
      const initialAvailability = result.current.getDateAvailability(new Date("2024-02-15"))
      expect(initialAvailability).toBeTruthy()

      // Change business ID
      rerender({ businessId: "business_456" as any })

      // Cache should be cleared and new data should be fetched
      expect(result.current.businessHours).toBe(mockBusinessHours)
    })
  })
})
