import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Submit customer feedback
export const submitFeedback = mutation({
  args: {
    appointmentId: v.id("appointments"),
    serviceRating: v.number(), // 1-5
    staffRating: v.optional(v.number()), // 1-5
    businessRating: v.optional(v.number()), // 1-5
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["customer"])

    // Get appointment to verify ownership
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Ensure customer owns this appointment
    if (appointment.customerId !== user.clerkId) {
      throw new Error("Unauthorized: You can only provide feedback for your own appointments")
    }

    // Check if feedback already exists
    const existingFeedback = await ctx.db
      .query("customerFeedback")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .first()

    if (existingFeedback) {
      throw new Error("Feedback has already been submitted for this appointment")
    }

    // Create feedback
    const feedbackId = await ctx.db.insert("customerFeedback", {
      appointmentId: args.appointmentId,
      customerId: appointment.customerId,
      businessId: appointment.businessId,
      serviceRating: args.serviceRating,
      staffRating: args.staffRating,
      businessRating: args.businessRating,
      comments: args.comments,
      status: "pending",
      createdAt: new Date().toISOString(),
    })

    // Award loyalty points for feedback
    await ctx.runMutation("loyalty:addLoyaltyPoints", {
      customerId: appointment.customerId,
      points: 10,
      reason: "Provided feedback",
      appointmentId: args.appointmentId,
    })

    return feedbackId
  },
})

// Get feedback for a business
export const getBusinessFeedback = query({
  args: {
    businessId: v.id("businessProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own business feedback")
    }

    let query = ctx.db.query("customerFeedback").withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const feedback = await query.order("desc").take(args.limit || 50)

    // Get additional details for each feedback
    const feedbackWithDetails = await Promise.all(
      feedback.map(async (fb) => {
        // Get customer info
        const customer = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", fb.customerId))
          .first()

        // Get appointment info
        const appointment = await ctx.db.get(fb.appointmentId)

        return {
          ...fb,
          customerName: customer?.name || "Unknown Customer",
          appointmentDetails: appointment
            ? {
                date: appointment.date,
                serviceType: appointment.serviceType,
              }
            : null,
        }
      }),
    )

    return feedbackWithDetails
  },
})

// Respond to feedback
export const respondToFeedback = mutation({
  args: {
    feedbackId: v.id("customerFeedback"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get feedback to verify ownership
    const feedback = await ctx.db.get(args.feedbackId)
    if (!feedback) {
      throw new Error("Feedback not found")
    }

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(feedback.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only respond to your own business feedback")
    }

    await ctx.db.patch(args.feedbackId, {
      businessResponse: args.response,
      status: "responded",
      respondedAt: new Date().toISOString(),
    })

    return args.feedbackId
  },
})

// Get customer's feedback history
export const getCustomerFeedback = query({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["customer", "admin"])

    // Ensure user can only view their own feedback (unless admin)
    if (user.role !== "admin" && args.customerId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own feedback")
    }

    const feedback = await ctx.db
      .query("customerFeedback")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(args.limit || 20)

    // Get additional details for each feedback
    const feedbackWithDetails = await Promise.all(
      feedback.map(async (fb) => {
        // Get appointment info
        const appointment = await ctx.db.get(fb.appointmentId)

        // Get business info
        const businessProfile = await ctx.db.get(fb.businessId)

        return {
          ...fb,
          appointmentDetails: appointment
            ? {
                date: appointment.date,
                serviceType: appointment.serviceType,
              }
            : null,
          businessName: businessProfile?.businessName || "Unknown Business",
        }
      }),
    )

    return feedbackWithDetails
  },
})
