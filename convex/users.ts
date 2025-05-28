import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create or update a user in Convex (for role selection)
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
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()

    const name = `${args.firstName || ""} ${args.lastName || ""}`.trim()

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name: name || existingUser.name,
        role: args.role,
        clerkId: args.clerkId,
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

// Create user from webhook
export const createUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (existingUser) {
      console.log("User already exists, skipping creation")
      return existingUser._id
    }

    const name = `${args.firstName} ${args.lastName}`.trim()

    // Create new user without role (will be set during onboarding)
    return await ctx.db.insert("users", {
      name: name || "New User",
      email: args.email,
      clerkId: args.clerkId,
      phone: args.phone || undefined,
      imageUrl: args.imageUrl || undefined,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    })
  },
})

// Update user from webhook
export const updateUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) {
      console.error("User not found for update")
      return null
    }

    const name = `${args.firstName} ${args.lastName}`.trim()

    return await ctx.db.patch(user._id, {
      name: name || user.name,
      email: args.email,
      phone: args.phone || user.phone,
      imageUrl: args.imageUrl || user.imageUrl,
      lastLogin: new Date().toISOString(),
    })
  },
})

// Delete user from webhook
export const deleteUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) {
      console.error("User not found for deletion")
      return null
    }

    // Delete related data first
    // Delete user's vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.clerkId))
      .collect()

    for (const vehicle of vehicles) {
      await ctx.db.delete(vehicle._id)
    }

    // Delete user's appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.clerkId))
      .collect()

    for (const appointment of appointments) {
      await ctx.db.delete(appointment._id)
    }

    // Finally, delete the user
    return await ctx.db.delete(user._id)
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

// Check if user has completed onboarding
export const hasCompletedOnboarding = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    return user?.role ? true : false
  },
})
