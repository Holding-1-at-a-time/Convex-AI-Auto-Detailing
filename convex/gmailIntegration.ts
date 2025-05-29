import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Update Gmail credentials for a business
export const updateGmailCredentials = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    accessToken: v.string(),
    refreshToken: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get the business profile
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Only the owner or an admin can update Gmail credentials
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only update your own business Gmail credentials")
    }

    // Update the business profile with Gmail credentials
    await ctx.db.patch(args.businessId, {
      gmailEnabled: true,
      gmailAccessToken: args.accessToken,
      gmailRefreshToken: args.refreshToken,
      gmailEmail: args.email,
      gmailConnectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Get Gmail status for a business
export const getGmailStatus = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Only the owner or an admin can view Gmail status
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own business Gmail status")
    }

    return {
      connected: business.gmailEnabled || false,
      email: business.gmailEmail || null,
      connectedAt: business.gmailConnectedAt || null,
    }
  },
})

// Disconnect Gmail for a business
export const disconnectGmail = mutation({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Only the owner or an admin can disconnect Gmail
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only disconnect your own business Gmail")
    }

    // Remove Gmail credentials
    await ctx.db.patch(args.businessId, {
      gmailEnabled: false,
      gmailAccessToken: undefined,
      gmailRefreshToken: undefined,
      gmailEmail: undefined,
      gmailConnectedAt: undefined,
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Get Gmail credentials for internal use (server-side only)
export const getGmailCredentials = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      return null
    }

    if (!business.gmailEnabled || !business.gmailAccessToken || !business.gmailRefreshToken) {
      return null
    }

    return {
      accessToken: business.gmailAccessToken,
      refreshToken: business.gmailRefreshToken,
      email: business.gmailEmail || business.email || "",
    }
  },
})
