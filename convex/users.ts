import { mutation } from "./_generated/server"
import { v } from "convex/values"

// Update user profile during customer onboarding
export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      phone: args.phone,
      address: args.address,
      onboardingCompleted: args.onboardingCompleted,
      lastLogin: new Date().toISOString(),
    })
  },
})

// Update business profile during business onboarding
export const updateBusinessProfile = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    description: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      name: args.businessName, // Update name to business name
      phone: args.phone,
      address: args.address,
      preferences: {
        ...(user.preferences || {}),
        businessDescription: args.description,
      },
      onboardingCompleted: args.onboardingCompleted,
      lastLogin: new Date().toISOString(),
    })
  },
})
