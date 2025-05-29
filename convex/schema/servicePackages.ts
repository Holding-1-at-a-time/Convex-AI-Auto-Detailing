import { defineTable } from "convex/server"
import { v } from "convex/values"

export const servicePackages = defineTable({
  businessId: v.id("businessProfiles"),
  name: v.string(),
  description: v.string(),
  price: v.number(),
  duration: v.number(), // in minutes
  category: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  features: v.optional(v.array(v.string())),
  isActive: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.optional(v.string()),
})
  .index("by_businessId", ["businessId"])
  .index("by_name", ["name"])
  .index("by_category", ["category"])
  .index("by_isActive", ["isActive"])
  .index("by_businessId_isActive", ["businessId", "isActive"])
  .index("by_price", ["price"])
  .index("by_duration", ["duration"])
