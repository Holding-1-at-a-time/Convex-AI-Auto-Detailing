import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Create a promotion
export const createPromotion = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    type: v.string(), // "percentage", "fixed", "free_service", "bundle"
    value: v.number(), // Percentage or fixed amount
    minPurchase: v.optional(v.number()),
    applicableServices: v.optional(v.array(v.string())),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user owns this business or is admin
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only create promotions for your own business")
    }

    // Validate code format (alphanumeric, uppercase, no spaces)
    const codeRegex = /^[A-Z0-9]+$/
    if (!codeRegex.test(args.code)) {
      throw new Error("Invalid promotion code format. Use uppercase alphanumeric characters only")
    }

    // Check if code already exists
    const existingPromotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (existingPromotion) {
      throw new Error("A promotion with this code already exists")
    }

    // Validate dates
    const startDate = new Date(args.startDate)
    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date")
    }

    if (args.endDate) {
      const endDate = new Date(args.endDate)
      if (isNaN(endDate.getTime())) {
        throw new Error("Invalid end date")
      }

      if (endDate <= startDate) {
        throw new Error("End date must be after start date")
      }
    }

    // Validate promotion type and value
    if (args.type === "percentage" && (args.value <= 0 || args.value > 100)) {
      throw new Error("Percentage value must be between 1 and 100")
    }

    if (args.type === "fixed" && args.value <= 0) {
      throw new Error("Fixed amount must be greater than 0")
    }

    // Create the promotion
    const promotionId = await ctx.db.insert("promotions", {
      code: args.code,
      description: args.description,
      type: args.type,
      value: args.value,
      minPurchase: args.minPurchase,
      applicableServices: args.applicableServices || [],
      startDate: args.startDate,
      endDate: args.endDate,
      usageLimit: args.usageLimit,
      usageCount: 0,
      active: true,
      businessId: args.businessId,
      createdAt: new Date().toISOString(),
    })

    return promotionId
  },
})

// Update a promotion
export const updatePromotion = mutation({
  args: {
    promotionId: v.id("promotions"),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    value: v.optional(v.number()),
    minPurchase: v.optional(v.number()),
    applicableServices: v.optional(v.array(v.string())),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { promotionId, ...updates } = args

    // Get promotion
    const promotion = await ctx.db.get(promotionId)
    if (!promotion) {
      throw new Error("Promotion not found")
    }

    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Check if business exists
    const business = await ctx.db.get(promotion.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user owns this business or is admin
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only update promotions for your own business")
    }

    // Validate dates if provided
    if (updates.startDate) {
      const startDate = new Date(updates.startDate)
      if (isNaN(startDate.getTime())) {
        throw new Error("Invalid start date")
      }
    }

    if (updates.endDate) {
      const endDate = new Date(updates.endDate)
      if (isNaN(endDate.getTime())) {
        throw new Error("Invalid end date")
      }

      const startDate = new Date(updates.startDate || promotion.startDate)
      if (endDate <= startDate) {
        throw new Error("End date must be after start date")
      }
    }

    // Validate promotion type and value if provided
    if (updates.type === "percentage" && updates.value !== undefined && (updates.value <= 0 || updates.value > 100)) {
      throw new Error("Percentage value must be between 1 and 100")
    }

    if (updates.type === "fixed" && updates.value !== undefined && updates.value <= 0) {
      throw new Error("Fixed amount must be greater than 0")
    }

    // Update the promotion
    await ctx.db.patch(promotionId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    return promotionId
  },
})

// Get promotions for a business
export const getBusinessPromotions = query({
  args: {
    businessId: v.id("businessProfiles"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner, staff, or admin)
    const { user } = await verifyUserRole(ctx, ["business", "staff", "admin"])

    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user has access to this business
    if (user.role === "business" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view promotions for your own business")
    }

    if (user.role === "staff") {
      const staff = await ctx.db
        .query("staff")
        .filter((q) => q.and(q.eq(q.field("userId"), user.clerkId), q.eq(q.field("businessId"), args.businessId)))
        .first()

      if (!staff) {
        throw new Error("Unauthorized: You can only view promotions for your business")
      }
    }

    // Get promotions
    let query = ctx.db.query("promotions").filter((q) => q.eq(q.field("businessId"), args.businessId))

    if (args.activeOnly) {
      const now = new Date().toISOString().split("T")[0]
      query = query.filter((q) =>
        q.and(
          q.eq(q.field("active"), true),
          q.lte(q.field("startDate"), now),
          q.or(q.eq(q.field("endDate"), null), q.gte(q.field("endDate"), now)),
        ),
      )
    }

    const promotions = await query.collect()

    return promotions
  },
})

// Validate a promotion code
export const validatePromotionCode = query({
  args: {
    code: v.string(),
    businessId: v.id("businessProfiles"),
    serviceType: v.optional(v.string()),
    purchaseAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get promotion
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (!promotion) {
      return {
        valid: false,
        message: "Invalid promotion code",
      }
    }

    // Check if promotion belongs to the specified business
    if (promotion.businessId !== args.businessId) {
      return {
        valid: false,
        message: "This promotion code is not valid for this business",
      }
    }

    // Check if promotion is active
    if (!promotion.active) {
      return {
        valid: false,
        message: "This promotion is no longer active",
      }
    }

    // Check dates
    const now = new Date()
    const startDate = new Date(promotion.startDate)
    if (now < startDate) {
      return {
        valid: false,
        message: `This promotion is not valid until ${promotion.startDate}`,
      }
    }

    if (promotion.endDate) {
      const endDate = new Date(promotion.endDate)
      if (now > endDate) {
        return {
          valid: false,
          message: `This promotion expired on ${promotion.endDate}`,
        }
      }
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return {
        valid: false,
        message: "This promotion has reached its usage limit",
      }
    }

    // Check minimum purchase
    if (promotion.minPurchase && args.purchaseAmount && args.purchaseAmount < promotion.minPurchase) {
      return {
        valid: false,
        message: `This promotion requires a minimum purchase of $${promotion.minPurchase}`,
      }
    }

    // Check applicable services
    if (
      promotion.applicableServices &&
      promotion.applicableServices.length > 0 &&
      args.serviceType &&
      !promotion.applicableServices.includes(args.serviceType)
    ) {
      return {
        valid: false,
        message: "This promotion is not valid for the selected service",
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (args.purchaseAmount) {
      if (promotion.type === "percentage") {
        discountAmount = (args.purchaseAmount * promotion.value) / 100
      } else if (promotion.type === "fixed") {
        discountAmount = Math.min(promotion.value, args.purchaseAmount)
      }
    }

    return {
      valid: true,
      promotion: {
        id: promotion._id,
        code: promotion.code,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
      },
      discountAmount,
    }
  },
})

// Apply a promotion code
export const applyPromotionCode = mutation({
  args: {
    code: v.string(),
    businessId: v.id("businessProfiles"),
    appointmentId: v.optional(v.id("appointments")),
    serviceType: v.optional(v.string()),
    purchaseAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Unauthorized: User not authenticated")
    }

    // Get promotion
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (!promotion) {
      throw new Error("Invalid promotion code")
    }

    // Check if promotion belongs to the specified business
    if (promotion.businessId !== args.businessId) {
      throw new Error("This promotion code is not valid for this business")
    }

    // Check if promotion is active
    if (!promotion.active) {
      throw new Error("This promotion is no longer active")
    }

    // Check dates
    const now = new Date()
    const startDate = new Date(promotion.startDate)
    if (now < startDate) {
      throw new Error(`This promotion is not valid until ${promotion.startDate}`)
    }

    if (promotion.endDate) {
      const endDate = new Date(promotion.endDate)
      if (now > endDate) {
        throw new Error(`This promotion expired on ${promotion.endDate}`)
      }
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new Error("This promotion has reached its usage limit")
    }

    // Check minimum purchase
    if (promotion.minPurchase && args.purchaseAmount < promotion.minPurchase) {
      throw new Error(`This promotion requires a minimum purchase of $${promotion.minPurchase}`)
    }

    // Check applicable services
    if (
      promotion.applicableServices &&
      promotion.applicableServices.length > 0 &&
      args.serviceType &&
      !promotion.applicableServices.includes(args.serviceType)
    ) {
      throw new Error("This promotion is not valid for the selected service")
    }

    // Calculate discount
    let discountAmount = 0
    if (promotion.type === "percentage") {
      discountAmount = (args.purchaseAmount * promotion.value) / 100
    } else if (promotion.type === "fixed") {
      discountAmount = Math.min(promotion.value, args.purchaseAmount)
    }

    // Increment usage count
    await ctx.db.patch(promotion._id, {
      usageCount: promotion.usageCount + 1,
      updatedAt: new Date().toISOString(),
    })

    // Record promotion usage
    const usageId = await ctx.db.insert("promotionUsage", {
      promotionId: promotion._id,
      userId: user.subject,
      businessId: args.businessId,
      appointmentId: args.appointmentId,
      purchaseAmount: args.purchaseAmount,
      discountAmount,
      usedAt: new Date().toISOString(),
    })

    return {
      success: true,
      promotion: {
        id: promotion._id,
        code: promotion.code,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
      },
      discountAmount,
      usageId,
    }
  },
})
