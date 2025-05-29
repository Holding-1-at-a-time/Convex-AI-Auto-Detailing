import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.string(), // "customer", "business", "admin"
    phone: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Business profiles
  businessProfiles: defineTable({
    userId: v.string(), // Clerk user ID
    businessName: v.string(),
    businessType: v.string(), // "mobile", "fixed_location", "both"
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.number()),
    servicesOffered: v.array(v.string()),
    serviceArea: v.array(v.string()),
    businessHours: v.any(),
    logo: v.optional(v.string()),
    photos: v.array(v.string()),
    socialMedia: v.any(),
    onboardingCompleted: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  // Customer profiles
  customerProfiles: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    preferredContactMethod: v.optional(v.string()),
    notificationPreferences: v.object({
      email: v.optional(v.boolean()),
      sms: v.optional(v.boolean()),
      push: v.optional(v.boolean()),
    }),
    onboardingCompleted: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // Business services
  businessServices: defineTable({
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration: v.number(), // in minutes
    category: v.string(),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_isActive", ["isActive"])
    .index("by_category", ["category"]),

  // Business availability
  businessAvailability: defineTable({
    businessId: v.id("businessProfiles"),
    dayOfWeek: v.string(), // "monday", "tuesday", etc.
    isOpen: v.boolean(),
    openTime: v.optional(v.string()), // "09:00"
    closeTime: v.optional(v.string()), // "17:00"
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_day", ["businessId", "dayOfWeek"]),

  // Special day availability (holidays, etc.)
  specialDayAvailability: defineTable({
    businessId: v.id("businessProfiles"),
    date: v.string(), // "2024-12-25"
    isOpen: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_date", ["businessId", "date"]),

  // Vehicles
  vehicles: defineTable({
    userId: v.string(), // Clerk user ID
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    vin: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    lastUpdated: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // Appointments
  appointments: defineTable({
    businessId: v.id("businessProfiles"),
    customerId: v.string(), // Clerk user ID
    serviceId: v.optional(v.id("businessServices")),
    vehicleId: v.optional(v.id("vehicles")),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    price: v.optional(v.number()),
    status: v.string(), // "scheduled", "confirmed", "in_progress", "completed", "cancelled"
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
    reminderSent: v.boolean(),
    followupSent: v.boolean(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_customerId", ["customerId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_date", ["date"])
    .index("by_businessId_date", ["businessId", "date"])
    .index("by_status", ["status"]),

  // Customer feedback
  customerFeedback: defineTable({
    appointmentId: v.id("appointments"),
    customerId: v.string(), // Clerk user ID
    businessId: v.id("businessProfiles"),
    serviceRating: v.number(), // 1-5
    staffRating: v.optional(v.number()), // 1-5
    businessRating: v.optional(v.number()), // 1-5
    comments: v.optional(v.string()),
    businessResponse: v.optional(v.string()),
    status: v.string(), // "pending", "responded"
    createdAt: v.string(),
    respondedAt: v.optional(v.string()),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_customerId", ["customerId"])
    .index("by_businessId", ["businessId"])
    .index("by_status", ["status"]),

  // Customer loyalty
  customerLoyalty: defineTable({
    customerId: v.string(), // Clerk user ID
    points: v.number(),
    tier: v.string(), // "bronze", "silver", "gold", "platinum"
    pointsHistory: v.array(
      v.object({
        date: v.string(),
        amount: v.number(),
        reason: v.string(),
        appointmentId: v.optional(v.id("appointments")),
      }),
    ),
    rewards: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          cost: v.number(),
          redeemed: v.boolean(),
          redeemedDate: v.optional(v.string()),
        }),
      ),
    ),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_customerId", ["customerId"]),

  // Service packages (for complex services)
  servicePackages: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    services: v.array(v.string()),
    price: v.number(),
    duration: v.number(),
    active: v.boolean(),
    popularityRank: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_active", ["active"])
    .index("by_category", ["category"]),

  // Staff (for businesses with employees)
  staff: defineTable({
    businessId: v.id("businessProfiles"),
    userId: v.string(), // Clerk user ID
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(), // "manager", "technician", "assistant"
    status: v.string(), // "active", "inactive"
    hireDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // Products/Inventory
  products: defineTable({
    businessId: v.id("businessProfiles"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    brand: v.optional(v.string()),
    stockQuantity: v.number(),
    reorderThreshold: v.number(),
    unitPrice: v.number(),
    supplier: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_businessId", ["businessId"])
    .index("by_category", ["category"]),

  // Inventory transactions
  inventoryTransactions: defineTable({
    productId: v.id("products"),
    type: v.string(), // "purchase", "use", "adjustment"
    quantity: v.number(),
    date: v.string(),
    staffId: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_productId", ["productId"])
    .index("by_type", ["type"])
    .index("by_date", ["date"]),

  // Business metrics
  businessMetrics: defineTable({
    businessId: v.id("businessProfiles"),
    date: v.string(),
    period: v.string(), // "day", "week", "month"
    revenue: v.number(),
    appointmentsCount: v.number(),
    servicesCount: v.number(),
    newCustomersCount: v.number(),
    avgRating: v.optional(v.number()),
    createdAt: v.string(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_date", ["date"])
    .index("by_period", ["period"]),

  // Promotions
  promotions: defineTable({
    businessId: v.optional(v.id("businessProfiles")), // null for system-wide
    code: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.string(), // "percentage", "fixed"
    value: v.number(),
    minPurchase: v.optional(v.number()),
    maxDiscount: v.optional(v.number()),
    applicableServices: v.optional(v.array(v.string())),
    startDate: v.string(),
    endDate: v.string(),
    usageLimit: v.optional(v.number()),
    usageCount: v.number(),
    active: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_businessId", ["businessId"])
    .index("by_active", ["active"]),

  // Detailing records (service history)
  detailingRecords: defineTable({
    vehicleId: v.id("vehicles"),
    appointmentId: v.id("appointments"),
    userId: v.string(), // Clerk user ID
    businessId: v.id("businessProfiles"),
    service: v.string(),
    date: v.string(),
    price: v.optional(v.number()),
    staffId: v.optional(v.string()),
    notes: v.optional(v.string()),
    products: v.optional(v.array(v.id("products"))),
    beforeImages: v.optional(v.array(v.string())),
    afterImages: v.optional(v.array(v.string())),
    createdAt: v.string(),
  })
    .index("by_vehicleId", ["vehicleId"])
    .index("by_userId", ["userId"])
    .index("by_businessId", ["businessId"])
    .index("by_date", ["date"]),

  // Product usage tracking
  productUsage: defineTable({
    vehicleId: v.id("vehicles"),
    productId: v.id("products"),
    detailingRecordId: v.id("detailingRecords"),
    date: v.string(),
    quantity: v.number(),
    createdAt: v.string(),
  })
    .index("by_vehicleId", ["vehicleId"])
    .index("by_productId", ["productId"])
    .index("by_detailingRecordId", ["detailingRecordId"]),

  // Staff performance metrics
  staffPerformance: defineTable({
    staffId: v.string(),
    businessId: v.id("businessProfiles"),
    period: v.string(), // "YYYY-MM"
    servicesCompleted: v.number(),
    revenue: v.number(),
    customerRating: v.number(),
    efficiency: v.number(), // percentage
    upsellRate: v.number(), // percentage
    createdAt: v.string(),
  })
    .index("by_staffId", ["staffId"])
    .index("by_businessId", ["businessId"])
    .index("by_staffId_period", ["staffId", "period"]),

  // Staff availability
  staffAvailability: defineTable({
    staffId: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_staffId", ["staffId"])
    .index("by_date", ["date"]),
})
