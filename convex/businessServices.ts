import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create a new service for a business
export const createService = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration: v.number(), // in minutes
    category: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business services")
    }

    const serviceId = await ctx.db.insert("businessServices", {
      businessId: args.businessId,
      name: args.name,
      description: args.description,
      price: args.price,
      duration: args.duration,
      category: args.category,
      isActive: args.isActive ?? true,
      createdAt: new Date().toISOString(),
    })

    return serviceId
  },
})

// Get all services for a business
export const getBusinessServices = query({
  args: {
    businessId: v.id("businessProfiles"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("businessServices").withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    if (args.activeOnly) {
      query = query.filter((q) => q.eq(q.field("isActive"), true))
    }

    const services = await query.collect()
    return services.sort((a, b) => a.name.localeCompare(b.name))
  },
})

// Update a service
export const updateService = mutation({
  args: {
    serviceId: v.id("businessServices"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration: v.optional(v.number()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { serviceId, ...updates } = args

    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get service to verify ownership
    const service = await ctx.db.get(serviceId)
    if (!service) {
      throw new Error("Service not found")
    }

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(service.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business services")
    }

    await ctx.db.patch(serviceId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return serviceId
  },
})

// Delete a service
export const deleteService = mutation({
  args: {
    serviceId: v.id("businessServices"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get service to verify ownership
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
    }

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(service.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only manage your own business services")
    }

    // Check if service has any appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", args.serviceId))
      .first()

    if (appointments) {
      throw new Error("Cannot delete service with existing appointments")
    }

    await ctx.db.delete(args.serviceId)
    return { success: true }
  },
})

// Get service by ID
export const getService = query({
  args: {
    serviceId: v.id("businessServices"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId)
    if (!service) return null

    // Get business info
    const businessProfile = await ctx.db.get(service.businessId)

    return {
      ...service,
      businessProfile,
    }
  },
})

// Get all services (for customers to browse)
export const getAllServices = query({
  args: {
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query("businessServices").withIndex("by_isActive", (q) => q.eq("isActive", true))

    const services = await query.collect()

    let filteredServices = services

    // Filter by category
    if (args.category) {
      filteredServices = filteredServices.filter(
        (service) => service.category.toLowerCase() === args.category.toLowerCase(),
      )
    }

    // Filter by search term
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase()
      filteredServices = filteredServices.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) || service.description.toLowerCase().includes(searchLower),
      )
    }

    // Get business info for each service
    const servicesWithBusiness = await Promise.all(
      filteredServices.map(async (service) => {
        const businessProfile = await ctx.db.get(service.businessId)
        return {
          ...service,
          businessProfile,
        }
      }),
    )

    // Apply limit
    const limit = args.limit || 50
    return servicesWithBusiness.slice(0, limit)
  },
})
