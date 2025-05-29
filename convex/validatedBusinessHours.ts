import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"
import { ValidationError, validateBusinessHours, validateDayOfWeek, validateRequired } from "./utils/validation"

/**
 * Set business hours with comprehensive validation
 */
export const setValidatedBusinessHours = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    dayOfWeek: v.number(),
    isOpen: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    breakTimes: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
          name: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Verify user authorization
      const { user } = await verifyUserRole(ctx, ["business", "admin"])

      // Verify business ownership
      const business = await ctx.db.get(args.businessId)
      if (!business) {
        throw new ValidationError("Business not found")
      }

      if (user.role !== "admin" && business.userId !== user.clerkId) {
        throw new ValidationError("Unauthorized: You can only manage your own business hours")
      }

      // Validate day of week
      validateDayOfWeek(args.dayOfWeek)

      if (args.isOpen) {
        // Validate required fields for open days
        validateRequired(args.openTime, "openTime")
        validateRequired(args.closeTime, "closeTime")

        // Validate business hours
        validateBusinessHours(args.openTime!, args.closeTime!, args.breakTimes)

        // Check for conflicts with existing appointments
        const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][args.dayOfWeek]

        // Get upcoming appointments for this day of week
        const today = new Date()
        const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

        const upcomingAppointments = await ctx.db
          .query("appointments")
          .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
          .filter((q) =>
            q.and(
              q.gte(q.field("date"), today.toISOString().split("T")[0]),
              q.lte(q.field("date"), futureDate.toISOString().split("T")[0]),
              q.neq(q.field("status"), "cancelled"),
            ),
          )
          .collect()

        // Check if any appointments would be outside new business hours
        const openMinutes = parseTimeToMinutes(args.openTime!)
        const closeMinutes = parseTimeToMinutes(args.closeTime!)

        const conflictingAppointments = upcomingAppointments.filter((apt) => {
          const aptDate = new Date(apt.date)
          if (aptDate.getDay() !== args.dayOfWeek) return false

          const aptStart = parseTimeToMinutes(apt.startTime)
          const aptEnd = parseTimeToMinutes(apt.endTime)

          return aptStart < openMinutes || aptEnd > closeMinutes
        })

        if (conflictingAppointments.length > 0) {
          throw new ValidationError(
            `Cannot set these hours. ${conflictingAppointments.length} existing appointments would be outside business hours. Please reschedule or cancel these appointments first.`,
          )
        }
      }

      // Check if business hours already exist for this day
      const existingHours = await ctx.db
        .query("businessHours")
        .withIndex("by_businessId_dayOfWeek", (q) =>
          q.eq("businessId", args.businessId).eq("dayOfWeek", args.dayOfWeek),
        )
        .first()

      const hoursData = {
        businessId: args.businessId,
        dayOfWeek: args.dayOfWeek,
        isOpen: args.isOpen,
        openTime: args.isOpen ? args.openTime : undefined,
        closeTime: args.isOpen ? args.closeTime : undefined,
        breakTimes: args.isOpen ? args.breakTimes : undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: user.clerkId,
      }

      if (existingHours) {
        await ctx.db.patch(existingHours._id, hoursData)
      } else {
        await ctx.db.insert("businessHours", hoursData)
      }

      return { success: true }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error(`Validation Error: ${error.message}`)
      }
      throw error
    }
  },
})

// Helper function to parse time to minutes
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + minutes
}
