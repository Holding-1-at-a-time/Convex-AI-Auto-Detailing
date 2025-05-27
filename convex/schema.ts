import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
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
    vin: v.optional(v.string()),
    imageUrl: v.optional(v.id("files")),
    lastDetailingDate: v.optional(v.string()),
    detailingScore: v.optional(v.number()),
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
    imageUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    brand: v.optional(v.string()),
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
    imageUrls: v.optional(v.array(v.string())),
    aiAnalysisResults: v.optional(
      v.object({
        detectedIssues: v.array(v.string()),
        recommendedActions: v.array(v.string()),
        confidenceScore: v.number(),
      }),
    ),
  }).index("by_vehicleId", ["vehicleId"]),

  // Files table
  files: defineTable({
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.id("vehicles")),
    storageId: v.id("_storage"),
    contentType: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    uploadedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_vehicleId", ["vehicleId"]),

  // Analytics events
  analyticsEvents: defineTable({
    userId: v.optional(v.string()),
    eventType: v.string(),
    page: v.optional(v.string()),
    feature: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.string(),
  }).index("by_userId", ["userId"]),

  // Knowledge base embeddings for vector search
  knowledgeEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    category: v.string(), // e.g., "product", "technique", "vehicle_specific"
    tags: v.array(v.string()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 384, // granite-embedding:278m dimensions
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
  })
    .index("by_embedding", ["embeddingId"])
    .index("by_category", ["category"]),

  // Product embeddings for vector search
  productEmbeddings: defineTable({
    embedding: v.array(v.float64()),
    productId: v.id("products"),
    category: v.string(),
    vehicleTypes: v.array(v.string()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 384, // granite-embedding:278m dimensions
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
    dimensions: 384, // granite-embedding:278m dimensions
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
    dimensions: 384, // granite-embedding:278m dimensions
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
  })
    .index("by_embedding", ["embeddingId"])
    .index("by_thread", ["threadId"]),
})
