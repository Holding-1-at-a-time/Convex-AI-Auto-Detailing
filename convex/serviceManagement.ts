import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create a new service package
export const createServicePackage = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration: v.number(),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    isActive: v.boolean(),
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

    // Create service package
    const serviceId = await ctx.db.insert("servicePackages", {
      businessId: businessProfile._id,
      name: args.name,
      description: args.description,
      price: args.price,
      duration: args.duration,
      category: args.category,
      imageUrl: args.imageUrl,
      features: args.features,
      isActive: args.isActive,
      createdAt: new Date().toISOString(),
    })

    return serviceId
  },
})

// Update a service package
export const updateServicePackage = mutation({
  args: {
    serviceId: v.id("servicePackages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration: v.optional(v.number()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get the service
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
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
    if (user.role !== "admin" && service.businessId !== businessProfile._id) {
      throw new Error("Unauthorized: You can only update your own services")
    }

    // Update service
    const { serviceId, ...updates } = args
    await ctx.db.patch(serviceId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return serviceId
  },
})

// Delete a service package
export const deleteServicePackage = mutation({
  args: {
    serviceId: v.id("servicePackages"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get the service
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
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
    if (user.role !== "admin" && service.businessId !== businessProfile._id) {
      throw new Error("Unauthorized: You can only delete your own services")
    }

    // Delete service
    await ctx.db.delete(args.serviceId)

    return { success: true }
  },
})

// Get all service packages for a business
export const getBusinessServicePackages = query({
  args: {
    businessId: v.id("businessProfiles"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("servicePackages").withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    if (args.activeOnly) {
      query = query.filter((q) => q.eq(q.field("isActive"), true))
    }

    const services = await query.collect()

    return services
  },
})

// Get service package by ID
export const getServicePackageById = query({
  args: {
    serviceId: v.id("servicePackages"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
    }

    return service
  },
})

// Get all service categories
export const getServiceCategories = query({
  args: {},
  handler: async (ctx) => {
    // This could be fetched from a database table in the future
    // For now, we'll return a static list
    return [
      {
        id: "exterior",
        name: "Exterior Detailing",
        description: "Services focused on cleaning and protecting the outside of your vehicle",
        icon: "car",
      },
      {
        id: "interior",
        name: "Interior Detailing",
        description: "Services focused on cleaning and protecting the inside of your vehicle",
        icon: "armchair",
      },
      {
        id: "full",
        name: "Full Detailing",
        description: "Comprehensive services covering both interior and exterior",
        icon: "sparkles",
      },
      {
        id: "specialty",
        name: "Specialty Services",
        description: "Specialized treatments and premium services",
        icon: "star",
      },
    ]
  },
})

// Search services
export const searchServices = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minDuration: v.optional(v.number()),
    maxDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("servicePackages").filter((q) => q.eq(q.field("isActive"), true))

    // Apply search filters
    if (args.query) {
      const searchLower = args.query.toLowerCase()
      query = query.filter((q) =>
        q.or(
          q.contains(q.lower(q.field("name")), searchLower),
          q.contains(q.lower(q.field("description")), searchLower),
        ),
      )
    }

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }

    if (args.minPrice !== undefined) {
      query = query.filter((q) => q.gte(q.field("price"), args.minPrice!))
    }

    if (args.maxPrice !== undefined) {
      query = query.filter((q) => q.lte(q.field("price"), args.maxPrice!))
    }

    if (args.minDuration !== undefined) {
      query = query.filter((q) => q.gte(q.field("duration"), args.minDuration!))
    }

    if (args.maxDuration !== undefined) {
      query = query.filter((q) => q.lte(q.field("duration"), args.maxDuration!))
    }

    const services = await query.collect()

    return services
  },
})
