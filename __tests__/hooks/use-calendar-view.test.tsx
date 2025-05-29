import { renderHook, act } from "@testing-library/react"
import { useQuery } from "convex/react"
import { useCalendarView } from "@/hooks/use-calendar-view"

// Mock dependencies
jest.mock("convex/react")

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

describe("useCalendarView", () => {
  const mockBusinessId = "business_123" as any
  const mockCustomerId = "customer_123"
  const mockOnDateSelect = jest.fn()
  const mockOnEventSelect = jest.fn()

  const mockAppointments = [
    {
      _id: "apt_1",
      date: "2024-02-15",
      startTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
      customerName: "John Doe",
      serviceName: "Basic Wash",
      price: 50,
    },
    {
      _id: "apt_2",
      date: "2024-02-15",
      startTime: "14:00",
      endTime: "15:00",
      status: "scheduled",
      customerName: "Jane Smith",
      serviceName: "Premium Detail",
      price: 150,
    },
    {
      _id: "apt_3",
      date: "2024-02-16",
      startTime: "09:00",
      endTime: "10:00",
      status: "completed",
      customerName: "Bob Johnson",
      serviceName: "Interior Clean",
      price: 75,
    },
  ]

  const mockBusinessAvailability = {
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

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseQuery.mockImplementation((query) => {
      if (query.toString().includes("getAppointmentsByDateRange")) {
        return mockAppointments
      }
      if (query.toString().includes("getBusinessAvailability")) {
        return mockBusinessAvailability
      }
      return null
    })

    // Mock keyboard events
    Object.defineProperty(window, "addEventListener", {
      value: jest.fn(),
      writable: true,
    })
    Object.defineProperty(window, "removeEventListener", {
      value: jest.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useCalendarView())

      expect(result.current.currentDate).toBeInstanceOf(Date)
      expect(result.current.selectedDate).toBeNull()
      expect(result.current.viewMode).toBe("month")
      expect(result.current.searchQuery).toBe("")
      expect(result.current.statusFilter).toBe("all")
      expect(result.current.hoveredDate).toBeNull()
    })

    it("should initialize with custom view mode", () => {
      const { result } = renderHook(() => useCalendarView({ defaultView: "week" }))

      expect(result.current.viewMode).toBe("week")
    })

    it("should use business ID when provided", () => {
      renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: mockBusinessId,
        }),
      )
    })
  })

  describe("Calendar Days Generation", () => {
    it("should generate calendar days for month view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.calendarDays.length).toBeGreaterThan(0)
      expect(result.current.calendarDays[0]).toMatchObject({
        date: expect.any(Date),
        dateString: expect.any(String),
        isCurrentMonth: expect.any(Boolean),
        isToday: expect.any(Boolean),
        isSelected: expect.any(Boolean),
        appointments: expect.any(Array),
        isAvailable: expect.any(Boolean),
        hasAvailableSlots: expect.any(Boolean),
      })
    })

    it("should generate calendar days for week view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "week" }))

      expect(result.current.calendarDays.length).toBe(7)
    })

    it("should generate calendar days for day view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "day" }))

      expect(result.current.calendarDays.length).toBe(1)
    })

    it("should mark today correctly", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      const today = result.current.calendarDays.find((day) => day.isToday)
      expect(today).toBeTruthy()
      expect(today?.date.toDateString()).toBe(new Date().toDateString())
    })

    it("should include appointments in calendar days", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      const dayWithAppointments = result.current.calendarDays.find((day) => day.dateString === "2024-02-15")

      expect(dayWithAppointments?.appointments.length).toBe(2)
      expect(dayWithAppointments?.appointments[0]).toMatchObject({
        id: "apt_1",
        time: "10:00",
        title: "Basic Wash",
        status: "confirmed",
        customerName: "John Doe",
      })
    })
  })

  describe("Calendar Events", () => {
    it("should convert appointments to calendar events", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.calendarEvents.length).toBe(3)
      expect(result.current.calendarEvents[0]).toMatchObject({
        id: "apt_1",
        title: "Basic Wash",
        start: expect.any(Date),
        end: expect.any(Date),
        status: "confirmed",
        customerName: "John Doe",
        serviceName: "Basic Wash",
        price: 50,
      })
    })

    it("should filter events by status", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setStatusFilter("completed")
      })

      expect(result.current.calendarEvents.length).toBe(1)
      expect(result.current.calendarEvents[0].status).toBe("completed")
    })

    it("should filter events by search query", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setSearchQuery("john")
      })

      expect(result.current.calendarEvents.length).toBe(1)
      expect(result.current.calendarEvents[0].customerName).toBe("John Doe")
    })

    it("should filter events by service name", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setSearchQuery("premium")
      })

      expect(result.current.calendarEvents.length).toBe(1)
      expect(result.current.calendarEvents[0].serviceName).toBe("Premium Detail")
    })
  })

  describe("Navigation", () => {
    it("should navigate to previous month", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      const initialMonth = result.current.currentDate.getMonth()

      act(() => {
        result.current.navigatePrevious()
      })

      expect(result.current.currentDate.getMonth()).toBe(initialMonth === 0 ? 11 : initialMonth - 1)
    })

    it("should navigate to next month", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      const initialMonth = result.current.currentDate.getMonth()

      act(() => {
        result.current.navigateNext()
      })

      expect(result.current.currentDate.getMonth()).toBe(initialMonth === 11 ? 0 : initialMonth + 1)
    })

    it("should navigate to previous week in week view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "week" }))

      const initialDate = new Date(result.current.currentDate)

      act(() => {
        result.current.navigatePrevious()
      })

      expect(result.current.currentDate.getTime()).toBe(initialDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    })

    it("should navigate to next day in day view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "day" }))

      const initialDate = new Date(result.current.currentDate)

      act(() => {
        result.current.navigateNext()
      })

      expect(result.current.currentDate.getTime()).toBe(initialDate.getTime() + 24 * 60 * 60 * 1000)
    })

    it("should navigate to today", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setCurrentDate(new Date("2024-01-01"))
      })

      act(() => {
        result.current.navigateToday()
      })

      const today = new Date()
      expect(result.current.currentDate.toDateString()).toBe(today.toDateString())
      expect(result.current.selectedDate?.toDateString()).toBe(today.toDateString())
    })
  })

  describe("Date Selection", () => {
    it("should handle date selection", () => {
      const { result } = renderHook(() => useCalendarView({ onDateSelect: mockOnDateSelect }))

      const testDate = new Date("2024-02-15")

      act(() => {
        result.current.handleDateSelect(testDate)
      })

      expect(result.current.selectedDate?.toDateString()).toBe(testDate.toDateString())
      expect(mockOnDateSelect).toHaveBeenCalledWith(testDate)
    })

    it("should switch to day view when selecting date in month view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.viewMode).toBe("month")

      const testDate = new Date("2024-02-15")

      act(() => {
        result.current.handleDateSelect(testDate)
      })

      expect(result.current.viewMode).toBe("day")
      expect(result.current.currentDate.toDateString()).toBe(testDate.toDateString())
    })
  })

  describe("Event Selection", () => {
    it("should handle event selection", () => {
      const { result } = renderHook(() =>
        useCalendarView({ businessId: mockBusinessId, onEventSelect: mockOnEventSelect }),
      )

      act(() => {
        result.current.handleEventSelect("apt_1" as any)
      })

      expect(mockOnEventSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "apt_1",
          title: "Basic Wash",
          customerName: "John Doe",
        }),
      )
    })

    it("should not call onEventSelect for non-existent event", () => {
      const { result } = renderHook(() =>
        useCalendarView({ businessId: mockBusinessId, onEventSelect: mockOnEventSelect }),
      )

      act(() => {
        result.current.handleEventSelect("non_existent" as any)
      })

      expect(mockOnEventSelect).not.toHaveBeenCalled()
    })
  })

  describe("Calendar Title", () => {
    it("should generate correct title for month view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setCurrentDate(new Date("2024-02-15"))
      })

      expect(result.current.calendarTitle).toBe("February 2024")
    })

    it("should generate correct title for week view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "week" }))

      act(() => {
        result.current.setCurrentDate(new Date("2024-02-15"))
      })

      // The exact format depends on the week boundaries
      expect(result.current.calendarTitle).toContain("Feb")
      expect(result.current.calendarTitle).toContain("2024")
    })

    it("should generate correct title for day view", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId, defaultView: "day" }))

      act(() => {
        result.current.setCurrentDate(new Date("2024-02-15"))
      })

      expect(result.current.calendarTitle).toBe("Thursday, February 15, 2024")
    })
  })

  describe("Statistics", () => {
    it("should calculate calendar statistics", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.statistics).toMatchObject({
        totalAppointments: 3,
        completedAppointments: 1,
        upcomingAppointments: 2,
        cancelledAppointments: 0,
        totalRevenue: 75, // Only completed appointments
        completionRate: 33, // 1 out of 3 completed
      })
    })

    it("should filter statistics based on search and status", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      act(() => {
        result.current.setStatusFilter("completed")
      })

      expect(result.current.statistics).toMatchObject({
        totalAppointments: 1,
        completedAppointments: 1,
        upcomingAppointments: 0,
        cancelledAppointments: 0,
        totalRevenue: 75,
        completionRate: 100,
      })
    })
  })

  describe("Week Days", () => {
    it("should provide week days array", () => {
      const { result } = renderHook(() => useCalendarView())

      expect(result.current.weekDays).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    })
  })

  describe("Loading State", () => {
    it("should indicate loading when appointments are not available", () => {
      mockUseQuery.mockReturnValue(null)

      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.isLoading).toBe(true)
    })

    it("should not be loading when appointments are available", () => {
      const { result } = renderHook(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe("State Management", () => {
    it("should update view mode", () => {
      const { result } = renderHook(() => useCalendarView())

      act(() => {
        result.current.setViewMode("week")
      })

      expect(result.current.viewMode).toBe("week")
    })

    it("should update search query", () => {
      const { result } = renderHook(() => useCalendarView())

      act(() => {
        result.current.setSearchQuery("test search")
      })

      expect(result.current.searchQuery).toBe("test search")
    })

    it("should update status filter", () => {
      const { result } = renderHook(() => useCalendarView())

      act(() => {
        result.current.setStatusFilter("completed")
      })

      expect(result.current.statusFilter).toBe("completed")
    })

    it("should update hovered date", () => {
      const { result } = renderHook(() => useCalendarView())

      const testDate = new Date("2024-02-15")

      act(() => {
        result.current.setHoveredDate(testDate)
      })

      expect(result.current.hoveredDate?.toDateString()).toBe(testDate.toDateString())
    })
  })
})
