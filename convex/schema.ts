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
    imageUrl: v.optional(v.string()),
    clerkId: v.optional(v.string()), // Add this line
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_clerkId", ["clerkId"]), // Add this line
})
