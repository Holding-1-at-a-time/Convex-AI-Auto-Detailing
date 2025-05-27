import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getCurrentTimestamp } from "./utils"

/**
 * Create or update a user
 */
export const upsertUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        imageUrl: args.imageUrl,
      })
      return existingUser._id
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        userId: args.userId,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        createdAt: getCurrentTimestamp(),
      })
      return userId
    }
  },
})

/**
 * Get user by ID
 */
export const getUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first()

    return user
  },
})

/**
 * Get user by email
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()

    return user
  },
})

/**
 * Delete user account and all associated data
 */
export const deleteUserAccount = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Get all vehicles for this user
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    // Delete all related records for each vehicle
    for (const vehicle of vehicles) {
      // Delete detailing records
      const detailingRecords = await ctx.db
        .query("detailingRecords")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
        .collect()

      for (const record of detailingRecords) {
        await ctx.db.delete(record._id)
      }

      // Delete product usage records
      const productUsageRecords = await ctx.db
        .query("productUsage")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
        .collect()

      for (const record of productUsageRecords) {
        await ctx.db.delete(record._id)
      }

      // Delete condition assessments
      const conditionAssessments = await ctx.db
        .query("conditionAssessments")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
        .collect()

      for (const assessment of conditionAssessments) {
        await ctx.db.delete(assessment._id)
      }

      // Delete the vehicle
      await ctx.db.delete(vehicle._id)
    }

    // Delete user queries
    const userQueries = await ctx.db
      .query("userQueries")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()

    for (const query of userQueries) {
      // Delete the embedding
      await ctx.db.delete(query.embeddingId)
      // Delete the query
      await ctx.db.delete(query._id)
    }

    // Finally, delete the user
    await ctx.db.delete(user._id)

    return { success: true }
  },
})
