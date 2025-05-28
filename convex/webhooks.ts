import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Sync user data from Clerk
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    eventType: v.string(), // "created" or "updated"
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: `user.${args.eventType}`,
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    const name = `${args.firstName || ""} ${args.lastName || ""}`.trim()

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name: name || existingUser.name,
        email: args.email || existingUser.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        lastUpdated: args.updatedAt || new Date().toISOString(),
        metadata: args.metadata,
      })
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        name,
        email: args.email,
        clerkId: args.clerkId,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        createdAt: args.createdAt || new Date().toISOString(),
        lastUpdated: args.updatedAt,
        role: "customer", // Default role, can be changed later
        metadata: args.metadata,
      })
    }
  },
})

// Delete user
export const deleteUser = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: "user.deleted",
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (user) {
      // Delete the user
      await ctx.db.delete(user._id)
      return { success: true }
    }

    return { success: false, error: "User not found" }
  },
})

// Log session events
export const logSession = mutation({
  args: {
    sessionId: v.string(),
    clerkId: v.string(),
    createdAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    status: v.string(), // "created", "ended"
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: `session.${args.status}`,
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Check if session already exists
    const existingSession = await ctx.db
      .query("userSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first()

    if (existingSession) {
      // Update existing session
      return await ctx.db.patch(existingSession._id, {
        endedAt: args.endedAt,
        status: args.status,
        lastUpdated: new Date().toISOString(),
      })
    } else if (args.status === "created") {
      // Create new session
      return await ctx.db.insert("userSessions", {
        sessionId: args.sessionId,
        clerkId: args.clerkId,
        createdAt: args.createdAt || new Date().toISOString(),
        status: args.status,
      })
    }

    // If session doesn't exist and it's not a creation event, log an error
    return { success: false, error: "Session not found" }
  },
})

// Sync organization data
export const syncOrganization = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    slug: v.string(),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    eventType: v.string(), // "created" or "updated"
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: `organization.${args.eventType}`,
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Check if organization already exists
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first()

    if (existingOrg) {
      // Update existing organization
      return await ctx.db.patch(existingOrg._id, {
        name: args.name,
        slug: args.slug,
        updatedAt: args.updatedAt || new Date().toISOString(),
        metadata: args.metadata,
      })
    } else {
      // Create new organization
      return await ctx.db.insert("organizations", {
        orgId: args.orgId,
        name: args.name,
        slug: args.slug,
        createdAt: args.createdAt || new Date().toISOString(),
        metadata: args.metadata,
      })
    }
  },
})

// Delete organization
export const deleteOrganization = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: "organization.deleted",
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Find the organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first()

    if (org) {
      // Delete the organization
      await ctx.db.delete(org._id)
      return { success: true }
    }

    return { success: false, error: "Organization not found" }
  },
})

// Sync organization membership
export const syncOrgMembership = mutation({
  args: {
    membershipId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    eventType: v.string(), // "created" or "updated"
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: `organizationMembership.${args.eventType}`,
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Check if membership already exists
    const existingMembership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_membershipId", (q) => q.eq("membershipId", args.membershipId))
      .first()

    if (existingMembership) {
      // Update existing membership
      return await ctx.db.patch(existingMembership._id, {
        role: args.role,
        updatedAt: args.updatedAt || new Date().toISOString(),
      })
    } else {
      // Create new membership
      return await ctx.db.insert("organizationMemberships", {
        membershipId: args.membershipId,
        orgId: args.orgId,
        userId: args.userId,
        role: args.role,
        createdAt: args.createdAt || new Date().toISOString(),
      })
    }
  },
})

// Delete organization membership
export const deleteOrgMembership = mutation({
  args: {
    membershipId: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    await ctx.db.insert("webhookLogs", {
      eventType: "organizationMembership.deleted",
      timestamp: new Date().toISOString(),
      data: args,
      status: "success",
    })

    // Find the membership
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_membershipId", (q) => q.eq("membershipId", args.membershipId))
      .first()

    if (membership) {
      // Delete the membership
      await ctx.db.delete(membership._id)
      return { success: true }
    }

    return { success: false, error: "Membership not found" }
  },
})

// Log organization invitation events
export const logOrgInvitation = mutation({
  args: {
    invitationData: v.any(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: args.eventType,
      timestamp: new Date().toISOString(),
      data: args.invitationData,
      status: "success",
    })
  },
})

// Log organization domain events
export const logOrgDomain = mutation({
  args: {
    domainData: v.any(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: args.eventType,
      timestamp: new Date().toISOString(),
      data: args.domainData,
      status: "success",
    })
  },
})

// Log role events
export const logRoleEvent = mutation({
  args: {
    roleData: v.any(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: args.eventType,
      timestamp: new Date().toISOString(),
      data: args.roleData,
      status: "success",
    })
  },
})

// Log permission events
export const logPermissionEvent = mutation({
  args: {
    permissionData: v.any(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: args.eventType,
      timestamp: new Date().toISOString(),
      data: args.permissionData,
      status: "success",
    })
  },
})

// Log email events
export const logEmailEvent = mutation({
  args: {
    emailData: v.any(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: "email.created",
      timestamp: new Date().toISOString(),
      data: args.emailData,
      status: "success",
    })
  },
})

// Log SMS events
export const logSmsEvent = mutation({
  args: {
    smsData: v.any(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: "sms.created",
      timestamp: new Date().toISOString(),
      data: args.smsData,
      status: "success",
    })
  },
})

// Log waitlist events
export const logWaitlistEvent = mutation({
  args: {
    waitlistData: v.any(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the webhook event
    return await ctx.db.insert("webhookLogs", {
      eventType: args.eventType,
      timestamp: new Date().toISOString(),
      data: args.waitlistData,
      status: "success",
    })
  },
})

// Get webhook logs
export const getWebhookLogs = query({
  args: {
    limit: v.number(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("webhookLogs")

    if (args.eventType) {
      q = q.withIndex("by_eventType", (q) => q.eq("eventType", args.eventType))
    } else {
      q = q.withIndex("by_timestamp")
    }

    return await q.order("desc").take(args.limit)
  },
})

// Get unique event types
export const getEventTypes = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("webhookLogs").collect()
    const eventTypes = new Set(logs.map((log) => log.eventType))
    return Array.from(eventTypes)
  },
})
