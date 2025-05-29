import { v } from "convex/values"
import { query } from "./_generated/server"

// Get all business profiles
export const getAllBusinessProfiles = query({
  handler: async (ctx) => {
    const businesses = await ctx.db.query("businessProfiles").collect()
    return businesses
  },
})

// Get business profile by ID
export const getBusinessProfile = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId)
    return business
  },
})
