import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Set business availability
export const setBusinessAvailability = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    dayOfWeek: v.string(),
    isOpen: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Verify ownership
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business availability")
    }

    // Update business hours
    const currentHours = businessProfile.businessHours || {}

    if (args.isOpen) {
      currentHours[args.dayOfWeek] = {
        open: args.openTime || "09:00",
        close: args.closeTime || "17:00",
      }
    } else {
      currentHours[args.dayOfWeek] = null
    }

    await ctx.db.patch(args.businessId, {
      businessHours: currentHours,
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Get available time slots for booking
export const getAvailableTimeSlots = query({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    serviceDuration: v.number(), // in minutes
  },
  handler: async (ctx, args) => {
    // Get business profile
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Get day of week
    const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })
    const businessHours = businessProfile.businessHours?.[dayOfWeek]

    if (!businessHours) {
      return [] // Business is closed this day
    }

    // Get existing appointments for this date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.and(q.eq(q.field("businessId"), args.businessId), q.neq(q.field("status"), "cancelled")))
      .collect()

    // Generate time slots
    const slots = []
    const openTime = parseTime(businessHours.open)
    const closeTime = parseTime(businessHours.close)
    const slotDuration = args.serviceDuration
    const interval = 30 // 30-minute intervals

    let currentTime = openTime
    while (currentTime + slotDuration <= closeTime) {
      const endTime = currentTime + slotDuration

      // Check if slot conflicts with existing appointments
      const hasConflict = appointments.some((appt) => {
        const apptStart = parseTime(appt.startTime)
        const apptEnd = parseTime(appt.endTime)

        return (
          (currentTime >= apptStart && currentTime < apptEnd) ||
          (endTime > apptStart && endTime <= apptEnd) ||
          (currentTime <= apptStart && endTime >= apptEnd)
        )
      })

      if (!hasConflict) {
        slots.push({
          startTime: formatTime(currentTime),
          endTime: formatTime(endTime),
          available: true,
        })
      }

      currentTime += interval
    }

    return slots
  },
})

// Helper functions
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

// Block time slots for business
export const blockTimeSlot = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Verify ownership
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business availability")
    }

    // Create blocked time slot
    await ctx.db.insert("blockedTimeSlots", {
      businessId: args.businessId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      reason: args.reason,
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  },
})
