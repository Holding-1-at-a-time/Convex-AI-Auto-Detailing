import { v } from "convex/values"
import { mutation, action } from "./_generated/server"
import { internal } from "./_generated/api"

// Send appointment confirmation
export const sendAppointmentConfirmation = action({
  args: {
    appointmentId: v.id("appointments"),
    type: v.string(), // "confirmation", "reminder", "cancellation"
  },
  handler: async (ctx, args) => {
    // Get appointment details
    const appointment = await ctx.runQuery(internal.appointments.getAppointmentWithDetails, {
      appointmentId: args.appointmentId,
    })

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Get customer profile
    const customerProfile = await ctx.runQuery(internal.customerProfiles.getCustomerProfileByUserId, {
      userId: appointment.customerId,
    })

    if (!customerProfile) {
      throw new Error("Customer profile not found")
    }

    // Prepare notification content
    const notificationContent = {
      confirmation: {
        subject: "Appointment Confirmed - AutoDetailAI",
        message: `Your appointment for ${appointment.serviceType} on ${appointment.date} at ${appointment.startTime} has been confirmed.`,
      },
      reminder: {
        subject: "Appointment Reminder - AutoDetailAI",
        message: `This is a reminder for your ${appointment.serviceType} appointment tomorrow at ${appointment.startTime}.`,
      },
      cancellation: {
        subject: "Appointment Cancelled - AutoDetailAI",
        message: `Your appointment for ${appointment.serviceType} on ${appointment.date} has been cancelled.`,
      },
    }

    const content = notificationContent[args.type]

    // Send notifications based on customer preferences
    const notifications = []

    if (customerProfile.notificationPreferences?.email) {
      // Queue email notification
      notifications.push(
        ctx.runMutation(internal.notifications.queueEmailNotification, {
          to: customerProfile.email,
          subject: content.subject,
          body: content.message,
          appointmentId: args.appointmentId,
        }),
      )
    }

    if (customerProfile.notificationPreferences?.sms && customerProfile.phone) {
      // Queue SMS notification
      notifications.push(
        ctx.runMutation(internal.notifications.queueSmsNotification, {
          to: customerProfile.phone,
          message: content.message,
          appointmentId: args.appointmentId,
        }),
      )
    }

    await Promise.all(notifications)

    return { success: true, notificationsSent: notifications.length }
  },
})

// Queue email notification
export const queueEmailNotification = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would integrate with an email service
    // For now, we'll store it in a notifications table
    const notificationId = await ctx.db.insert("notifications", {
      type: "email",
      recipient: args.to,
      subject: args.subject,
      body: args.body,
      appointmentId: args.appointmentId,
      status: "queued",
      createdAt: new Date().toISOString(),
    })

    return notificationId
  },
})

// Queue SMS notification
export const queueSmsNotification = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would integrate with an SMS service
    // For now, we'll store it in a notifications table
    const notificationId = await ctx.db.insert("notifications", {
      type: "sms",
      recipient: args.to,
      body: args.message,
      appointmentId: args.appointmentId,
      status: "queued",
      createdAt: new Date().toISOString(),
    })

    return notificationId
  },
})
