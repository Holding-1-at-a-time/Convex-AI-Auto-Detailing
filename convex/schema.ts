import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.string(),
  }).index("by_email", ["email"]),

  // Vehicles table
  vehicles: defineTable({
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_userId", ["userId"]),

  // Detailing records table
  detailingRecords: defineTable({
    vehicleId: v.id("vehicles"),
    service: v.string(),
    date: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_vehicleId", ["vehicleId"]),

  // Products table
  products: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.string(),
    recommendedFor: v.array(v.string()),
    createdAt: v.string(),
  }).index("by_category", ["category"]),

  // Product usage records
  productUsage: defineTable({
    vehicleId: v.id("vehicles"),
    productId: v.id("products"),
    date: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_vehicleId", ["vehicleId"]),

  // Vehicle condition assessments
  conditionAssessments: defineTable({
    vehicleId: v.id("vehicles"),
    date: v.string(),
    overallScore: v.number(),
    exteriorScore: v.number(),
    interiorScore: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_vehicleId", ["vehicleId"]),
})
