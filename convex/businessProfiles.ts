import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create a new business profile
export const createBusinessProfile = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    businessType: v.string(), // "mobile", "fixed_location", "both"
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.number()),
    servicesOffered: v.optional(v.array(v.string())),
    serviceArea: v.optional(v.array(v.string())), // List of zip codes or cities
    businessHours: v.optional(v.any()),
    logo: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    socialMedia: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized to create a business profile
    await verifyUserRole(ctx, ["business", "admin"])

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format")
    }

    // Validate phone format (simple validation)
    const phoneRegex = /^\+?[0-9]{10,15}$/
    if (!phoneRegex.test(args.phone.replace(/[^0-9+]/g, ""))) {
      throw new Error("Invalid phone number format")
    }

    // Check if a profile already exists for this user
    const existingProfile = await ctx.db
      .query("businessProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (existingProfile) {
      throw new Error("A business profile already exists for this user")
    }

    // Create the business profile
    const profileId = await ctx.db.insert("businessProfiles", {
      userId: args.userId,
      businessName: args.businessName,
      businessType: args.businessType,
      address: args.address,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      phone: args.phone,
      email: args.email,
      website: args.website,
      description: args.description,
      foundedYear: args.foundedYear,
      employeeCount: args.employeeCount,
      servicesOffered: args.servicesOffered || [],
      serviceArea: args.serviceArea || [],
      businessHours: args.businessHours || {
        monday: { open: "09:00", close: "17:00" },
        tuesday: { open: "09:00", close: "17:00" },
        wednesday: { open: "09:00", close: "17:00" },
        thursday: { open: "09:00", close: "17:00" },
        friday: { open: "09:00", close: "17:00" },
        saturday: { open: "10:00", close: "15:00" },
        sunday: null,
      },
      logo: args.logo,
      photos: args.photos || [],
      socialMedia: args.socialMedia || {},
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return profileId
  },
})

// Update a business profile with improved validation
export const updateBusinessProfile = mutation({
  args: {
    profileId: v.id("businessProfiles"),
    businessName: v.optional(v.string()),
    businessType: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.number()),
    servicesOffered: v.optional(v.array(v.string())),
    serviceArea: v.optional(v.array(v.string())),
    businessHours: v.optional(v.any()),
    logo: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    socialMedia: v.optional(v.any()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { profileId, ...updates } = args

    // Check if profile exists
    const profile = await ctx.db.get(profileId)
    if (!profile) {
      throw new Error("Business profile not found")
    }

    // Verify user is authorized to update this profile
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Only the owner or an admin can update the profile
    if (user.role !== "admin" && profile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only update your own business profile")
    }

    // Validate email if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.email)) {
        throw new Error("Invalid email format")
      }
    }

    // Validate phone if provided
    if (updates.phone) {
      const phoneRegex = /^\+?[0-9]{10,15}$/
      if (!phoneRegex.test(updates.phone.replace(/[^0-9+]/g, ""))) {
        throw new Error("Invalid phone number format")
      }
    }

    // Update the profile
    await ctx.db.patch(profileId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return profileId
  },
})

// Get a business profile by user ID with proper authorization
export const getBusinessProfileByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.auth.getUserIdentity()

    // If requesting another user's profile, verify admin role
    if (!user || user.subject !== args.userId) {
      const { user: dbUser } = await verifyUserRole(ctx, ["admin"])
      if (!dbUser) {
        throw new Error("Unauthorized: Only admins can view other users' profiles")
      }
    }

    const profile = await ctx.db
      .query("businessProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

// Get a business profile by ID with proper authorization
export const getBusinessProfile = query({
  args: {
    profileId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId)
    if (!profile) {
      return null
    }

    // Get current user
    const user = await ctx.auth.getUserIdentity()

    // If requesting another user's profile, verify admin role
    if (!user || user.subject !== profile.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own business profile")
      }
    }

    return profile
  },
})

// List all business profiles (admin only)
export const listBusinessProfiles = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("businessProfiles")),
  },
  handler: async (ctx, args) => {
    // Verify admin role
    await verifyUserRole(ctx, ["admin"])

    const limit = args.limit ?? 10

    let query = ctx.db.query("businessProfiles")

    if (args.cursor) {
      query = query.filter((q) => q.gt(q.field("_id"), args.cursor))
    }

    const profiles = await query.take(limit)

    // Get the cursor for the next page
    const cursor = profiles.length === limit ? profiles[profiles.length - 1]._id : null

    return {
      profiles,
      cursor,
    }
  },
})
