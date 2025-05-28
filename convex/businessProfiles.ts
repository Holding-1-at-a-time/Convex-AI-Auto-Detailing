import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

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

// Update a business profile
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

    // Update the profile
    await ctx.db.patch(profileId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return profileId
  },
})

// Get a business profile by user ID
export const getBusinessProfileByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("businessProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

// Get a business profile by ID
export const getBusinessProfile = query({
  args: {
    profileId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId)
    return profile
  },
})

// Mark onboarding as completed
export const completeOnboarding = mutation({
  args: {
    profileId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Check if profile exists
    const profile = await ctx.db.get(args.profileId)
    if (!profile) {
      throw new Error("Business profile not found")
    }

    // Mark onboarding as completed
    await ctx.db.patch(args.profileId, {
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    })

    return args.profileId
  },
})
