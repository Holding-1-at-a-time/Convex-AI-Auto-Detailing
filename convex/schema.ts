import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()), // "admin", "staff", "customer", "business"
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    createdAt: v.string(),
    lastLogin: v.optional(v.string()),
    preferences: v.optional(v.any()),
    clerkId: v.string(), // Clerk user ID
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    lastUpdated: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional metadata from Clerk
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_clerkId", ["clerkId"]),

  // User sessions
  userSessions: defineTable({
    clerkId: v.string(),
    sessionId: v.string(),
    createdAt: v.string(),
    endedAt: v.optional(v.string()),
    status: v.string(), // "created", "ended", "revoked"
    lastUpdated: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_sessionId", ["sessionId"]),

  // Organizations
  organizations: defineTable({
    orgId: v.string(), // Clerk organization ID
    name: v.string(),
    slug: v.string(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_slug", ["slug"]),

  // Organization memberships
  organizationMemberships: defineTable({
    membershipId: v.string(), // Clerk membership ID
    orgId: v.string(),
    userId: v.string(), // Clerk user ID
    role: v.string(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_membershipId", ["membershipId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"]),

  // Webhook logs
  webhookLogs: defineTable({
    eventType: v.string(),
    timestamp: v.string(),
    data: v.any(),
    status: v.string(), // "success", "error"
    errorMessage: v.optional(v.string()),
  })
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  // Rest of your existing schema...
})
