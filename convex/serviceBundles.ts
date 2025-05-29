import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create a new service bundle
export const createServiceBundle = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    serviceIds: v.array(v.id("servicePackages")),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile
    const businessProfile = await ctx.db
      .query("businessProfiles")
      .filter((q) => q.eq(q.field("userId"), user.clerkId))
      .first()

    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Validate services belong to the business
    const services = await Promise.all(
      args.serviceIds.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId)
        if (!service) {
          throw new Error(`Service ${serviceId} not found`)
        }
        if (service.businessId !== businessProfile._id) {
          throw new Error("All services must belong to your business")
        }
        return service
      }),
    )

    // Calculate total price and duration
    const originalPrice = services.reduce((sum, service) => sum + service.price, 0)
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)

    // Calculate discounted price
    let totalPrice: number
    if (args.discountType === "percentage") {
      totalPrice = originalPrice * (1 - args.discountValue / 100)
    } else {
      totalPrice = originalPrice - args.discountValue
    }

    // Ensure price doesn't go below 0
    totalPrice = Math.max(0, totalPrice)

    // Create bundle
    const bundleId = await ctx.db.insert("serviceBundles", {
      businessId: businessProfile._id,
      name: args.name,
      description: args.description,
      serviceIds: args.serviceIds,
      discountType: args.discountType,
      discountValue: args.discountValue,
      totalPrice,
      totalDuration,
      imageUrl: args.imageUrl,
      isActive: args.isActive,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      maxRedemptions: args.maxRedemptions,
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
    })

    return bundleId
  },
})

// Update a service bundle
export const updateServiceBundle = mutation({
  args: {
    bundleId: v.id("serviceBundles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    serviceIds: v.optional(v.array(v.id("servicePackages"))),
    discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    discountValue: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get the bundle
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Get business profile
    const businessProfile = await ctx.db
      .query("businessProfiles")
      .filter((q) => q.eq(q.field("userId"), user.clerkId))
      .first()

    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Verify ownership
    if (user.role !== "admin" && bundle.businessId !== businessProfile._id) {
      throw new Error("Unauthorized: You can only update your own bundles")
    }

    // If services are being updated, recalculate price and duration
    let updates: any = { ...args }
    delete updates.bundleId

    if (args.serviceIds || args.discountType !== undefined || args.discountValue !== undefined) {
      const serviceIds = args.serviceIds || bundle.serviceIds
      const discountType = args.discountType || bundle.discountType
      const discountValue = args.discountValue !== undefined ? args.discountValue : bundle.discountValue

      // Validate and get services
      const services = await Promise.all(
        serviceIds.map(async (serviceId) => {
          const service = await ctx.db.get(serviceId)
          if (!service) {
            throw new Error(`Service ${serviceId} not found`)
          }
          if (service.businessId !== businessProfile._id) {
            throw new Error("All services must belong to your business")
          }
          return service
        }),
      )

      // Calculate totals
      const originalPrice = services.reduce((sum, service) => sum + service.price, 0)
      const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)

      // Calculate discounted price
      let totalPrice: number
      if (discountType === "percentage") {
        totalPrice = originalPrice * (1 - discountValue / 100)
      } else {
        totalPrice = originalPrice - discountValue
      }

      totalPrice = Math.max(0, totalPrice)

      updates = {
        ...updates,
        totalPrice,
        totalDuration,
      }
    }

    // Update bundle
    await ctx.db.patch(args.bundleId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return args.bundleId
  },
})

// Delete a service bundle
export const deleteServiceBundle = mutation({
  args: {
    bundleId: v.id("serviceBundles"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get the bundle
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Get business profile
    const businessProfile = await ctx.db
      .query("businessProfiles")
      .filter((q) => q.eq(q.field("userId"), user.clerkId))
      .first()

    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Verify ownership
    if (user.role !== "admin" && bundle.businessId !== businessProfile._id) {
      throw new Error("Unauthorized: You can only delete your own bundles")
    }

    // Delete bundle
    await ctx.db.delete(args.bundleId)

    return { success: true }
  },
})

// Get all bundles for a business
export const getBusinessBundles = query({
  args: {
    businessId: v.id("businessProfiles"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("serviceBundles").withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    if (args.activeOnly) {
      query = query.filter((q) => q.eq(q.field("isActive"), true))
    }

    const bundles = await query.collect()

    // Filter out expired bundles if activeOnly is true
    if (args.activeOnly) {
      const now = new Date().toISOString()
      return bundles.filter((bundle) => {
        if (bundle.validFrom && bundle.validFrom > now) return false
        if (bundle.validUntil && bundle.validUntil < now) return false
        if (bundle.maxRedemptions && bundle.currentRedemptions >= bundle.maxRedemptions) return false
        return true
      })
    }

    return bundles
  },
})

// Get bundle by ID with services
export const getBundleById = query({
  args: {
    bundleId: v.id("serviceBundles"),
  },
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Get all services in the bundle
    const services = await Promise.all(
      bundle.serviceIds.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId)
        return service
      }),
    )

    return {
      ...bundle,
      services: services.filter(Boolean),
    }
  },
})

// Get all active bundles (for customers)
export const getActiveBundles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    const query = ctx.db.query("serviceBundles").filter((q) => q.eq(q.field("isActive"), true))

    const bundles = await query.collect()

    // Filter valid bundles
    const validBundles = bundles.filter((bundle) => {
      if (bundle.validFrom && bundle.validFrom > now) return false
      if (bundle.validUntil && bundle.validUntil < now) return false
      if (bundle.maxRedemptions && bundle.currentRedemptions >= bundle.maxRedemptions) return false
      return true
    })

    // Sort by discount value (highest first)
    validBundles.sort((a, b) => {
      const aDiscount = a.discountType === "percentage" ? a.discountValue : (a.discountValue / a.totalPrice) * 100
      const bDiscount = b.discountType === "percentage" ? b.discountValue : (b.discountValue / b.totalPrice) * 100
      return bDiscount - aDiscount
    })

    return args.limit ? validBundles.slice(0, args.limit) : validBundles
  },
})

// Increment bundle redemption count
export const incrementBundleRedemption = mutation({
  args: {
    bundleId: v.id("serviceBundles"),
  },
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    await ctx.db.patch(args.bundleId, {
      currentRedemptions: bundle.currentRedemptions + 1,
    })
  },
})

// Calculate bundle savings
export const calculateBundleSavings = query({
  args: {
    bundleId: v.id("serviceBundles"),
  },
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Get all services in the bundle
    const services = await Promise.all(
      bundle.serviceIds.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId)
        return service
      }),
    )

    const originalPrice = services.reduce((sum, service) => sum + (service?.price || 0), 0)
    const savings = originalPrice - bundle.totalPrice
    const savingsPercentage = (savings / originalPrice) * 100

    return {
      originalPrice,
      bundlePrice: bundle.totalPrice,
      savings,
      savingsPercentage: Math.round(savingsPercentage),
    }
  },
})
