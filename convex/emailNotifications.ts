import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import { internal } from "./_generated/api"

// Email templates for different notification types
const EMAIL_TEMPLATES = {
  booking_reminder: {
    subject: "Reminder: Your Auto Detailing Appointment Tomorrow",
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Reminder</h2>
        <p>Hi ${data.customerName},</p>
        <p>This is a friendly reminder about your upcoming auto detailing appointment:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${data.serviceType}</h3>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Location:</strong> ${data.businessName}</p>
          ${data.bundleId ? `<p><strong>Bundle:</strong> ${data.bundleName}</p>` : ""}
          <p><strong>Total Price:</strong> $${data.price}</p>
        </div>
        <p>Please ensure your vehicle is accessible and ready for service.</p>
        <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        <p>Thank you for choosing our services!</p>
      </div>
    `,
  },
  booking_confirmation: {
    subject: "Booking Confirmed - Auto Detailing Service",
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Booking Confirmed!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your auto detailing appointment has been confirmed:</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin: 0 0 10px 0;">${data.serviceType}</h3>
          <p><strong>Confirmation #:</strong> ${data.appointmentId}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Location:</strong> ${data.businessName}</p>
          ${data.bundleId ? `<p><strong>Bundle:</strong> ${data.bundleName}</p>` : ""}
          <p><strong>Total Price:</strong> $${data.price}</p>
        </div>
        <p>We'll send you a reminder 24 hours before your appointment.</p>
        <p>Need to make changes? <a href="${data.manageBookingUrl}">Manage your booking</a></p>
      </div>
    `,
  },
  booking_cancelled: {
    subject: "Appointment Cancelled - Auto Detailing Service",
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Appointment Cancelled</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your auto detailing appointment has been cancelled:</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0;">${data.serviceType}</h3>
          <p><strong>Original Date:</strong> ${data.date}</p>
          <p><strong>Original Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Cancellation Reason:</strong> ${data.reason || "Not specified"}</p>
        </div>
        <p>If you'd like to book a new appointment, please visit our booking page.</p>
        <p>Thank you for your understanding.</p>
      </div>
    `,
  },
  booking_rescheduled: {
    subject: "Appointment Rescheduled - Auto Detailing Service",
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Appointment Rescheduled</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your auto detailing appointment has been rescheduled:</p>
        <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
          <h3 style="margin: 0 0 10px 0;">${data.serviceType}</h3>
          <p><strong>New Date:</strong> ${data.newDate}</p>
          <p><strong>New Time:</strong> ${data.newStartTime} - ${data.newEndTime}</p>
          <p><strong>Location:</strong> ${data.businessName}</p>
          <p><strong>Reason:</strong> ${data.reason || "Schedule adjustment"}</p>
        </div>
        <p>We'll send you a reminder 24 hours before your new appointment time.</p>
        <p>Thank you for your flexibility!</p>
      </div>
    `,
  },
}

// Send email notification action
export const sendEmailNotification = action({
  args: {
    to: v.string(),
    type: v.union(
      v.literal("booking_reminder"),
      v.literal("booking_confirmation"),
      v.literal("booking_cancelled"),
      v.literal("booking_rescheduled"),
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const template = EMAIL_TEMPLATES[args.type]
    if (!template) {
      throw new Error(`Unknown email template: ${args.type}`)
    }

    // In a real implementation, you would integrate with an email service like SendGrid, Resend, or AWS SES
    // For now, we'll log the email content
    console.log("Sending email:", {
      to: args.to,
      subject: template.subject,
      html: template.template(args.data),
    })

    // Store email log for tracking
    await ctx.runMutation(internal.emailNotifications.logEmailSent, {
      to: args.to,
      type: args.type,
      subject: template.subject,
      sentAt: new Date().toISOString(),
      status: "sent",
    })

    return { success: true }
  },
})

// Log sent emails
export const logEmailSent = mutation({
  args: {
    to: v.string(),
    type: v.string(),
    subject: v.string(),
    sentAt: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", args)
  },
})

// Schedule reminder emails
export const scheduleReminderEmails = mutation({
  args: {},
  handler: async (ctx) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    // Get all appointments for tomorrow that haven't had reminders sent
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", tomorrowStr))
      .filter((q) => q.and(q.eq(q.field("reminderSent"), false), q.neq(q.field("status"), "cancelled")))
      .collect()

    for (const appointment of appointments) {
      // Get customer info
      const customer = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("tokenIdentifier"), appointment.customerId))
        .first()

      if (!customer?.email) continue

      // Get business info
      let businessName = "Auto Detailing Service"
      if (appointment.businessId) {
        const business = await ctx.db.get(appointment.businessId)
        if (business) {
          businessName = business.name
        }
      }

      // Get bundle info if applicable
      let bundleName = ""
      if (appointment.bundleId) {
        const bundle = await ctx.db.get(appointment.bundleId)
        if (bundle) {
          bundleName = bundle.name
        }
      }

      // Schedule reminder email
      await ctx.scheduler.runAfter(0, internal.emailNotifications.sendEmailNotification, {
        to: customer.email,
        type: "booking_reminder",
        data: {
          customerName: customer.name,
          serviceType: appointment.serviceType,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName,
          bundleName,
          bundleId: appointment.bundleId,
          price: appointment.price,
          appointmentId: appointment._id,
        },
      })

      // Mark reminder as sent
      await ctx.db.patch(appointment._id, {
        reminderSent: true,
      })
    }
  },
})

// Get email logs for admin dashboard
export const getEmailLogs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailLogs")
      .order("desc")
      .paginate({
        numItems: args.limit || 50,
        cursor: null,
      })
  },
})
