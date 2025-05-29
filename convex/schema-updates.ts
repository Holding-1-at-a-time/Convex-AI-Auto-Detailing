import { defineTable } from "convex/server"
import { v } from "convex/values"

// This file contains schema updates that would be applied to the existing schema

export const servicePackagesTable = defineTable({
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

export const serviceCategoriesTable = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  icon: v.optional(v.string()),
  displayOrder: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.optional(v.string()),
})
  .index("by_name", ["name"])
  .index("by_displayOrder", ["displayOrder"])

export const serviceReviewsTable = defineTable({
  serviceId: v.id("servicePackages"),
  customerId: v.string(),
  rating: v.number(), // 1-5
  comment: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("by_serviceId", ["serviceId"])
  .index("by_customerId", ["customerId"])
  .index("by_rating", ["rating"])
  .index("by_serviceId_rating", ["serviceId", "rating"])
