import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

// Reschedule an appointment
export const rescheduleAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.string(),
    newEndTime: v.string(),
    reason: v.optional(v.string()),
    rescheduledBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the current appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if appointment can be rescheduled
    if (appointment.status === "cancelled") {
      throw new Error("Cannot reschedule a cancelled appointment")
    }

    if (appointment.status === "completed") {
      throw new Error("Cannot reschedule a completed appointment")
    }

    // Validate new date is not in the past
    const newDate = new Date(args.newDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (newDate < today) {
      throw new Error("Cannot reschedule to a past date")
    }

    // Check for conflicts at the new time
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.newDate))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.appointmentId),
          q.neq(q.field("status"), "cancelled"),
          q.or(
            q.and(q.gte(q.field("startTime"), args.newStartTime), q.lt(q.field("startTime"), args.newEndTime)),
            q.and(q.gt(q.field("endTime"), args.newStartTime), q.lte(q.field("endTime"), args.newEndTime)),
            q.and(q.lte(q.field("startTime"), args.newStartTime), q.gte(q.field("endTime"), args.newEndTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      throw new Error("The new time slot is not available")
    }

    // Store reschedule history
    const rescheduleEntry = {
      originalDate: appointment.date,
      originalStartTime: appointment.startTime,
      originalEndTime: appointment.endTime,
      newDate: args.newDate,
      newStartTime: args.newStartTime,
      newEndTime: args.newEndTime,
      reason: args.reason,
      rescheduledBy: args.rescheduledBy,
      rescheduledAt: new Date().toISOString(),
    }

    const existingHistory = appointment.rescheduleHistory || []

    // Update the appointment
    await ctx.db.patch(args.appointmentId, {
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      rescheduleHistory: [...existingHistory, rescheduleEntry],
      updatedAt: new Date().toISOString(),
      reminderSent: false, // Reset reminder for new date
    })

    // Get customer and business info for notification
    const customer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), appointment.customerId))
      .first()

    let businessName = "Auto Detailing Service"
    if (appointment.businessId) {
      const business = await ctx.db.get(appointment.businessId)
      if (business) {
        businessName = business.name
      }
    }

    // Send rescheduling notification
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.emailNotifications.sendEmailNotification, {
        to: customer.email,
        type: "booking_rescheduled",
        data: {
          customerName: customer.name,
          serviceType: appointment.serviceType,
          newDate: args.newDate,
          newStartTime: args.newStartTime,
          newEndTime: args.newEndTime,
          businessName,
          reason: args.reason,
          appointmentId: args.appointmentId,
        },
      })
    }

    return {
      success: true,
      appointmentId: args.appointmentId,
      newDate: args.newDate,
      newStartTime: args.newStartTime,
      newEndTime: args.newEndTime,
    }
  },
})

// Get reschedule history for an appointment
export const getRescheduleHistory = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    return appointment.rescheduleHistory || []
  },
})

// Check if appointment can be rescheduled
export const canRescheduleAppointment = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      return { canReschedule: false, reason: "Appointment not found" }
    }

    if (appointment.status === "cancelled") {
      return { canReschedule: false, reason: "Appointment is cancelled" }
    }

    if (appointment.status === "completed") {
      return { canReschedule: false, reason: "Appointment is completed" }
    }

    // Check if appointment is within 24 hours
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilAppointment < 24) {
      return {
        canReschedule: false,
        reason: "Cannot reschedule within 24 hours of appointment",
      }
    }

    return { canReschedule: true, reason: null }
  },
})
