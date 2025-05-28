import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

export const getCustomerProfileByUserId = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()
    return profile
  },
})
