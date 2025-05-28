import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create or update a customer profile
export const createOrUpdateCustomerProfile = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    preferredContactMethod: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        email: v.optional(v.boolean()),
        sms: v.optional(v.boolean()),
        push: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (existingProfile) {
      // Update existing profile
      return await ctx.db.patch(existingProfile._id, {
        name: args.name,
        email: args.email,
        phone: args.phone,
        address: args.address,
        city: args.city,
        state: args.state,
        zipCode: args.zipCode,
        preferredContactMethod: args.preferredContactMethod,
        notificationPreferences: args.notificationPreferences,
        updatedAt: new Date().toISOString(),
      })
    } else {
      // Create new profile
      return await ctx.db.insert("customerProfiles", {
        userId: args.userId,
        name: args.name,
        email: args.email,
        phone: args.phone,
        address: args.address,
        city: args.city,
        state: args.state,
        zipCode: args.zipCode,
        preferredContactMethod: args.preferredContactMethod,
        notificationPreferences: args.notificationPreferences,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
      })
    }
  },
})

// Get customer profile by user ID
export const getCustomerProfileByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

// Mark onboarding as completed
export const completeOnboarding = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!profile) {
      throw new Error("Customer profile not found")
    }

    return await ctx.db.patch(profile._id, {
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    })
  },
})

// Add a vehicle to customer profile
export const addVehicle = mutation({
  args: {
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    vin: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...vehicleData } = args

    // Create the vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      userId,
      ...vehicleData,
      createdAt: new Date().toISOString(),
    })

    return vehicleId
  },
})

// Get customer vehicles
export const getCustomerVehicles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    return vehicles
  },
})
