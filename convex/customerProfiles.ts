import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create or update a customer profile with improved validation
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
    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to update their own profile or admins
    if (!user || user.subject !== args.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only update your own profile")
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format")
    }

    // Validate phone format if provided
    if (args.phone) {
      const phoneRegex = /^\+?[0-9]{10,15}$/
      if (!phoneRegex.test(args.phone.replace(/[^0-9+]/g, ""))) {
        throw new Error("Invalid phone number format")
      }
    }

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
        notificationPreferences: args.notificationPreferences || {
          email: true,
          sms: false,
          push: false,
        },
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
      })
    }
  },
})

// Get customer profile by user ID with proper authorization
export const getCustomerProfileByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.auth.getUserIdentity()

    // If requesting another user's profile, verify admin role
    if (!user || user.subject !== args.userId) {
      try {
        await verifyUserRole(ctx, ["admin", "business"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own profile")
      }
    }

    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

// Mark onboarding as completed with authorization
export const completeOnboarding = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to update their own profile or admins
    if (!user || user.subject !== args.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only update your own profile")
      }
    }

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

// Add a vehicle to customer profile with validation
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

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to add vehicles to their own profile or admins
    if (!user || user.subject !== userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only add vehicles to your own profile")
      }
    }

    // Validate year
    const currentYear = new Date().getFullYear()
    if (args.year < 1900 || args.year > currentYear + 1) {
      throw new Error(`Vehicle year must be between 1900 and ${currentYear + 1}`)
    }

    // Validate VIN if provided
    if (args.vin) {
      // Basic VIN validation (17 characters for modern vehicles)
      if (args.vin.length !== 17) {
        throw new Error("Invalid VIN format. VIN should be 17 characters")
      }
    }

    // Create the vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      userId,
      ...vehicleData,
      createdAt: new Date().toISOString(),
    })

    return vehicleId
  },
})

// Get customer vehicles with authorization
export const getCustomerVehicles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.auth.getUserIdentity()

    // If requesting another user's vehicles, verify admin or business role
    if (!user || user.subject !== args.userId) {
      try {
        await verifyUserRole(ctx, ["admin", "business"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own vehicles")
      }
    }

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    return vehicles
  },
})

// Update vehicle with validation
export const updateVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    vin: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { vehicleId, ...updates } = args

    // Get the vehicle
    const vehicle = await ctx.db.get(vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow vehicle owner or admins to update
    if (!user || user.subject !== vehicle.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only update your own vehicles")
      }
    }

    // Validate year if provided
    if (updates.year) {
      const currentYear = new Date().getFullYear()
      if (updates.year < 1900 || updates.year > currentYear + 1) {
        throw new Error(`Vehicle year must be between 1900 and ${currentYear + 1}`)
      }
    }

    // Validate VIN if provided
    if (updates.vin) {
      // Basic VIN validation (17 characters for modern vehicles)
      if (updates.vin.length !== 17) {
        throw new Error("Invalid VIN format. VIN should be 17 characters")
      }
    }

    // Update the vehicle
    await ctx.db.patch(vehicleId, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    })

    return vehicleId
  },
})

// Delete vehicle with authorization
export const deleteVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Get the vehicle
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Verify user is authorized
    const user = await ctx.auth.getUserIdentity()

    // Only allow vehicle owner or admins to delete
    if (!user || user.subject !== vehicle.userId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only delete your own vehicles")
      }
    }

    // Check if vehicle has appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .first()

    if (appointments) {
      throw new Error("Cannot delete vehicle with existing appointments")
    }

    // Delete the vehicle
    await ctx.db.delete(args.vehicleId)

    return { success: true }
  },
})
