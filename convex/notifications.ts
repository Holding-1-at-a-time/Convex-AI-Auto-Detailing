import { v } from "convex/values"
import { mutation, action, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { verifyUserRole } from "./utils/auth"

// Send appointment confirmation
export const sendAppointmentConfirmation = action({
  args: {
    appointmentId: v.id("appointments"),
    type: v.string(), // "confirmation", "reminder", "cancellation", "update"
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

    // Get business profile
    const businessProfile = await ctx.runQuery(async (ctx) => {
      return await ctx.db.get(appointment.businessId)
    })

    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Get service details
    let serviceName = appointment.serviceType
    let servicePrice = appointment.price

    if (appointment.serviceId) {
      const service = await ctx.runQuery(async (ctx) => {
        return await ctx.db.get(appointment.serviceId)
      })

      if (service) {
        serviceName = service.name
        servicePrice = service.price
      }
    }

    // Get vehicle details if available
    let vehicleInfo = "your vehicle"
    if (appointment.vehicleId) {
      const vehicle = await ctx.runQuery(async (ctx) => {
        return await ctx.db.get(appointment.vehicleId)
      })

      if (vehicle) {
        vehicleInfo = `your ${vehicle.year} ${vehicle.make} ${vehicle.model}`
      }
    }

    // Prepare notification content
    const notificationContent = {
      confirmation: {
        subject: `Appointment Confirmed - ${businessProfile.businessName}`,
        message: `Your appointment for ${serviceName} on ${appointment.date} at ${appointment.startTime} has been confirmed. We look forward to servicing ${vehicleInfo}. The estimated price is $${servicePrice}.`,
      },
      reminder: {
        subject: `Appointment Reminder - ${businessProfile.businessName}`,
        message: `This is a reminder for your ${serviceName} appointment tomorrow at ${appointment.startTime}. We look forward to servicing ${vehicleInfo}.`,
      },
      cancellation: {
        subject: `Appointment Cancelled - ${businessProfile.businessName}`,
        message: `Your appointment for ${serviceName} on ${appointment.date} at ${appointment.startTime} has been cancelled. Please contact us if you would like to reschedule.`,
      },
      update: {
        subject: `Appointment Updated - ${businessProfile.businessName}`,
        message: `Your appointment for ${serviceName} has been updated. The new date and time is ${appointment.date} at ${appointment.startTime}. Please contact us if you have any questions.`,
      },
    }

    const content = notificationContent[args.type]
    if (!content) {
      throw new Error(`Invalid notification type: ${args.type}`)
    }

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
          businessId: appointment.businessId,
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
          businessId: appointment.businessId,
        }),
      )
    }

    const results = await Promise.all(notifications)

    return { success: true, notificationsSent: results.length }
  },
})

// Queue email notification
export const queueEmailNotification = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    appointmentId: v.optional(v.id("appointments")),
    businessId: v.optional(v.id("businessProfiles")),
    customerId: v.optional(v.string()),
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
      businessId: args.businessId,
      customerId: args.customerId,
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
    businessId: v.optional(v.id("businessProfiles")),
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would integrate with an SMS service
    // For now, we'll store it in a notifications table
    const notificationId = await ctx.db.insert("notifications", {
      type: "sms",
      recipient: args.to,
      body: args.message,
      appointmentId: args.appointmentId,
      businessId: args.businessId,
      customerId: args.customerId,
      status: "queued",
      createdAt: new Date().toISOString(),
    })

    return notificationId
  },
})

// Send a custom notification
export const sendCustomNotification = mutation({
  args: {
    recipientId: v.string(), // User ID
    subject: v.string(),
    message: v.string(),
    notificationType: v.string(), // "email", "sms", "both"
    businessId: v.optional(v.id("businessProfiles")),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner, staff, or admin)
    const { user } = await verifyUserRole(ctx, ["business", "staff", "admin"])

    // If business user or staff, verify they're associated with this business
    if (args.businessId && (user.role === "business" || user.role === "staff")) {
      const business = await ctx.db.get(args.businessId)

      if (user.role === "business" && (!business || business.userId !== user.clerkId)) {
        throw new Error("Unauthorized: You can only send notifications for your business")
      }

      if (user.role === "staff") {
        const staff = await ctx.db
          .query("staff")
          .filter((q) => q.and(q.eq(q.field("userId"), user.clerkId), q.eq(q.field("businessId"), args.businessId)))
          .first()

        if (!staff) {
          throw new Error("Unauthorized: You can only send notifications for your business")
        }
      }
    }

    // Get recipient profile
    const recipient = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.recipientId))
      .first()

    if (!recipient) {
      throw new Error("Recipient not found")
    }

    const notifications = []

    // Send email notification
    if (args.notificationType === "email" || args.notificationType === "both") {
      if (recipient.email) {
        notifications.push(
          ctx.db.insert("notifications", {
            type: "email",
            recipient: recipient.email,
            subject: args.subject,
            body: args.message,
            customerId: args.recipientId,
            businessId: args.businessId,
            status: "queued",
            createdAt: new Date().toISOString(),
          }),
        )
      }
    }

    // Send SMS notification
    if (args.notificationType === "sms" || args.notificationType === "both") {
      if (recipient.phone) {
        notifications.push(
          ctx.db.insert("notifications", {
            type: "sms",
            recipient: recipient.phone,
            body: args.message,
            customerId: args.recipientId,
            businessId: args.businessId,
            status: "queued",
            createdAt: new Date().toISOString(),
          }),
        )
      }
    }

    const results = await Promise.all(notifications)

    return { success: true, notificationsSent: results.length }
  },
})

// Get notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.string()), // "queued", "sent", "failed", "all"
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to view their own notifications or admins
    if (!user || user.subject !== args.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own notifications")
      }
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.userId))
      .order("desc")

    if (args.status && args.status !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const notifications = await query.take(args.limit || 20)

    return notifications
  },
})

// Get notifications for a business
export const getBusinessNotifications = query({
  args: {
    businessId: v.id("businessProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()), // "queued", "sent", "failed", "all"
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner, staff, or admin)
    const { user } = await verifyUserRole(ctx, ["business", "staff", "admin"])

    // If business user, verify they own this business
    if (user.role === "business") {
      const business = await ctx.db.get(args.businessId)
      if (!business || business.userId !== user.clerkId) {
        throw new Error("Unauthorized: You can only view notifications for your business")
      }
    }

    // If staff user, verify they work for this business
    if (user.role === "staff") {
      const staff = await ctx.db
        .query("staff")
        .filter((q) => q.and(q.eq(q.field("userId"), user.clerkId), q.eq(q.field("businessId"), args.businessId)))
        .first()

      if (!staff) {
        throw new Error("Unauthorized: You can only view notifications for your business")
      }
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .order("desc")

    if (args.status && args.status !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const notifications = await query.take(args.limit || 20)

    return notifications
  },
})

// Process notifications (would be called by a scheduled job in production)
export const processNotifications = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would send the actual notifications
    // For now, we'll just mark them as sent

    // Get queued notifications
    const notifications = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_status", (q) => q.eq("status", "queued"))
        .order("asc")
        .take(args.limit || 10)
    })

    // Process each notification
    const results = await Promise.all(
      notifications.map(async (notification) => {
        // In a real implementation, this would send the actual notification
        // For now, just mark it as sent
        return await ctx.runMutation(async (ctx) => {
          return await ctx.db.patch(notification._id, {
            status: "sent",
            sentAt: new Date().toISOString(),
          })
        })
      }),
    )

    return { success: true, processed: results.length }
  },
})
