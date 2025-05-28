import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create or update a user in Convex
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.string(), // "customer" or "business"
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    const name = `${args.firstName || ""} ${args.lastName || ""}`.trim()

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name: name || existingUser.name,
        role: args.role,
        lastLogin: new Date().toISOString(),
      })
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        name: name,
        email: args.email,
        role: args.role,
        clerkId: args.clerkId,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      })
    }
  },
})

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    return user
  },
})

// Get current user role
export const getCurrentUserRole = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    return user?.role || null
  },
})

// Update user login status
export const updateUserLoginStatus = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (user) {
      return await ctx.db.patch(user._id, {
        lastLogin: new Date().toISOString(),
      })
    }

    return null
  },
})
