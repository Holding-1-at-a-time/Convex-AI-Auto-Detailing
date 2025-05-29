"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
  staffId?: Id<"staff">
  staffName?: string
}

interface DayAvailability {
  date: string
  isOpen: boolean
  openTime?: string
  closeTime?: string
  slots: TimeSlot[]
  blockedSlots: Array<{ startTime: string; endTime: string; reason?: string }>
}

interface UseAvailabilityOptions {
  businessId: Id<"businessProfiles">
  serviceDuration?: number
  staffId?: Id<"staff">
  dateRange?: { start: Date; end: Date }
}

/**
 * Custom hook to fetch and manage business owner availability data
 *
 * Features:
 * - Real-time availability updates
 * - Time slot generation based on service duration
 * - Blocked time slot management
 * - Staff-specific availability
 * - Caching and performance optimization
 *
 * @param options - Configuration options for availability
 * @returns Availability data and management functions
 */
export function useAvailability(options: UseAvailabilityOptions) {
  const { businessId, serviceDuration = 60, staffId, dateRange } = options

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<"week" | "month">("week")
  const [isLoading, setIsLoading] = useState(false)
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, DayAvailability>>(new Map())

  // Calculate date range
  const calculatedDateRange = useMemo(() => {
    if (dateRange) return dateRange

    const start =
      viewMode === "week"
        ? startOfWeek(selectedDate, { weekStartsOn: 1 })
        : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)

    const end =
      viewMode === "week"
        ? endOfWeek(selectedDate, { weekStartsOn: 1 })
        : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

    return { start, end }
  }, [selectedDate, viewMode, dateRange])

  // Convex queries
  const businessHours = useQuery(api.businessAvailability.getBusinessAvailability, businessId ? { businessId } : "skip")

  const blockedSlots = useQuery(api.availability.getBlockedTimeSlots, businessId ? { businessId } : "skip")

  const appointments = useQuery(
    api.appointments.getAppointmentsByDateRange,
    businessId
      ? {
          businessId,
          startDate: format(calculatedDateRange.start, "yyyy-MM-dd"),
          endDate: format(calculatedDateRange.end, "yyyy-MM-dd"),
        }
      : "skip",
  )

  const staffAvailability = useQuery(api.staff.getStaffAvailability, staffId ? { staffId, businessId } : "skip")

  // Mutations
  const blockTimeSlot = useMutation(api.availability.blockTimeSlot)
  const removeBlockedSlot = useMutation(api.availability.removeBlockedTimeSlot)

  /**
   * Generate time slots for a specific day
   */
  const generateTimeSlots = useCallback(
    (date: Date, openTime: string, closeTime: string, duration: number): TimeSlot[] => {
      const slots: TimeSlot[] = []
      const [openHour, openMinute] = openTime.split(":").map(Number)
      const [closeHour, closeMinute] = closeTime.split(":").map(Number)

      let currentTime = new Date(date)
      currentTime.setHours(openHour, openMinute, 0, 0)

      const endTime = new Date(date)
      endTime.setHours(closeHour, closeMinute, 0, 0)

      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000)

        if (slotEnd <= endTime) {
          slots.push({
            startTime: format(currentTime, "HH:mm"),
            endTime: format(slotEnd, "HH:mm"),
            available: true,
          })
        }

        currentTime = new Date(currentTime.getTime() + 30 * 60000) // 30-minute intervals
      }

      return slots
    },
    [],
  )

  /**
   * Check if a time slot is blocked
   */
  const isSlotBlocked = useCallback(
    (date: string, startTime: string, endTime: string, blockedList: typeof blockedSlots): boolean => {
      if (!blockedList) return false

      return blockedList.some((blocked) => {
        if (blocked.date !== date) return false

        const slotStart = new Date(`${date} ${startTime}`)
        const slotEnd = new Date(`${date} ${endTime}`)
        const blockedStart = new Date(`${blocked.date} ${blocked.startTime}`)
        const blockedEnd = new Date(`${blocked.date} ${blocked.endTime}`)

        return (
          (slotStart >= blockedStart && slotStart < blockedEnd) ||
          (slotEnd > blockedStart && slotEnd <= blockedEnd) ||
          (slotStart <= blockedStart && slotEnd >= blockedEnd)
        )
      })
    },
    [],
  )

  /**
   * Check if a time slot has an appointment
   */
  const isSlotBooked = useCallback(
    (date: string, startTime: string, endTime: string, appointmentList: typeof appointments): boolean => {
      if (!appointmentList) return false

      return appointmentList.some((apt) => {
        if (apt.date !== date || apt.status === "cancelled") return false

        const slotStart = new Date(`${date} ${startTime}`)
        const slotEnd = new Date(`${date} ${endTime}`)
        const aptStart = new Date(`${apt.date} ${apt.startTime}`)
        const aptEnd = new Date(`${apt.date} ${apt.endTime}`)

        return (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        )
      })
    },
    [],
  )

  /**
   * Get availability for a specific date
   */
  const getDateAvailability = useCallback(
    (date: Date): DayAvailability => {
      const dateStr = format(date, "yyyy-MM-dd")
      const dayOfWeek = format(date, "EEEE").toLowerCase()

      // Check cache first
      const cached = availabilityCache.get(dateStr)
      if (cached) return cached

      // Default closed day
      const defaultAvailability: DayAvailability = {
        date: dateStr,
        isOpen: false,
        slots: [],
        blockedSlots: [],
      }

      if (!businessHours) return defaultAvailability

      const dayHours = businessHours.businessHours?.[dayOfWeek]
      if (!dayHours?.isOpen || !dayHours.openTime || !dayHours.closeTime) {
        return defaultAvailability
      }

      // Generate time slots
      const slots = generateTimeSlots(date, dayHours.openTime, dayHours.closeTime, serviceDuration)

      // Filter blocked slots
      const dayBlockedSlots = blockedSlots?.filter((slot) => slot.date === dateStr) || []

      // Mark unavailable slots
      slots.forEach((slot) => {
        if (isSlotBlocked(dateStr, slot.startTime, slot.endTime, blockedSlots)) {
          slot.available = false
        } else if (isSlotBooked(dateStr, slot.startTime, slot.endTime, appointments)) {
          slot.available = false
        }

        // Add staff information if available
        if (staffId && staffAvailability) {
          const staffSlot = staffAvailability.availability?.find(
            (avail) => avail.date === dateStr && avail.startTime === slot.startTime,
          )
          if (staffSlot) {
            slot.staffId = staffId
            slot.staffName = staffAvailability.name
          }
        }
      })

      const availability: DayAvailability = {
        date: dateStr,
        isOpen: true,
        openTime: dayHours.openTime,
        closeTime: dayHours.closeTime,
        slots,
        blockedSlots: dayBlockedSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          reason: slot.reason,
        })),
      }

      // Cache the result
      setAvailabilityCache((prev) => new Map(prev).set(dateStr, availability))

      return availability
    },
    [
      businessHours,
      blockedSlots,
      appointments,
      serviceDuration,
      staffId,
      staffAvailability,
      generateTimeSlots,
      isSlotBlocked,
      isSlotBooked,
      availabilityCache,
    ],
  )

  /**
   * Get availability for date range
   */
  const getAvailabilityForRange = useCallback((): Map<string, DayAvailability> => {
    const availability = new Map<string, DayAvailability>()
    const days = eachDayOfInterval(calculatedDateRange)

    days.forEach((day) => {
      const dayAvailability = getDateAvailability(day)
      availability.set(dayAvailability.date, dayAvailability)
    })

    return availability
  }, [calculatedDateRange, getDateAvailability])

  /**
   * Find next available slot
   */
  const findNextAvailableSlot = useCallback(
    (fromDate: Date = new Date()): TimeSlot | null => {
      const maxDays = 30 // Look up to 30 days ahead

      for (let i = 0; i < maxDays; i++) {
        const checkDate = addDays(fromDate, i)
        const availability = getDateAvailability(checkDate)

        if (availability.isOpen) {
          const availableSlot = availability.slots.find((slot) => slot.available)
          if (availableSlot) {
            return {
              ...availableSlot,
              startTime: `${format(checkDate, "yyyy-MM-dd")} ${availableSlot.startTime}`,
              endTime: `${format(checkDate, "yyyy-MM-dd")} ${availableSlot.endTime}`,
            }
          }
        }
      }

      return null
    },
    [getDateAvailability],
  )

  /**
   * Block a time slot
   */
  const handleBlockTimeSlot = useCallback(
    async (
      date: string,
      startTime: string,
      endTime: string,
      reason?: string,
      isRecurring?: boolean,
      recurringPattern?: "daily" | "weekly" | "monthly",
    ) => {
      try {
        await blockTimeSlot({
          businessId,
          date,
          startTime,
          endTime,
          reason,
          isRecurring,
          recurringPattern,
        })

        // Clear cache for affected date
        setAvailabilityCache((prev) => {
          const newCache = new Map(prev)
          newCache.delete(date)
          return newCache
        })

        return true
      } catch (error) {
        console.error("Error blocking time slot:", error)
        return false
      }
    },
    [businessId, blockTimeSlot],
  )

  /**
   * Remove a blocked slot
   */
  const handleRemoveBlockedSlot = useCallback(
    async (slotId: Id<"blockedTimeSlots">) => {
      try {
        await removeBlockedSlot({ slotId })

        // Clear entire cache as we don't know which date was affected
        setAvailabilityCache(new Map())

        return true
      } catch (error) {
        console.error("Error removing blocked slot:", error)
        return false
      }
    },
    [removeBlockedSlot],
  )

  /**
   * Navigate to previous period
   */
  const navigatePrevious = useCallback(() => {
    setSelectedDate((prev) => {
      if (viewMode === "week") {
        return addDays(prev, -7)
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      }
    })
  }, [viewMode])

  /**
   * Navigate to next period
   */
  const navigateNext = useCallback(() => {
    setSelectedDate((prev) => {
      if (viewMode === "week") {
        return addDays(prev, 7)
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      }
    })
  }, [viewMode])

  /**
   * Navigate to today
   */
  const navigateToday = useCallback(() => {
    setSelectedDate(new Date())
  }, [])

  // Clear cache when dependencies change
  useEffect(() => {
    setAvailabilityCache(new Map())
  }, [businessId, serviceDuration, staffId])

  // Calculate statistics
  const statistics = useMemo(() => {
    const rangeAvailability = getAvailabilityForRange()
    let totalSlots = 0
    let availableSlots = 0
    let bookedSlots = 0
    let blockedSlotsCount = 0

    rangeAvailability.forEach((day) => {
      if (day.isOpen) {
        day.slots.forEach((slot) => {
          totalSlots++
          if (slot.available) {
            availableSlots++
          } else {
            bookedSlots++
          }
        })
        blockedSlotsCount += day.blockedSlots.length
      }
    })

    return {
      totalSlots,
      availableSlots,
      bookedSlots,
      blockedSlotsCount,
      utilizationRate: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0,
    }
  }, [getAvailabilityForRange])

  return {
    // State
    selectedDate,
    viewMode,
    isLoading: !businessHours,
    dateRange: calculatedDateRange,

    // Data
    businessHours,
    blockedSlots,
    appointments,
    statistics,

    // Functions
    getDateAvailability,
    getAvailabilityForRange,
    findNextAvailableSlot,
    handleBlockTimeSlot,
    handleRemoveBlockedSlot,

    // Navigation
    setSelectedDate,
    setViewMode,
    navigatePrevious,
    navigateNext,
    navigateToday,

    // Utilities
    isSlotBlocked,
    isSlotBooked,
  }
}
