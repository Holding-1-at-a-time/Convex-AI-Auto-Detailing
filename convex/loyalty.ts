import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Initialize customer loyalty
export const initializeCustomerLoyalty = mutation({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (admin or the customer themselves)
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to initialize their own loyalty or admins
    if (!user || user.subject !== args.customerId) {
      try {
        await verifyUserRole(ctx, ["admin", "business"])
      } catch (error) {
        throw new Error("Unauthorized: You can only initialize loyalty for yourself")
      }
    }

    // Check if loyalty record already exists
    const existingLoyalty = await ctx.db
      .query("customerLoyalty")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first()

    if (existingLoyalty) {
      return existingLoyalty._id
    }

    // Create new loyalty record
    const loyaltyId = await ctx.db.insert("customerLoyalty", {
      customerId: args.customerId,
      points: 0,
      tier: "bronze",
      pointsHistory: [],
      rewards: [],
      createdAt: new Date().toISOString(),
    })

    return loyaltyId
  },
})

// Add loyalty points
export const addLoyaltyPoints = mutation({
  args: {
    customerId: v.string(),
    points: v.number(),
    reason: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first()

    if (!loyalty) {
      // Initialize loyalty if it doesn't exist
      const loyaltyId = await ctx.db.insert("customerLoyalty", {
        customerId: args.customerId,
        points: args.points,
        tier: "bronze",
        pointsHistory: [
          {
            date: new Date().toISOString(),
            amount: args.points,
            reason: args.reason,
            appointmentId: args.appointmentId,
          },
        ],
        rewards: [],
        createdAt: new Date().toISOString(),
      })

      return loyaltyId
    }

    // Update existing loyalty record
    const newPoints = loyalty.points + args.points
    const newTier = calculateTier(newPoints)

    await ctx.db.patch(loyalty._id, {
      points: newPoints,
      tier: newTier,
      pointsHistory: [
        ...loyalty.pointsHistory,
        {
          date: new Date().toISOString(),
          amount: args.points,
          reason: args.reason,
          appointmentId: args.appointmentId,
        },
      ],
      updatedAt: new Date().toISOString(),
    })

    return loyalty._id
  },
})

// Get customer loyalty
export const getCustomerLoyalty = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (admin, business, or the customer themselves)
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to view their own loyalty or admins/businesses
    if (!user || user.subject !== args.customerId) {
      try {
        await verifyUserRole(ctx, ["admin", "business"])
      } catch (error) {
        throw new Error("Unauthorized: You can only view your own loyalty")
      }
    }

    // Get loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first()

    if (!loyalty) {
      return null
    }

    // Get available rewards based on tier
    const availableRewards = await ctx.db
      .query("loyaltyRewards")
      .filter((q) => q.lte(q.field("tierLevel"), getTierLevel(loyalty.tier)))
      .collect()

    // Filter out rewards that have already been redeemed
    const redeemedRewardIds = new Set(loyalty.rewards?.filter((r) => r.redeemed).map((r) => r.id) || [])

    const filteredRewards = availableRewards.filter((r) => !redeemedRewardIds.has(r._id))

    return {
      ...loyalty,
      availableRewards: filteredRewards,
      nextTier: getNextTier(loyalty.tier),
      pointsToNextTier: getPointsToNextTier(loyalty.points, loyalty.tier),
    }
  },
})

// Redeem reward
export const redeemReward = mutation({
  args: {
    customerId: v.string(),
    rewardId: v.id("loyaltyRewards"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (admin or the customer themselves)
    const user = await ctx.auth.getUserIdentity()

    // Only allow users to redeem their own rewards or admins
    if (!user || user.subject !== args.customerId) {
      try {
        await verifyUserRole(ctx, ["admin"])
      } catch (error) {
        throw new Error("Unauthorized: You can only redeem rewards for yourself")
      }
    }

    // Get loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first()

    if (!loyalty) {
      throw new Error("Loyalty record not found")
    }

    // Get reward
    const reward = await ctx.db.get(args.rewardId)
    if (!reward) {
      throw new Error("Reward not found")
    }

    // Check if reward has already been redeemed
    const alreadyRedeemed = loyalty.rewards?.some((r) => r.id === args.rewardId && r.redeemed)
    if (alreadyRedeemed) {
      throw new Error("Reward has already been redeemed")
    }

    // Check if customer has enough points
    if (loyalty.points < reward.pointsCost) {
      throw new Error("Not enough points to redeem this reward")
    }

    // Check if customer's tier is high enough
    if (getTierLevel(loyalty.tier) < reward.tierLevel) {
      throw new Error("Your loyalty tier is not high enough for this reward")
    }

    // Update loyalty record
    const newReward = {
      id: reward._id,
      name: reward.name,
      cost: reward.pointsCost,
      redeemed: true,
      redeemedDate: new Date().toISOString(),
    }

    const newRewards = [...(loyalty.rewards || []), newReward]
    const newPoints = loyalty.points - reward.pointsCost

    await ctx.db.patch(loyalty._id, {
      points: newPoints,
      rewards: newRewards,
      pointsHistory: [
        ...loyalty.pointsHistory,
        {
          date: new Date().toISOString(),
          amount: -reward.pointsCost,
          reason: `Redeemed reward: ${reward.name}`,
        },
      ],
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      reward: newReward,
      remainingPoints: newPoints,
    }
  },
})

// Create loyalty reward
export const createLoyaltyReward = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    pointsCost: v.number(),
    tierLevel: v.number(), // 1 = bronze, 2 = silver, 3 = gold, 4 = platinum
    expirationDays: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (admin or business)
    await verifyUserRole(ctx, ["admin", "business"])

    // Create reward
    const rewardId = await ctx.db.insert("loyaltyRewards", {
      name: args.name,
      description: args.description,
      pointsCost: args.pointsCost,
      tierLevel: args.tierLevel,
      expirationDays: args.expirationDays,
      isActive: args.isActive,
      createdAt: new Date().toISOString(),
    })

    return rewardId
  },
})

// Get loyalty rewards
export const getLoyaltyRewards = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    tierLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("loyaltyRewards")

    if (args.activeOnly) {
      query = query.filter((q) => q.eq(q.field("isActive"), true))
    }

    if (args.tierLevel !== undefined) {
      query = query.filter((q) => q.lte(q.field("tierLevel"), args.tierLevel))
    }

    const rewards = await query.collect()

    return rewards
  },
})

// Helper functions
function calculateTier(points: number): string {
  if (points >= 5000) return "platinum"
  if (points >= 2000) return "gold"
  if (points >= 500) return "silver"
  return "bronze"
}

function getTierLevel(tier: string): number {
  switch (tier) {
    case "platinum":
      return 4
    case "gold":
      return 3
    case "silver":
      return 2
    case "bronze":
    default:
      return 1
  }
}

function getNextTier(tier: string): string {
  switch (tier) {
    case "bronze":
      return "silver"
    case "silver":
      return "gold"
    case "gold":
      return "platinum"
    case "platinum":
    default:
      return "platinum"
  }
}

function getPointsToNextTier(points: number, tier: string): number {
  switch (tier) {
    case "bronze":
      return Math.max(0, 500 - points)
    case "silver":
      return Math.max(0, 2000 - points)
    case "gold":
      return Math.max(0, 5000 - points)
    case "platinum":
    default:
      return 0
  }
}
