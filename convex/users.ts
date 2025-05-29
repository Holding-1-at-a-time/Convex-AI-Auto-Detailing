import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create or update user from Clerk data
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    const userData = {
      clerkId: args.clerkId,
      email: args.email,
      name: `${args.firstName} ${args.lastName}`.trim(),
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      updatedAt: new Date().toISOString(),
    }

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, userData)
      return existingUser._id
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        ...userData,
        createdAt: new Date().toISOString(),
      })
      return userId
    }
  },
})

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    return user
  },
})

// Get user profile with additional data
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    // Get role-specific profile data
    if (user.role === "business") {
      const businessProfile = await ctx.db
        .query("businessProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
        .first()

      return {
        ...user,
        businessProfile,
      }
    } else if (user.role === "customer") {
      const customerProfile = await ctx.db
        .query("customerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
        .first()

      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
        .collect()

      return {
        ...user,
        customerProfile,
        vehicles,
      }
    }

    return user
  },
})

// Update user role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["admin"])

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: new Date().toISOString(),
    })

    return args.userId
  },
})
