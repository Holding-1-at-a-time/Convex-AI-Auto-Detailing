"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns"

interface CalendarDay {
  date: Date
  dateString: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  appointments: Array<{
    id: Id<"appointments">
    time: string
    title: string
    status: string
    customerName?: string
  }>
  isAvailable: boolean
  hasAvailableSlots: boolean
}

interface CalendarEvent {
  id: Id<"appointments">
  title: string
  start: Date
  end: Date
  status: string
  customerName?: string
  serviceName?: string
  price?: number
}

interface UseCalendarViewOptions {
  businessId?: Id<"businessProfiles">
  customerId?: string
  defaultView?: "month" | "week" | "day"
  onDateSelect?: (date: Date) => void
  onEventSelect?: (event: CalendarEvent) => void
}

/**
 * Custom hook to manage calendar view state and logic
 *
 * Features:
 * - Multiple view modes (month, week, day)
 * - Appointment display and navigation
 * - Date selection and highlighting
 * - Event filtering and search
 * - Responsive layout management
 *
 * @param options - Configuration options for calendar view
 * @returns Calendar state and management functions
 */
export function useCalendarView(options: UseCalendarViewOptions = {}) {
  const { businessId, customerId, defaultView = "month", onDateSelect, onEventSelect } = options

  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">(defaultView)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // Convex queries
  const appointments = useQuery(
    api.appointments.getAppointmentsByDateRange,
    businessId || customerId
      ? {
          businessId,
          customerId,
          startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
          endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
        }
      : "skip",
  )

  const businessAvailability = useQuery(
    api.businessAvailability.getBusinessAvailability,
    businessId ? { businessId } : "skip",
  )

  /**
   * Get calendar days for current view
   */
  const calendarDays = useMemo((): CalendarDay[] => {
    let start: Date
    let end: Date

    switch (viewMode) {
      case "month":
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        start = startOfWeek(monthStart, { weekStartsOn: 0 })
        end = endOfWeek(monthEnd, { weekStartsOn: 0 })
        break
      case "week":
        start = startOfWeek(currentDate, { weekStartsOn: 0 })
        end = endOfWeek(currentDate, { weekStartsOn: 0 })
        break
      case "day":
        start = currentDate
        end = currentDate
        break
      default:
        start = currentDate
        end = currentDate
    }

    const days = eachDayOfInterval({ start, end })

    return days.map((date) => {
      const dateString = format(date, "yyyy-MM-dd")
      const dayOfWeek = format(date, "EEEE").toLowerCase()

      // Get appointments for this day
      const dayAppointments = appointments?.filter((apt) => apt.date === dateString) || []

      // Check if business is open
      const isBusinessOpen = businessAvailability?.businessHours?.[dayOfWeek]?.isOpen || false

      // Filter appointments based on search and status
      const filteredAppointments = dayAppointments
        .filter((apt) => {
          if (statusFilter !== "all" && apt.status !== statusFilter) return false
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return apt.customerName?.toLowerCase().includes(query) || apt.serviceName?.toLowerCase().includes(query)
          }
          return true
        })
        .map((apt) => ({
          id: apt._id,
          time: apt.startTime,
          title: apt.serviceName || "Appointment",
          status: apt.status,
          customerName: apt.customerName,
        }))
        .sort((a, b) => a.time.localeCompare(b.time))

      return {
        date,
        dateString,
        isCurrentMonth: viewMode === "month" ? isSameMonth(date, currentDate) : true,
        isToday: isToday(date),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        appointments: filteredAppointments,
        isAvailable: isBusinessOpen && date >= new Date(),
        hasAvailableSlots: isBusinessOpen && filteredAppointments.length < 8, // Assume max 8 appointments per day
      }
    })
  }, [currentDate, viewMode, selectedDate, appointments, businessAvailability, searchQuery, statusFilter])

  /**
   * Convert appointments to calendar events
   */
  const calendarEvents = useMemo((): CalendarEvent[] => {
    if (!appointments) return []

    return appointments
      .filter((apt) => {
        if (statusFilter !== "all" && apt.status !== statusFilter) return false
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return apt.customerName?.toLowerCase().includes(query) || apt.serviceName?.toLowerCase().includes(query)
        }
        return true
      })
      .map((apt) => ({
        id: apt._id,
        title: apt.serviceName || "Appointment",
        start: new Date(`${apt.date} ${apt.startTime}`),
        end: new Date(`${apt.date} ${apt.endTime}`),
        status: apt.status,
        customerName: apt.customerName,
        serviceName: apt.serviceName,
        price: apt.price,
      }))
  }, [appointments, searchQuery, statusFilter])

  /**
   * Navigate to previous period
   */
  const navigatePrevious = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((prev) => subMonths(prev, 1))
        break
      case "week":
        setCurrentDate((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))
        break
      case "day":
        setCurrentDate((prev) => new Date(prev.getTime() - 24 * 60 * 60 * 1000))
        break
    }
  }, [viewMode])

  /**
   * Navigate to next period
   */
  const navigateNext = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1))
        break
      case "week":
        setCurrentDate((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))
        break
      case "day":
        setCurrentDate((prev) => new Date(prev.getTime() + 24 * 60 * 60 * 1000))
        break
    }
  }, [viewMode])

  /**
   * Navigate to today
   */
  const navigateToday = useCallback(() => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }, [])

  /**
   * Handle date selection
   */
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      onDateSelect?.(date)

      // If in month view and selecting a date, switch to day view
      if (viewMode === "month") {
        setCurrentDate(date)
        setViewMode("day")
      }
    },
    [viewMode, onDateSelect],
  )

  /**
   * Handle event selection
   */
  const handleEventSelect = useCallback(
    (eventId: Id<"appointments">) => {
      const event = calendarEvents.find((e) => e.id === eventId)
      if (event) {
        onEventSelect?.(event)
      }
    },
    [calendarEvents, onEventSelect],
  )

  /**
   * Get week days for header
   */
  const weekDays = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days
  }, [])

  /**
   * Get calendar title based on view mode
   */
  const calendarTitle = useMemo(() => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`
        } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
          return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
        } else {
          return `${format(weekStart, "MMM d, yyyy")} - ${format(weekEnd, "MMM d, yyyy")}`
        }
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
    }
  }, [currentDate, viewMode])

  /**
   * Get statistics for current view
   */
  const statistics = useMemo(() => {
    const totalAppointments = calendarEvents.length
    const completedAppointments = calendarEvents.filter((e) => e.status === "completed").length
    const upcomingAppointments = calendarEvents.filter(
      (e) => e.status === "scheduled" || e.status === "confirmed",
    ).length
    const cancelledAppointments = calendarEvents.filter((e) => e.status === "cancelled").length

    const totalRevenue = calendarEvents
      .filter((e) => e.status === "completed")
      .reduce((sum, e) => sum + (e.price || 0), 0)

    return {
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      cancelledAppointments,
      totalRevenue,
      completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
    }
  }, [calendarEvents])

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          navigatePrevious()
          break
        case "ArrowRight":
          navigateNext()
          break
        case "t":
        case "T":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            navigateToday()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [navigatePrevious, navigateNext, navigateToday])

  return {
    // State
    currentDate,
    selectedDate,
    viewMode,
    searchQuery,
    statusFilter,
    hoveredDate,

    // Data
    calendarDays,
    calendarEvents,
    weekDays,
    calendarTitle,
    statistics,

    // Navigation
    navigatePrevious,
    navigateNext,
    navigateToday,
    setCurrentDate,
    setViewMode,

    // Interactions
    handleDateSelect,
    handleEventSelect,
    setSearchQuery,
    setStatusFilter,
    setHoveredDate,

    // Utilities
    isLoading: !appointments,
  }
}
