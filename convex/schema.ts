import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    picture: v.optional(v.string()),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  businessProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    hours: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"]),

  vehicles: defineTable({
    customerId: v.string(),
    year: v.string(),
    make: v.string(),
    model: v.string(),
    trim: v.optional(v.string()),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    engine: v.optional(v.string()),
    transmission: v.optional(v.string()),
    mileage: v.optional(v.number()),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_vin", ["vin"])
    .index("by_licensePlate", ["licensePlate"]),

  servicePackages: defineTable({
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    duration: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_name", ["name"]),

  // Add business ID to appointments
  appointments: defineTable({
    customerId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    businessId: v.optional(v.id("businessProfiles")), // Add this field
    staffId: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    status: v.string(),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
    reminderSent: v.boolean(),
    followupSent: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_staffId", ["staffId"])
    .index("by_businessId", ["businessId"]) // Add this index
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  // Add recommendation interactions tracking
  recommendationInteractions: defineTable({
    customerId: v.string(),
    serviceId: v.id("servicePackages"),
    interactionType: v.string(),
    timestamp: v.string(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_timestamp", ["timestamp"]),
})
