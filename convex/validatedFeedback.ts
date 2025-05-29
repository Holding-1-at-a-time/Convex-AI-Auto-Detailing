import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { ValidationError, validateFeedbackData } from "./utils/validation"

/**
 * Submit feedback with comprehensive validation
 */
export const submitValidatedFeedback = mutation({
  args: {
    appointmentId: v.id("appointments"),
    rating: v.number(),
    comment: v.optional(v.string()),
    serviceQuality: v.optional(v.number()),
    timeliness: v.optional(v.number()),
    professionalism: v.optional(v.number()),
    valueForMoney: v.optional(v.number()),
    wouldRecommend: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Get appointment details
      const appointment = await ctx.db.get(args.appointmentId)
      if (!appointment) {
        throw new ValidationError("Appointment not found")
      }

      // Verify appointment is completed
      if (appointment.status !== "completed") {
        throw new ValidationError("Can only provide feedback for completed appointments")
      }

      // Verify user is the customer
      const identity = await ctx.auth.getUserIdentity()
      if (!identity || appointment.customerId !== identity.subject) {
        throw new ValidationError("Unauthorized: You can only provide feedback for your own appointments")
      }

      // Check if feedback already exists
      const existingFeedback = await ctx.db
        .query("feedback")
        .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
        .first()

      if (existingFeedback) {
        throw new ValidationError("Feedback has already been submitted for this appointment")
      }

      // Validate feedback data
      validateFeedbackData({
        rating: args.rating,
        comment: args.comment,
        serviceQuality: args.serviceQuality,
        timeliness: args.timeliness,
        professionalism: args.professionalism,
        valueForMoney: args.valueForMoney,
      })

      // Additional validation for comment content
      if (args.comment) {
        // Check for inappropriate content (basic filter)
        const inappropriateWords = ["spam", "scam", "fake", "terrible", "worst"]
        const lowerComment = args.comment.toLowerCase()

        // This is a basic filter - in production, use a proper content moderation service
        const hasInappropriateContent = inappropriateWords.some(
          (word) => lowerComment.includes(word) && lowerComment.split(word).length > 3,
        )

        if (hasInappropriateContent) {
          throw new ValidationError("Comment contains inappropriate content and will be reviewed")
        }
      }

      // Create feedback record
      const feedbackId = await ctx.db.insert("feedback", {
        appointmentId: args.appointmentId,
        customerId: appointment.customerId,
        businessId: appointment.businessId!,
        rating: args.rating,
        comment: args.comment,
        serviceQuality: args.serviceQuality,
        timeliness: args.timeliness,
        professionalism: args.professionalism,
        valueForMoney: args.valueForMoney,
        wouldRecommend: args.wouldRecommend,
        isPublic: args.isPublic ?? true,
        createdAt: new Date().toISOString(),
      })

      // Update appointment to mark feedback as received
      await ctx.db.patch(args.appointmentId, {
        followupSent: true,
        updatedAt: new Date().toISOString(),
      })

      return { success: true, feedbackId }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error(`Validation Error: ${error.message}`)
      }
      throw error
    }
  },
})
