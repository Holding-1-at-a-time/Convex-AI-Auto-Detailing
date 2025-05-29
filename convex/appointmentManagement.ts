import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

/**
 * Reschedule an appointment
 */
export const rescheduleAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.string(),
    newEndTime: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Verify user has permission to reschedule
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized: User not authenticated")
    }

    // Check if user is the customer or business owner
    const isCustomer = appointment.customerId === identity.subject
    const businessProfile = appointment.businessId ? await ctx.db.get(appointment.businessId) : null
    const isBusinessOwner = businessProfile?.userId === identity.subject

    if (!isCustomer && !isBusinessOwner) {
      throw new Error("Unauthorized: You can only reschedule your own appointments")
    }

    // Check for conflicts at the new time
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.newDate))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.appointmentId),
          q.eq(q.field("businessId"), appointment.businessId),
          q.neq(q.field("status"), "cancelled"),
          q.or(
            q.and(q.gte(q.field("startTime"), args.newStartTime), q.lt(q.field("startTime"), args.newEndTime)),
            q.and(q.gt(q.field("endTime"), args.newStartTime), q.lte(q.field("endTime"), args.newEndTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      throw new Error("The selected time slot is not available")
    }

    // Store the old appointment details for history
    const rescheduleHistory = {
      originalDate: appointment.date,
      originalStartTime: appointment.startTime,
      originalEndTime: appointment.endTime,
      rescheduledAt: new Date().toISOString(),
      rescheduledBy: isCustomer ? "customer" : "business",
      reason: args.reason,
    }

    // Update the appointment
    await ctx.db.patch(args.appointmentId, {
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      rescheduleHistory: [...(appointment.rescheduleHistory || []), rescheduleHistory],
      updatedAt: new Date().toISOString(),
    })

    // Create notification for the other party
    const notificationRecipient = isCustomer ? businessProfile?.userId : appointment.customerId
    if (notificationRecipient) {
      await ctx.db.insert("notifications", {
        userId: notificationRecipient,
        type: "appointment_rescheduled",
        title: "Appointment Rescheduled",
        message: `An appointment has been rescheduled from ${appointment.date} ${appointment.startTime} to ${args.newDate} ${args.newStartTime}`,
        data: {
          appointmentId: args.appointmentId,
          oldDate: appointment.date,
          oldTime: appointment.startTime,
          newDate: args.newDate,
          newTime: args.newStartTime,
          reason: args.reason,
        },
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})

/**
 * Get detailed appointment information
 */
export const getAppointmentDetails = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      return null
    }

    // Get customer information
    const customer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", appointment.customerId))
      .first()

    // Get customer profile
    const customerProfile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", appointment.customerId))
      .first()

    // Get vehicle information
    let vehicle = null
    if (appointment.vehicleId) {
      vehicle = await ctx.db.get(appointment.vehicleId)
    }

    // Get business information
    let business = null
    if (appointment.businessId) {
      business = await ctx.db.get(appointment.businessId)
    }

    // Get service information
    const service = await ctx.db
      .query("servicePackages")
      .filter((q) => q.eq(q.field("name"), appointment.serviceType))
      .first()

    // Get staff information
    let staff = null
    if (appointment.staffId) {
      staff = await ctx.db
        .query("staff")
        .withIndex("by_userId", (q) => q.eq("userId", appointment.staffId))
        .first()
    }

    // Get feedback if appointment is completed
    let feedback = null
    if (appointment.status === "completed") {
      feedback = await ctx.db
        .query("feedback")
        .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
        .first()
    }

    return {
      ...appointment,
      customer: customer
        ? {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customerProfile?.phone,
          }
        : null,
      vehicle,
      business,
      service,
      staff,
      feedback,
    }
  },
})

/**
 * Get appointment statistics for a business
 */
export const getAppointmentStatistics = query({
  args: {
    businessId: v.id("businessProfiles"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all appointments in the date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
      .collect()

    // Calculate statistics
    const stats = {
      total: appointments.length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      scheduled: appointments.filter((a) => a.status === "scheduled").length,
      noShow: appointments.filter((a) => a.status === "no-show").length,
      revenue: appointments
        .filter((a) => a.status === "completed" && a.price)
        .reduce((sum, a) => sum + (a.price || 0), 0),
      averageServicePrice: 0,
      popularServices: {} as Record<string, number>,
      busiestDays: {} as Record<string, number>,
      cancellationRate: 0,
      completionRate: 0,
    }

    // Calculate averages and rates
    if (stats.completed > 0) {
      stats.averageServicePrice = stats.revenue / stats.completed
    }

    if (stats.total > 0) {
      stats.cancellationRate = (stats.cancelled / stats.total) * 100
      stats.completionRate = (stats.completed / stats.total) * 100
    }

    // Calculate popular services
    appointments.forEach((apt) => {
      if (apt.serviceType) {
        stats.popularServices[apt.serviceType] = (stats.popularServices[apt.serviceType] || 0) + 1
      }
    })

    // Calculate busiest days
    appointments.forEach((apt) => {
      const dayOfWeek = new Date(apt.date).toLocaleDateString("en-US", { weekday: "long" })
      stats.busiestDays[dayOfWeek] = (stats.busiestDays[dayOfWeek] || 0) + 1
    })

    return stats
  },
})

/**
 * Batch update appointment statuses
 */
export const batchUpdateAppointmentStatuses = mutation({
  args: {
    updates: v.array(
      v.object({
        appointmentId: v.id("appointments"),
        status: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    const results = []

    for (const update of args.updates) {
      try {
        const appointment = await ctx.db.get(update.appointmentId)
        if (!appointment) {
          results.push({
            appointmentId: update.appointmentId,
            success: false,
            error: "Appointment not found",
          })
          continue
        }

        // Verify business ownership
        if (appointment.businessId) {
          const business = await ctx.db.get(appointment.businessId)
          if (business && user.role !== "admin" && business.userId !== user.clerkId) {
            results.push({
              appointmentId: update.appointmentId,
              success: false,
              error: "Unauthorized",
            })
            continue
          }
        }

        // Update the appointment
        await ctx.db.patch(update.appointmentId, {
          status: update.status,
          notes: update.notes ? `${appointment.notes || ""}\n${update.notes}` : appointment.notes,
          updatedAt: new Date().toISOString(),
        })

        results.push({
          appointmentId: update.appointmentId,
          success: true,
        })
      } catch (error) {
        results.push({
          appointmentId: update.appointmentId,
          success: false,
          error: error.message,
        })
      }
    }

    return {
      total: args.updates.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    }
  },
})
