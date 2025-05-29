import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Set business availability
export const setBusinessAvailability = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    dayOfWeek: v.string(), // "monday", "tuesday", etc.
    isOpen: v.boolean(),
    openTime: v.optional(v.string()), // "09:00"
    closeTime: v.optional(v.string()), // "17:00"
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business availability")
    }

    // Check if availability record exists
    const existingAvailability = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_day", (q) => q.eq("businessId", args.businessId).eq("dayOfWeek", args.dayOfWeek))
      .first()

    const availabilityData = {
      businessId: args.businessId,
      dayOfWeek: args.dayOfWeek,
      isOpen: args.isOpen,
      openTime: args.openTime,
      closeTime: args.closeTime,
      updatedAt: new Date().toISOString(),
    }

    if (existingAvailability) {
      await ctx.db.patch(existingAvailability._id, availabilityData)
      return existingAvailability._id
    } else {
      const availabilityId = await ctx.db.insert("businessAvailability", {
        ...availabilityData,
        createdAt: new Date().toISOString(),
      })
      return availabilityId
    }
  },
})

// Get business availability
export const getBusinessAvailability = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const availability = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .collect()

    // Convert to object with day as key
    const availabilityByDay = availability.reduce(
      (acc, avail) => {
        acc[avail.dayOfWeek] = {
          isOpen: avail.isOpen,
          openTime: avail.openTime,
          closeTime: avail.closeTime,
        }
        return acc
      },
      {} as Record<string, { isOpen: boolean; openTime?: string; closeTime?: string }>,
    )

    return availabilityByDay
  },
})

// Set special day availability (holidays, etc.)
export const setSpecialDayAvailability = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(), // "2024-12-25"
    isOpen: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business availability")
    }

    // Check if special day already exists
    const existingSpecialDay = await ctx.db
      .query("specialDayAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    const specialDayData = {
      businessId: args.businessId,
      date: args.date,
      isOpen: args.isOpen,
      openTime: args.openTime,
      closeTime: args.closeTime,
      note: args.note,
      updatedAt: new Date().toISOString(),
    }

    if (existingSpecialDay) {
      await ctx.db.patch(existingSpecialDay._id, specialDayData)
      return existingSpecialDay._id
    } else {
      const specialDayId = await ctx.db.insert("specialDayAvailability", {
        ...specialDayData,
        createdAt: new Date().toISOString(),
      })
      return specialDayId
    }
  },
})

// Get available time slots for a date
export const getAvailableTimeSlots = query({
  args: {
    businessId: v.id("businessProfiles"),
    serviceId: v.id("businessServices"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get business availability for the day
    const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })

    const availability = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_day", (q) => q.eq("businessId", args.businessId).eq("dayOfWeek", dayOfWeek))
      .first()

    // Check for special day availability
    const specialDay = await ctx.db
      .query("specialDayAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    // Determine if open and hours
    let isOpen = availability?.isOpen ?? false
    let openTime = availability?.openTime ?? "09:00"
    let closeTime = availability?.closeTime ?? "17:00"

    if (specialDay) {
      isOpen = specialDay.isOpen
      openTime = specialDay.openTime ?? openTime
      closeTime = specialDay.closeTime ?? closeTime
    }

    if (!isOpen) {
      return []
    }

    // Get service duration
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
    }

    // Get existing appointments for the date
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect()

    // Generate time slots
    const timeSlots = []
    const serviceDuration = service.duration
    const slotInterval = 30 // 30-minute intervals

    let currentTime = openTime
    while (currentTime < closeTime) {
      const endTime = addMinutes(currentTime, serviceDuration)

      if (endTime <= closeTime) {
        // Check if this slot conflicts with existing appointments
        const hasConflict = existingAppointments.some((apt) => apt.startTime < endTime && apt.endTime > currentTime)

        if (!hasConflict) {
          timeSlots.push({
            startTime: currentTime,
            endTime,
            available: true,
          })
        }
      }

      currentTime = addMinutes(currentTime, slotInterval)
    }

    return timeSlots
  },
})

// Helper function to add minutes to time string
function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}
