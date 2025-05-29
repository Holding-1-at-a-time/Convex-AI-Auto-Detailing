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

  appointments: defineTable({
    customerId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    businessId: v.optional(v.id("businessProfiles")),
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
    // New fields for enhanced appointment management
    rescheduleHistory: v.optional(
      v.array(
        v.object({
          originalDate: v.string(),
          originalStartTime: v.string(),
          originalEndTime: v.string(),
          newDate: v.string(),
          newStartTime: v.string(),
          newEndTime: v.string(),
          reason: v.optional(v.string()),
          rescheduledBy: v.string(),
          rescheduledAt: v.string(),
        }),
      ),
    ),
    communicationLog: v.optional(
      v.array(
        v.object({
          type: v.string(),
          message: v.string(),
          sentBy: v.string(),
          sentAt: v.string(),
          status: v.optional(v.string()),
        }),
      ),
    ),
    cancellationReason: v.optional(v.string()),
    cancelledBy: v.optional(v.string()),
    cancelledAt: v.optional(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_staffId", ["staffId"])
    .index("by_businessId", ["businessId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_businessId_date", ["businessId", "date"])
    .index("by_businessId_status", ["businessId", "status"]),

  recommendationInteractions: defineTable({
    customerId: v.string(),
    serviceId: v.id("servicePackages"),
    interactionType: v.string(),
    timestamp: v.string(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_timestamp", ["timestamp"]),

  // New tables for appointment management system
  blockedTimeSlots: defineTable({
    businessId: v.id("businessProfiles"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    reason: v.optional(v.string()),
    isRecurring: v.boolean(),
    recurringPattern: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    recurringEndDate: v.optional(v.string()),
    originalId: v.optional(v.id("blockedTimeSlots")), // For recurring blocks
    createdBy: v.string(),
    createdAt: v.string(),
    isActive: v.boolean(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_date", ["businessId", "date"])
    .index("by_date", ["date"])
    .index("by_originalId", ["originalId"])
    .index("by_isActive", ["isActive"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("appointment_confirmation"),
      v.literal("appointment_reminder"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_rescheduled"),
      v.literal("feedback_request"),
      v.literal("system_update"),
      v.literal("marketing"),
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    read: v.boolean(),
    readAt: v.optional(v.string()),
    createdAt: v.string(),
    expiresAt: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"])
    .index("by_read", ["read"])
    .index("by_userId_read", ["userId", "read"])
    .index("by_createdAt", ["createdAt"])
    .index("by_priority", ["priority"]),

  feedback: defineTable({
    appointmentId: v.id("appointments"),
    customerId: v.string(),
    businessId: v.id("businessProfiles"),
    rating: v.number(), // Overall rating 1-5
    comment: v.optional(v.string()),
    serviceQuality: v.optional(v.number()), // 1-5
    timeliness: v.optional(v.number()), // 1-5
    professionalism: v.optional(v.number()), // 1-5
    valueForMoney: v.optional(v.number()), // 1-5
    wouldRecommend: v.optional(v.boolean()),
    createdAt: v.string(),
    isPublic: v.boolean(), // Whether to show publicly
    businessResponse: v.optional(v.string()),
    businessResponseAt: v.optional(v.string()),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_businessId", ["businessId"])
    .index("by_customerId", ["customerId"])
    .index("by_rating", ["rating"])
    .index("by_businessId_rating", ["businessId", "rating"])
    .index("by_isPublic", ["isPublic"])
    .index("by_createdAt", ["createdAt"]),

  staffAvailability: defineTable({
    staffId: v.string(),
    businessId: v.id("businessProfiles"),
    date: v.string(),
    isAvailable: v.boolean(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    breakTimes: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
          reason: v.optional(v.string()),
        }),
      ),
    ),
    reason: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_staffId", ["staffId"])
    .index("by_date", ["date"])
    .index("by_staffId_date", ["staffId", "date"])
    .index("by_businessId", ["businessId"])
    .index("by_businessId_date", ["businessId", "date"])
    .index("by_isAvailable", ["isAvailable"]),

  // Business hours and availability settings
  businessHours: defineTable({
    businessId: v.id("businessProfiles"),
    dayOfWeek: v.number(), // 0-6 (Sunday-Saturday)
    isOpen: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    breakTimes: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
          name: v.optional(v.string()),
        }),
      ),
    ),
    updatedAt: v.string(),
    updatedBy: v.string(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_dayOfWeek", ["businessId", "dayOfWeek"])
    .index("by_dayOfWeek", ["dayOfWeek"]),

  // Staff members
  staff: defineTable({
    businessId: v.id("businessProfiles"),
    userId: v.optional(v.id("users")), // If staff member has an account
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.string(),
    specialties: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    hireDate: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_userId", ["userId"])
    .index("by_isActive", ["isActive"])
    .index("by_businessId_isActive", ["businessId", "isActive"]),

  // Email logs for tracking all email communications
  emailLogs: defineTable({
    appointmentId: v.optional(v.id("appointments")),
    bundleBookingId: v.optional(v.string()),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    emailType: v.union(
      v.literal("confirmation"),
      v.literal("reminder"),
      v.literal("cancellation"),
      v.literal("rescheduling"),
      v.literal("feedback_request"),
      v.literal("marketing"),
      v.literal("system_notification"),
    ),
    subject: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("failed"),
      v.literal("bounced"),
    ),
    sentAt: v.string(),
    deliveredAt: v.optional(v.string()),
    openedAt: v.optional(v.string()),
    clickedAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_bundleBookingId", ["bundleBookingId"])
    .index("by_recipientEmail", ["recipientEmail"])
    .index("by_emailType", ["emailType"])
    .index("by_status", ["status"])
    .index("by_sentAt", ["sentAt"]),

  // Service bundles for package deals
  serviceBundles: defineTable({
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.string(),
    services: v.array(v.id("servicePackages")), // Array of service IDs
    originalPrice: v.number(), // Sum of individual service prices
    bundlePrice: v.number(), // Discounted bundle price
    savings: v.number(), // Amount saved
    duration: v.number(), // Total duration in minutes
    isActive: v.boolean(),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()), // Max times this bundle can be purchased
    currentRedemptions: v.number(),
    imageUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_isActive", ["isActive"])
    .index("by_businessId_isActive", ["businessId", "isActive"])
    .index("by_name", ["name"])
    .index("by_createdAt", ["createdAt"]),

  // Bundle bookings for tracking bundle purchases and usage
  bundleBookings: defineTable({
    customerId: v.string(),
    bundleId: v.id("serviceBundles"),
    businessId: v.id("businessProfiles"),
    purchaseDate: v.string(),
    totalPrice: v.number(),
    servicesIncluded: v.array(
      v.object({
        serviceId: v.id("servicePackages"),
        serviceName: v.string(),
        isRedeemed: v.boolean(),
        redeemedAt: v.optional(v.string()),
        appointmentId: v.optional(v.id("appointments")),
      }),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("partially_used"),
      v.literal("fully_used"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),
    expiryDate: v.optional(v.string()),
    refundAmount: v.optional(v.number()),
    refundReason: v.optional(v.string()),
    refundedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_bundleId", ["bundleId"])
    .index("by_businessId", ["businessId"])
    .index("by_status", ["status"])
    .index("by_customerId_status", ["customerId", "status"])
    .index("by_businessId_status", ["businessId", "status"])
    .index("by_purchaseDate", ["purchaseDate"])
    .index("by_expiryDate", ["expiryDate"]),

  // Bundle service records for tracking individual service redemptions
  bundleServiceRecords: defineTable({
    bundleBookingId: v.id("bundleBookings"),
    serviceId: v.id("servicePackages"),
    customerId: v.string(),
    businessId: v.id("businessProfiles"),
    appointmentId: v.optional(v.id("appointments")),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    status: v.union(
      v.literal("available"),
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("expired"),
    ),
    redeemedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    cancelledAt: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_bundleBookingId", ["bundleBookingId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_customerId", ["customerId"])
    .index("by_businessId", ["businessId"])
    .index("by_appointmentId", ["appointmentId"])
    .index("by_status", ["status"])
    .index("by_customerId_status", ["customerId", "status"])
    .index("by_businessId_status", ["businessId", "status"])
    .index("by_scheduledDate", ["scheduledDate"]),

  // Cancellation policies for businesses
  cancellationPolicies: defineTable({
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.string(),
    rules: v.array(
      v.object({
        hoursBeforeAppointment: v.number(),
        refundPercentage: v.number(),
        description: v.string(),
      }),
    ),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_isDefault", ["isDefault"])
    .index("by_isActive", ["isActive"])
    .index("by_businessId_isActive", ["businessId", "isActive"]),
})
