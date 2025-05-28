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

  // Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()), // "admin", "staff", "customer"
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    createdAt: v.string(),
    lastLogin: v.optional(v.string()),
    preferences: v.optional(v.any()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Vehicles table
  vehicles: defineTable({
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    lastUpdated: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_make_model", ["make", "model"]),

  // Detailing records table
  detailingRecords: defineTable({
    vehicleId: v.id("vehicles"),
    userId: v.string(),
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
    .index("by_date", ["date"])
    .index("by_service", ["service"]),

  // Products table
  products: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.string(),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    sku: v.optional(v.string()),
    supplier: v.optional(v.string()),
    recommendedFor: v.array(v.string()),
    inStock: v.optional(v.boolean()),
    stockQuantity: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
    createdAt: v.string(),
    lastUpdated: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_name", ["name"])
    .index("by_supplier", ["supplier"]),

  // Product usage records
  productUsage: defineTable({
    vehicleId: v.id("vehicles"),
    productId: v.id("products"),
    detailingRecordId: v.optional(v.id("detailingRecords")),
    date: v.string(),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_vehicleId", ["vehicleId"])
    .index("by_productId", ["productId"])
    .index("by_date", ["date"]),

  // Vehicle condition assessments
  conditionAssessments: defineTable({
    vehicleId: v.id("vehicles"),
    date: v.string(),
    overallScore: v.number(),
    exteriorScore: v.number(),
    interiorScore: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    assessedBy: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    aiAnalysisResults: v.optional(
      v.object({
        detectedIssues: v.array(v.string()),
        recommendedActions: v.array(v.string()),
        confidenceScore: v.number(),
      }),
    ),
  })
    .index("by_vehicleId", ["vehicleId"])
    .index("by_date", ["date"]),

  // Knowledge base embeddings for vector search
  knowledgeEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    category: v.string(), // e.g., "product", "technique", "vehicle_specific"
    tags: v.array(v.string()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536, // OpenAI embedding dimensions
    filterFields: ["category", "tags"],
  }),

  // Knowledge base content (separate from embeddings for efficiency)
  knowledgeBase: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    embeddingId: v.id("knowledgeEmbeddings"),
    createdAt: v.string(),
    updatedAt: v.string(),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    verified: v.optional(v.boolean()),
  })
    .index("by_embedding", ["embeddingId"])
    .index("by_category", ["category"])
    .index("by_title", ["title"]),

  // Product embeddings for vector search
  productEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    category: v.string(),
    vehicleTypes: v.array(v.string()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["category", "vehicleTypes"],
  }),

  // Vehicle-specific recommendation embeddings
  vehicleRecommendationEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    make: v.string(),
    model: v.string(),
    yearRange: v.array(v.number()), // [min_year, max_year]
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["make"],
  }),

  // Vehicle-specific recommendations (separate from embeddings)
  vehicleRecommendations: defineTable({
    title: v.string(),
    description: v.string(),
    make: v.string(),
    model: v.string(),
    yearRange: v.array(v.number()),
    priority: v.string(), // "high", "medium", "low"
    embeddingId: v.id("vehicleRecommendationEmbeddings"),
    createdAt: v.string(),
  })
    .index("by_embedding", ["embeddingId"])
    .index("by_vehicle", ["make", "model"]),

  // User queries and their embeddings for analytics
  userQueryEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["category"],
  }),

  // User queries for analytics and improvement
  userQueries: defineTable({
    userId: v.optional(v.string()),
    threadId: v.string(),
    query: v.string(),
    embeddingId: v.id("userQueryEmbeddings"),
    timestamp: v.string(),
    responseQuality: v.optional(v.number()), // User feedback on response quality
    responseTime: v.optional(v.number()), // Time taken to respond in ms
  })
    .index("by_embedding", ["embeddingId"])
    .index("by_thread", ["threadId"])
    .index("by_userId", ["userId"]),

  // NEW TABLES

  // Appointments table
  appointments: defineTable({
    customerId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    staffId: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    status: v.string(), // "scheduled", "confirmed", "completed", "cancelled", "no-show"
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
    reminderSent: v.optional(v.boolean()),
    followupSent: v.optional(v.boolean()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_staffId", ["staffId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_date_status", ["date", "status"]),

  // Staff table
  staff: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(), // "manager", "senior_detailer", "detailer", "apprentice"
    specialties: v.array(v.string()),
    hireDate: v.string(),
    status: v.string(), // "active", "inactive", "on_leave"
    certifications: v.optional(v.array(v.string())),
    schedule: v.optional(v.any()), // Weekly schedule
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  // Staff availability
  staffAvailability: defineTable({
    staffId: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
    reason: v.optional(v.string()), // Reason if not available
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_staffId", ["staffId"])
    .index("by_date", ["date"])
    .index("by_staffId_date", ["staffId", "date"]),

  // Staff performance
  staffPerformance: defineTable({
    staffId: v.string(),
    period: v.string(), // "2025-04" (YYYY-MM)
    servicesCompleted: v.number(),
    revenue: v.number(),
    customerRating: v.optional(v.number()),
    efficiency: v.optional(v.number()), // Percentage
    upsellRate: v.optional(v.number()), // Percentage
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_staffId", ["staffId"])
    .index("by_period", ["period"])
    .index("by_staffId_period", ["staffId", "period"]),

  // Inventory transactions
  inventoryTransactions: defineTable({
    productId: v.id("products"),
    type: v.string(), // "purchase", "use", "adjustment", "return", "write-off"
    quantity: v.number(), // Positive for additions, negative for removals
    date: v.string(),
    staffId: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_productId", ["productId"])
    .index("by_date", ["date"])
    .index("by_type", ["type"]),

  // Suppliers
  suppliers: defineTable({
    name: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    products: v.optional(v.array(v.id("products"))),
    terms: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_name", ["name"]),

  // Purchase orders
  purchaseOrders: defineTable({
    supplierId: v.id("suppliers"),
    orderDate: v.string(),
    status: v.string(), // "draft", "submitted", "received", "cancelled"
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
    totalAmount: v.number(),
    expectedDelivery: v.optional(v.string()),
    actualDelivery: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_supplierId", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_orderDate", ["orderDate"]),

  // Customer feedback
  customerFeedback: defineTable({
    customerId: v.string(),
    appointmentId: v.id("appointments"),
    serviceRating: v.number(), // 1-5
    staffRating: v.optional(v.number()), // 1-5
    comments: v.optional(v.string()),
    followupStatus: v.optional(v.string()), // "pending", "contacted", "resolved"
    staffResponse: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_appointmentId", ["appointmentId"]),

  // Marketing campaigns
  marketingCampaigns: defineTable({
    name: v.string(),
    type: v.string(), // "email", "social", "local", "referral", "promotion"
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.string(), // "planned", "active", "completed", "cancelled"
    budget: v.optional(v.number()),
    target: v.optional(v.any()), // Target audience
    content: v.optional(v.any()), // Campaign content
    metrics: v.optional(
      v.object({
        impressions: v.optional(v.number()),
        clicks: v.optional(v.number()),
        conversions: v.optional(v.number()),
        revenue: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  // Service packages
  servicePackages: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(), // "basic", "standard", "premium", "custom"
    services: v.array(v.string()),
    price: v.number(),
    duration: v.number(), // In minutes
    active: v.boolean(),
    popularityRank: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_active", ["active"]),

  // Business metrics
  businessMetrics: defineTable({
    date: v.string(), // YYYY-MM-DD for daily, YYYY-MM for monthly
    period: v.string(), // "day", "month", "quarter", "year"
    revenue: v.number(),
    expenses: v.optional(v.number()),
    profit: v.optional(v.number()),
    appointmentsCount: v.number(),
    servicesCount: v.number(),
    newCustomersCount: v.optional(v.number()),
    returningCustomersCount: v.optional(v.number()),
    averageServiceValue: v.optional(v.number()),
    productsSold: v.optional(v.number()),
    productRevenue: v.optional(v.number()),
    staffHours: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_period", ["period"]),

  // Promotions and discounts
  promotions: defineTable({
    code: v.string(),
    description: v.string(),
    type: v.string(), // "percentage", "fixed", "free_service", "bundle"
    value: v.number(), // Percentage or fixed amount
    minPurchase: v.optional(v.number()),
    applicableServices: v.optional(v.array(v.string())),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
    usageCount: v.number(),
    active: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_active", ["active"]),

  // Customer loyalty
  customerLoyalty: defineTable({
    customerId: v.string(),
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

  analyticsEvents: defineTable({
    errorMessage: v.optional(v.string()),
    eventType: v.string(),
    feature: v.optional(v.string()),
    metadata: v.optional(v.any()),
    page: v.optional(v.string()),
    timestamp: v.string(),
    userId: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  files: defineTable({
    contentType: v.string(),
    description: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.float64(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    tags: v.optional(v.array(v.string())),
    uploadedAt: v.string(),
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.id("vehicles")),
  })
    .index("by_userId", ["userId"])
    .index("by_vehicleId", ["vehicleId"]),
})
