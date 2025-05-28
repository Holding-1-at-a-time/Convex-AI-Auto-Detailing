import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    _id: v.string(), // Use Clerk's userId as the Convex _id
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()), // "customer", "business", "admin"
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.string(),
    lastLogin: v.optional(v.string()),
    preferences: v.optional(v.any()),
    onboardingCompleted: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),
})
