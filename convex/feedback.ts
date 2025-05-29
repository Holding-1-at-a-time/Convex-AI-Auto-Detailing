import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"
import { internal } from "./_generated/api"

// Submit feedback for a completed service
export const submitFeedback = mutation({
  args: {
    appointmentId: v.id("appointments"),
    rating: v.number(),
    comment: v.optional(v.string()),
    wouldRecommend: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["customer"])

    // Get the appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Verify the appointment belongs to this customer
    if (appointment.customerId !== user.clerkId) {
      throw new Error("Unauthorized: You can only provide feedback for your own appointments")
    }

    // Verify the appointment is completed
    if (appointment.status !== "completed") {
      throw new Error("Feedback can only be submitted for completed appointments")
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
      customerId: user.clerkId,
      appointmentId: args.appointmentId,
      serviceRating: args.rating,
      comments: args.comment,
      wouldRecommend: args.wouldRecommend,
      followupStatus: "pending",
      createdAt: new Date().toISOString(),
    })

    // Award loyalty points for providing feedback
    await ctx.runMutation(internal.loyalty.awardPoints, {
      customerId: user.clerkId,
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
  },
  handler: async (ctx, args) => {
    // Get appointments for this business
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .collect()

    const appointmentIds = appointments.map((a) => a._id)

    // Get feedback for these appointments
    const allFeedback = await ctx.db.query("customerFeedback").collect()

    const businessFeedback = allFeedback
      .filter((f) => appointmentIds.includes(f.appointmentId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, args.limit || 50)

    // Add customer names
    const feedbackWithDetails = await Promise.all(
      businessFeedback.map(async (feedback) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", feedback.customerId))
          .first()

        return {
          ...feedback,
          customerName: user?.name || "Anonymous",
        }
      }),
    )

    return feedbackWithDetails
  },
})

// Get average rating for a business
export const getBusinessRating = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Get appointments for this business
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .collect()

    const appointmentIds = appointments.map((a) => a._id)

    // Get feedback for these appointments
    const allFeedback = await ctx.db.query("customerFeedback").collect()

    const businessFeedback = allFeedback.filter((f) => appointmentIds.includes(f.appointmentId))

    if (businessFeedback.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        recommendationRate: 0,
      }
    }

    const totalRating = businessFeedback.reduce((sum, f) => sum + f.serviceRating, 0)
    const totalRecommendations = businessFeedback.filter((f) => f.wouldRecommend).length

    return {
      averageRating: totalRating / businessFeedback.length,
      totalReviews: businessFeedback.length,
      recommendationRate: (totalRecommendations / businessFeedback.length) * 100,
    }
  },
})
