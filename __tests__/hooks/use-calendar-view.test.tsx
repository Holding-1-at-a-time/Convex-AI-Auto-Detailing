import { act } from "@testing-library/react"
import { useCalendarView } from "@/hooks/use-calendar-view"
import {
  renderHookWithProviders,
  setupMocks,
  mockConvexQueries,
  createMockAppointment,
  createMockBusinessHours,
} from "./test-utils"
import { format } from "date-fns"

// Mock dependencies
jest.mock("convex/react", () => ({
  useQuery: jest.fn((query, args) => {
    if (args === "skip") return undefined
    return mockConvexQueries[query]?.() || null
  }),
}))

describe("useCalendarView", () => {
  const mockBusinessId = "business_123" as any
  const mockCustomerId = "customer_123"

  beforeEach(() => {
    setupMocks()
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      expect(result.current.currentDate).toBeInstanceOf(Date)
      expect(result.current.selectedDate).toBeNull()
      expect(result.current.viewMode).toBe("month")
      expect(result.current.searchQuery).toBe("")
      expect(result.current.statusFilter).toBe("all")
      expect(result.current.hoveredDate).toBeNull()
    })

    it("should use custom default view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "week" }))

      expect(result.current.viewMode).toBe("week")
    })
  })

  describe("Calendar Days Generation", () => {
    it("should generate calendar days for month view", () => {
      const appointments = [
        createMockAppointment({
          date: format(new Date(), "yyyy-MM-dd"),
          startTime: "10:00",
          serviceName: "Basic Wash",
          customerName: "John Doe",
          status: "scheduled",
        }),
      ]
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      const calendarDays = result.current.calendarDays

      expect(calendarDays.length).toBeGreaterThan(28) // At least 4 weeks
      expect(calendarDays.length).toBeLessThanOrEqual(42) // At most 6 weeks

      // Check that today is marked correctly
      const today = calendarDays.find((day) => day.isToday)
      expect(today).toBeTruthy()

      // Check that appointments are included
      const dayWithAppointment = calendarDays.find((day) => day.appointments.length > 0)
      expect(dayWithAppointment).toBeTruthy()
      expect(dayWithAppointment?.appointments[0].title).toBe("Basic Wash")
    })

    it("should generate calendar days for week view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "week" }))

      act(() => {
        result.current.setViewMode("week")
      })

      const calendarDays = result.current.calendarDays
      expect(calendarDays.length).toBe(7) // Exactly one week
    })

    it("should generate calendar days for day view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "day" }))

      act(() => {
        result.current.setViewMode("day")
      })

      const calendarDays = result.current.calendarDays
      expect(calendarDays.length).toBe(1) // Exactly one day
    })
  })

  describe("Appointment Filtering", () => {
    const mockAppointments = [
      createMockAppointment({
        _id: "apt1",
        date: format(new Date(), "yyyy-MM-dd"),
        serviceName: "Basic Wash",
        customerName: "John Doe",
        status: "scheduled",
      }),
      createMockAppointment({
        _id: "apt2",
        date: format(new Date(), "yyyy-MM-dd"),
        serviceName: "Premium Detail",
        customerName: "Jane Smith",
        status: "completed",
      }),
      createMockAppointment({
        _id: "apt3",
        date: format(new Date(), "yyyy-MM-dd"),
        serviceName: "Interior Clean",
        customerName: "Bob Johnson",
        status: "cancelled",
      }),
    ]

    beforeEach(() => {
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(mockAppointments)
    })

    it("should filter appointments by status", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      // Filter by completed status
      act(() => {
        result.current.setStatusFilter("completed")
      })

      const events = result.current.calendarEvents
      expect(events.length).toBe(1)
      expect(events[0].title).toBe("Premium Detail")
      expect(events[0].status).toBe("completed")
    })

    it("should filter appointments by search query", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      // Search for "Jane"
      act(() => {
        result.current.setSearchQuery("Jane")
      })

      const events = result.current.calendarEvents
      expect(events.length).toBe(1)
      expect(events[0].customerName).toBe("Jane Smith")
    })

    it("should filter appointments by service name", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      // Search for "Premium"
      act(() => {
        result.current.setSearchQuery("Premium")
      })

      const events = result.current.calendarEvents
      expect(events.length).toBe(1)
      expect(events[0].title).toBe("Premium Detail")
    })

    it("should combine status and search filters", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      // Filter by scheduled status and search for "John"
      act(() => {
        result.current.setStatusFilter("scheduled")
        result.current.setSearchQuery("John")
      })

      const events = result.current.calendarEvents
      expect(events.length).toBe(1)
      expect(events[0].customerName).toBe("John Doe")
      expect(events[0].status).toBe("scheduled")
    })
  })

  describe("Navigation", () => {
    it("should navigate to previous month", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      const initialMonth = result.current.currentDate.getMonth()

      act(() => {
        result.current.navigatePrevious()
      })

      const newMonth = result.current.currentDate.getMonth()
      expect(newMonth).toBe(initialMonth === 0 ? 11 : initialMonth - 1)
    })

    it("should navigate to next month", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      const initialMonth = result.current.currentDate.getMonth()

      act(() => {
        result.current.navigateNext()
      })

      const newMonth = result.current.currentDate.getMonth()
      expect(newMonth).toBe(initialMonth === 11 ? 0 : initialMonth + 1)
    })

    it("should navigate to previous week in week view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "week" }))

      const initialDate = new Date(result.current.currentDate)

      act(() => {
        result.current.navigatePrevious()
      })

      const daysDifference = (initialDate.getTime() - result.current.currentDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDifference).toBe(7)
    })

    it("should navigate to previous day in day view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "day" }))

      const initialDate = new Date(result.current.currentDate)

      act(() => {
        result.current.navigatePrevious()
      })

      const daysDifference = (initialDate.getTime() - result.current.currentDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDifference).toBe(1)
    })

    it("should navigate to today", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      // Navigate away from today first
      act(() => {
        result.current.navigateNext()
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
      const onDateSelect = jest.fn()
      const { result } = renderHookWithProviders(() => useCalendarView({ onDateSelect }))

      const testDate = new Date("2024-01-15")

      act(() => {
        result.current.handleDateSelect(testDate)
      })

      expect(result.current.selectedDate).toEqual(testDate)
      expect(onDateSelect).toHaveBeenCalledWith(testDate)
    })

    it("should switch to day view when selecting date in month view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "month" }))

      const testDate = new Date("2024-01-15")

      act(() => {
        result.current.handleDateSelect(testDate)
      })

      expect(result.current.viewMode).toBe("day")
      expect(result.current.currentDate).toEqual(testDate)
    })
  })

  describe("Event Selection", () => {
    it("should handle event selection", () => {
      const onEventSelect = jest.fn()
      const appointments = [
        createMockAppointment({
          _id: "apt1",
          date: format(new Date(), "yyyy-MM-dd"),
          serviceName: "Basic Wash",
          price: 50,
        }),
      ]
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() =>
        useCalendarView({
          businessId: mockBusinessId,
          onEventSelect,
        }),
      )

      act(() => {
        result.current.handleEventSelect("apt1" as any)
      })

      expect(onEventSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "apt1",
          title: "Basic Wash",
          price: 50,
        }),
      )
    })
  })

  describe("Calendar Title", () => {
    it("should generate correct title for month view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      const title = result.current.calendarTitle
      expect(title).toMatch(/\w+ \d{4}/) // Format: "January 2024"
    })

    it("should generate correct title for week view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "week" }))

      const title = result.current.calendarTitle
      expect(title).toContain(" - ") // Should contain date range
    })

    it("should generate correct title for day view", () => {
      const { result } = renderHookWithProviders(() => useCalendarView({ defaultView: "day" }))

      const title = result.current.calendarTitle
      expect(title).toMatch(/\w+, \w+ \d+, \d{4}/) // Format: "Monday, January 15, 2024"
    })
  })

  describe("Statistics", () => {
    it("should calculate calendar statistics", () => {
      const appointments = [
        createMockAppointment({
          status: "completed",
          price: 50,
        }),
        createMockAppointment({
          status: "scheduled",
          price: 75,
        }),
        createMockAppointment({
          status: "cancelled",
          price: 100,
        }),
      ]
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(appointments)

      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      const stats = result.current.statistics

      expect(stats.totalAppointments).toBe(3)
      expect(stats.completedAppointments).toBe(1)
      expect(stats.upcomingAppointments).toBe(1)
      expect(stats.cancelledAppointments).toBe(1)
      expect(stats.totalRevenue).toBe(50) // Only completed appointments
      expect(stats.completionRate).toBe(33) // 1/3 * 100, rounded
    })
  })

  describe("Business Availability Integration", () => {
    it("should mark days as available based on business hours", () => {
      const businessHours = createMockBusinessHours()
      mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(businessHours)

      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      const calendarDays = result.current.calendarDays

      // Find a Monday (should be available)
      const monday = calendarDays.find((day) => day.date && new Date(day.date).getDay() === 1 && day.isCurrentMonth)

      if (monday) {
        expect(monday.isAvailable).toBe(true)
      }

      // Find a Sunday (should be unavailable)
      const sunday = calendarDays.find((day) => day.date && new Date(day.date).getDay() === 0 && day.isCurrentMonth)

      if (sunday) {
        expect(sunday.isAvailable).toBe(false)
      }
    })
  })

  describe("Keyboard Navigation", () => {
    it("should handle keyboard navigation", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      const initialMonth = result.current.currentDate.getMonth()

      // Simulate left arrow key
      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowLeft" })
        window.dispatchEvent(event)
      })

      // Should navigate to previous month
      expect(result.current.currentDate.getMonth()).toBe(initialMonth === 0 ? 11 : initialMonth - 1)
    })

    it("should handle today navigation with Ctrl+T", () => {
      const { result } = renderHookWithProviders(() => useCalendarView())

      // Navigate away from today first
      act(() => {
        result.current.navigateNext()
      })

      // Simulate Ctrl+T
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "T",
          ctrlKey: true,
        })
        Object.defineProperty(event, "preventDefault", {
          value: jest.fn(),
        })
        window.dispatchEvent(event)
      })

      const today = new Date()
      expect(result.current.currentDate.toDateString()).toBe(today.toDateString())
    })
  })

  describe("Loading States", () => {
    it("should show loading state when appointments are not loaded", () => {
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue(undefined)

      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.isLoading).toBe(true)
    })

    it("should not show loading state when appointments are loaded", () => {
      mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue([])

      const { result } = renderHookWithProviders(() => useCalendarView({ businessId: mockBusinessId }))

      expect(result.current.isLoading).toBe(false)
    })
  })
})
