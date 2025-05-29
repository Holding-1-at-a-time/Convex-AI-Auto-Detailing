import { v } from "convex/values"
import { mutation } from "./_generated/server"
import {
  ValidationError,
  validateAppointmentData,
  validateAppointmentStatus,
  validateAppointmentConflict,
  validateFutureDate,
  validateTimeRange,
  validateTextLength,
} from "./utils/validation"

/**
 * Create appointment with comprehensive validation
 */
export const createValidatedAppointment = mutation({
  args: {
    customerId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    businessId: v.id("businessProfiles"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Comprehensive validation
      validateAppointmentData({
        customerId: args.customerId,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        serviceType: args.serviceType,
        price: args.price,
        businessId: args.businessId,
        notes: args.notes,
      })

      // Verify business exists and is active
      const business = await ctx.db.get(args.businessId)
      if (!business) {
        throw new ValidationError("Business not found")
      }

      // Check business hours for the requested date
      const dayOfWeek = new Date(args.date).getDay()
      const businessHours = await ctx.db
        .query("businessHours")
        .withIndex("by_businessId_dayOfWeek", (q) => q.eq("businessId", args.businessId).eq("dayOfWeek", dayOfWeek))
        .first()

      if (!businessHours || !businessHours.isOpen) {
        throw new ValidationError("Business is closed on the selected date")
      }

      // Validate appointment time is within business hours
      const requestedStart = parseTimeToMinutes(args.startTime)
      const requestedEnd = parseTimeToMinutes(args.endTime)
      const businessOpen = parseTimeToMinutes(businessHours.openTime!)
      const businessClose = parseTimeToMinutes(businessHours.closeTime!)

      if (requestedStart < businessOpen || requestedEnd > businessClose) {
        throw new ValidationError(
          `Appointment must be within business hours: ${businessHours.openTime} - ${businessHours.closeTime}`,
        )
      }

      // Check for conflicts with existing appointments
      const existingAppointments = await ctx.db
        .query("appointments")
        .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect()

      validateAppointmentConflict(
        existingAppointments.map((apt) => ({
          startTime: apt.startTime,
          endTime: apt.endTime,
          _id: apt._id,
        })),
        args.startTime,
        args.endTime,
      )

      // Check for conflicts with blocked time slots
      const blockedSlots = await ctx.db
        .query("blockedTimeSlots")
        .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect()

      for (const blocked of blockedSlots) {
        const blockedStart = parseTimeToMinutes(blocked.startTime)
        const blockedEnd = parseTimeToMinutes(blocked.endTime)

        if (
          (requestedStart < blockedEnd && requestedEnd > blockedStart) ||
          (blockedStart < requestedEnd && blockedEnd > requestedStart)
        ) {
          throw new ValidationError(
            `Selected time conflicts with blocked period: ${blocked.startTime} - ${blocked.endTime}${
              blocked.reason ? ` (${blocked.reason})` : ""
            }`,
          )
        }
      }

      // Verify vehicle belongs to customer if specified
      if (args.vehicleId) {
        const vehicle = await ctx.db.get(args.vehicleId)
        if (!vehicle || vehicle.customerId !== args.customerId) {
          throw new ValidationError("Vehicle not found or does not belong to customer")
        }
      }

      // Create the appointment
      const appointmentId = await ctx.db.insert("appointments", {
        customerId: args.customerId,
        vehicleId: args.vehicleId,
        businessId: args.businessId,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        serviceType: args.serviceType,
        status: "scheduled",
        price: args.price,
        notes: args.notes,
        reminderSent: false,
        followupSent: false,
        createdAt: new Date().toISOString(),
      })

      return { success: true, appointmentId }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error(`Validation Error: ${error.message}`)
      }
      throw error
    }
  },
})

/**
 * Update appointment with validation
 */
export const updateValidatedAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Get existing appointment
      const appointment = await ctx.db.get(args.appointmentId)
      if (!appointment) {
        throw new ValidationError("Appointment not found")
      }

      // Validate status if provided
      if (args.status) {
        validateAppointmentStatus(args.status)

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
          scheduled: ["confirmed", "cancelled", "rescheduled"],
          confirmed: ["in-progress", "cancelled", "no-show"],
          "in-progress": ["completed", "cancelled"],
          completed: [], // Cannot change from completed
          cancelled: [], // Cannot change from cancelled
          "no-show": [], // Cannot change from no-show
          rescheduled: ["scheduled", "cancelled"],
        }

        const allowedStatuses = validTransitions[appointment.status] || []
        if (!allowedStatuses.includes(args.status)) {
          throw new ValidationError(`Cannot change status from ${appointment.status} to ${args.status}`)
        }
      }

      // Validate time changes if provided
      if (args.date || args.startTime || args.endTime) {
        const newDate = args.date || appointment.date
        const newStartTime = args.startTime || appointment.startTime
        const newEndTime = args.endTime || appointment.endTime

        validateFutureDate(newDate)
        validateTimeRange(newStartTime, newEndTime)

        // Check for conflicts if time is changing
        if (args.date || args.startTime || args.endTime) {
          const existingAppointments = await ctx.db
            .query("appointments")
            .withIndex("by_businessId_date", (q) => q.eq("businessId", appointment.businessId!).eq("date", newDate))
            .filter((q) => q.neq(q.field("status"), "cancelled"))
            .collect()

          validateAppointmentConflict(
            existingAppointments.map((apt) => ({
              startTime: apt.startTime,
              endTime: apt.endTime,
              _id: apt._id,
            })),
            newStartTime,
            newEndTime,
            args.appointmentId,
          )
        }
      }

      // Validate notes length if provided
      if (args.notes) {
        validateTextLength(args.notes, 1, 1000, "notes")
      }

      // Validate price if provided
      if (args.price !== undefined) {
        if (args.price < 0) {
          throw new ValidationError("Price cannot be negative")
        }
        if (args.price > 10000) {
          throw new ValidationError("Price cannot exceed $10,000")
        }
      }

      // Update the appointment
      const updates: any = {
        updatedAt: new Date().toISOString(),
      }

      if (args.date) updates.date = args.date
      if (args.startTime) updates.startTime = args.startTime
      if (args.endTime) updates.endTime = args.endTime
      if (args.status) updates.status = args.status
      if (args.notes) updates.notes = args.notes
      if (args.price !== undefined) updates.price = args.price

      await ctx.db.patch(args.appointmentId, updates)

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
