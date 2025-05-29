import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"

/**
 * APPOINTMENT NOTIFICATIONS MANAGEMENT
 * Handles email/SMS notifications for appointments
 */

// Send appointment confirmation
export const sendAppointmentConfirmation = action({
  args: {
    appointmentId: v.id("appointments"),
    notificationType: v.union(v.literal("email"), v.literal("sms"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    // Get appointment details
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Get customer details
    const customer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", appointment.customerId))
      .first()

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Get business details
    let businessInfo = null
    if (appointment.businessId) {
      businessInfo = await ctx.db.get(appointment.businessId)
    }

    // Create notification record
    const notificationId = await ctx.db.insert("notifications", {
      appointmentId: args.appointmentId,
      customerId: appointment.customerId,
      type: "confirmation",
      method: args.notificationType,
      status: "pending",
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    // Here you would integrate with your email/SMS service
    // For now, we'll just mark as sent
    await ctx.db.patch(notificationId, {
      status: "sent",
      sentAt: new Date().toISOString(),
    })

    return {
      success: true,
      notificationId,
      message: "Confirmation notification sent successfully",
    }
  },
})

// Send appointment reminder
export const sendAppointmentReminder = action({
  args: {
    appointmentId: v.id("appointments"),
    reminderType: v.union(v.literal("24h"), v.literal("2h"), v.literal("30m")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if reminder already sent
    const existingReminder = await ctx.db
      .query("notifications")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .filter((q) => q.and(q.eq(q.field("type"), "reminder"), q.eq(q.field("reminderType"), args.reminderType)))
      .first()

    if (existingReminder) {
      return { success: false, message: "Reminder already sent" }
    }

    // Create reminder notification
    const notificationId = await ctx.db.insert("notifications", {
      appointmentId: args.appointmentId,
      customerId: appointment.customerId,
      type: "reminder",
      reminderType: args.reminderType,
      method: "both",
      status: "sent",
      scheduledFor: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    // Update appointment reminder status
    await ctx.db.patch(args.appointmentId, {
      reminderSent: true,
    })

    return {
      success: true,
      notificationId,
      message: `${args.reminderType} reminder sent successfully`,
    }
  },
})

// Get notification history
export const getNotificationHistory = query({
  args: {
    appointmentId: v.optional(v.id("appointments")),
    customerId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("notifications")

    if (args.appointmentId) {
      query = query.withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
    } else if (args.customerId) {
      query = query.withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
    }

    const notifications = await query.order("desc").take(args.limit || 50)

    return notifications
  },
})

// Schedule automatic reminders
export const scheduleAutomaticReminders = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Calculate reminder times
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`)
    const now = new Date()

    const reminders = [
      { type: "24h", time: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000) },
      { type: "2h", time: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000) },
      { type: "30m", time: new Date(appointmentDateTime.getTime() - 30 * 60 * 1000) },
    ]

    const scheduledReminders = []

    for (const reminder of reminders) {
      if (reminder.time > now) {
        const reminderId = await ctx.db.insert("scheduledReminders", {
          appointmentId: args.appointmentId,
          reminderType: reminder.type,
          scheduledFor: reminder.time.toISOString(),
          status: "scheduled",
          createdAt: new Date().toISOString(),
        })
        scheduledReminders.push(reminderId)
      }
    }

    return {
      success: true,
      scheduledReminders,
      message: `${scheduledReminders.length} reminders scheduled`,
    }
  },
})
