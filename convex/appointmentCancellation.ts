import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

// Cancellation policies
const CANCELLATION_POLICIES = {
  // Hours before appointment when cancellation is allowed
  CANCELLATION_DEADLINE_HOURS: 24,
  // Refund percentage based on cancellation timing
  REFUND_POLICIES: [
    { hoursBeforeAppointment: 72, refundPercentage: 100 },
    { hoursBeforeAppointment: 48, refundPercentage: 75 },
    { hoursBeforeAppointment: 24, refundPercentage: 50 },
    { hoursBeforeAppointment: 0, refundPercentage: 0 },
  ],
}

// Cancel an appointment
export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
    cancelledBy: v.string(),
    refundRequested: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if appointment can be cancelled
    if (appointment.status === "cancelled") {
      throw new Error("Appointment is already cancelled")
    }

    if (appointment.status === "completed") {
      throw new Error("Cannot cancel a completed appointment")
    }

    // Calculate cancellation policy
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Determine refund eligibility
    let refundPercentage = 0
    for (const policy of CANCELLATION_POLICIES.REFUND_POLICIES) {
      if (hoursUntilAppointment >= policy.hoursBeforeAppointment) {
        refundPercentage = policy.refundPercentage
        break
      }
    }

    // Update appointment status
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancellationReason: args.reason,
      cancelledBy: args.cancelledBy,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refundPercentage,
      refundRequested: args.refundRequested || false,
    })

    // If it's a bundle booking, update bundle redemption count
    if (appointment.bundleId) {
      const bundle = await ctx.db.get(appointment.bundleId)
      if (bundle) {
        await ctx.db.patch(appointment.bundleId, {
          currentRedemptions: Math.max(0, bundle.currentRedemptions - 1),
        })
      }

      // Update bundle service records
      const serviceRecords = await ctx.db
        .query("bundleServiceRecords")
        .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
        .collect()

      for (const record of serviceRecords) {
        await ctx.db.patch(record._id, {
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        })
      }
    }

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

    // Send cancellation notification
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.emailNotifications.sendEmailNotification, {
        to: customer.email,
        type: "booking_cancelled",
        data: {
          customerName: customer.name,
          serviceType: appointment.serviceType,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName,
          reason: args.reason,
          refundPercentage,
          appointmentId: args.appointmentId,
        },
      })
    }

    return {
      success: true,
      appointmentId: args.appointmentId,
      refundPercentage,
      refundAmount: appointment.price ? (appointment.price * refundPercentage) / 100 : 0,
    }
  },
})

// Get cancellation policy for an appointment
export const getCancellationPolicy = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    if (appointment.status === "cancelled") {
      return {
        canCancel: false,
        reason: "Appointment is already cancelled",
        refundPercentage: 0,
      }
    }

    if (appointment.status === "completed") {
      return {
        canCancel: false,
        reason: "Appointment is completed",
        refundPercentage: 0,
      }
    }

    // Calculate time until appointment
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Determine refund percentage
    let refundPercentage = 0
    for (const policy of CANCELLATION_POLICIES.REFUND_POLICIES) {
      if (hoursUntilAppointment >= policy.hoursBeforeAppointment) {
        refundPercentage = policy.refundPercentage
        break
      }
    }

    const canCancel = hoursUntilAppointment >= CANCELLATION_POLICIES.CANCELLATION_DEADLINE_HOURS

    return {
      canCancel,
      reason: canCancel
        ? null
        : `Cannot cancel within ${CANCELLATION_POLICIES.CANCELLATION_DEADLINE_HOURS} hours of appointment`,
      refundPercentage,
      refundAmount: appointment.price ? (appointment.price * refundPercentage) / 100 : 0,
      hoursUntilAppointment: Math.max(0, hoursUntilAppointment),
      policies: CANCELLATION_POLICIES.REFUND_POLICIES,
    }
  },
})

// Get all cancelled appointments for admin review
export const getCancelledAppointments = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "cancelled"))
      .order("desc")
      .paginate({
        numItems: args.limit || 50,
        cursor: null,
      })

    return appointments
  },
})
