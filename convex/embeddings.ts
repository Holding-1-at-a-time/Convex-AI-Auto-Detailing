import { v } from "convex/values"
import { action, mutation, query } from "./_generated/server"
import { ollama } from "ollama-ai-provider"
import { embed } from "ai"
import { internal } from "./_generated/api"
import { getCurrentTimestamp } from "./utils"

// Generate an embedding for text using Ollama
async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = ollama.embedding("granite-embedding:278m")

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  })

  return embedding
}

// Store a knowledge base item with its embedding
export const storeKnowledgeItem = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the content
    const embedding = await generateEmbedding(`${args.title} ${args.content}`)

    // Store the embedding
    const embeddingId = await ctx.db.insert("knowledgeEmbeddings", {
      embedding,
      category: args.category,
      tags: args.tags,
    })

    // Store the knowledge base item
    const knowledgeId = await ctx.db.insert("knowledgeBase", {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      embeddingId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    })

    return { knowledgeId, embeddingId }
  },
})

// Store a product embedding
export const storeProductEmbedding = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    recommendedFor: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the product
    const embedding = await generateEmbedding(
      `${args.name} ${args.description} ${args.category} ${args.recommendedFor.join(" ")}`,
    )

    // Check if an embedding already exists for this product
    const existingEmbedding = await ctx.db
      .query("productEmbeddings")
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first()

    if (existingEmbedding) {
      // Update existing embedding
      await ctx.db.patch(existingEmbedding._id, {
        embedding,
        category: args.category,
        vehicleTypes: args.recommendedFor,
      })

      return { embeddingId: existingEmbedding._id }
    } else {
      // Store new embedding
      const embeddingId = await ctx.db.insert("productEmbeddings", {
        embedding,
        productId: args.productId,
        category: args.category,
        vehicleTypes: args.recommendedFor,
      })

      return { embeddingId }
    }
  },
})

// Store a vehicle-specific recommendation with its embedding
export const storeVehicleRecommendation = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    make: v.string(),
    model: v.string(),
    yearRange: v.array(v.number()),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the recommendation
    const embedding = await generateEmbedding(
      `${args.make} ${args.model} ${args.yearRange.join("-")} ${args.title} ${args.description}`,
    )

    // Store the embedding
    const embeddingId = await ctx.db.insert("vehicleRecommendationEmbeddings", {
      embedding,
      make: args.make,
      model: args.model,
      yearRange: args.yearRange,
    })

    // Store the recommendation
    const recommendationId = await ctx.db.insert("vehicleRecommendations", {
      title: args.title,
      description: args.description,
      make: args.make,
      model: args.model,
      yearRange: args.yearRange,
      priority: args.priority,
      embeddingId,
      createdAt: getCurrentTimestamp(),
    })

    return { recommendationId, embeddingId }
  },
})

// Store a user query with its embedding for analytics
export const storeUserQuery = mutation({
  args: {
    userId: v.optional(v.string()),
    threadId: v.string(),
    query: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query)

    // Store the embedding
    const embeddingId = await ctx.db.insert("userQueryEmbeddings", {
      embedding,
      category: args.category,
    })

    // Store the query
    const queryId = await ctx.db.insert("userQueries", {
      userId: args.userId,
      threadId: args.threadId,
      query: args.query,
      embeddingId,
      timestamp: getCurrentTimestamp(),
    })

    return { queryId, embeddingId }
  },
})

// Search knowledge base using vector search
export const searchKnowledgeBase = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query)

    // Build the filter based on provided args
    let filter: any = undefined
    if (args.category && args.tags && args.tags.length > 0) {
      // Filter by both category and tags
      filter = (q: any) => {
        const tagFilters = args.tags!.map((tag) => q.includes(q.field("tags"), tag))
        return q.and(q.eq("category", args.category!), q.or(...tagFilters))
      }
    } else if (args.category) {
      // Filter by category only
      filter = (q: any) => q.eq("category", args.category!)
    } else if (args.tags && args.tags.length > 0) {
      // Filter by tags only
      filter = (q: any) => {
        const tagFilters = args.tags!.map((tag) => q.includes(q.field("tags"), tag))
        return q.or(...tagFilters)
      }
    }

    // Perform vector search
    const results = await ctx.vectorSearch("knowledgeEmbeddings", "by_embedding", {
      vector: embedding,
      limit: args.limit || 5,
      filter,
    })

    // Fetch the knowledge base items
    const knowledgeItems = await ctx.runQuery(internal.embeddings.fetchKnowledgeItems, {
      embeddingIds: results.map((result) => result._id),
    })

    // Add relevance scores to the results
    const scoredItems = knowledgeItems.map((item, index) => ({
      ...item,
      relevanceScore: results[index]._score,
    }))

    return scoredItems
  },
})

// Fetch knowledge items by embedding IDs
export const fetchKnowledgeItems = query({
  args: {
    embeddingIds: v.array(v.id("knowledgeEmbeddings")),
  },
  handler: async (ctx, args) => {
    const items = []
    for (const id of args.embeddingIds) {
      const item = await ctx.db
        .query("knowledgeBase")
        .withIndex("by_embedding", (q) => q.eq("embeddingId", id))
        .unique()
      if (item) {
        items.push(item)
      }
    }
    return items
  },
})

// Search products using vector search
export const searchProductsWithEmbedding = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query)

    // Build the filter based on provided args
    let filter: any = undefined
    if (args.category && args.vehicleType) {
      // Filter by both category and vehicle type
      filter = (q: any) => {
        return q.and(q.eq("category", args.category!), q.includes(q.field("vehicleTypes"), args.vehicleType!))
      }
    } else if (args.category) {
      // Filter by category only
      filter = (q: any) => q.eq("category", args.category!)
    } else if (args.vehicleType) {
      // Filter by vehicle type only
      filter = (q: any) => q.includes(q.field("vehicleTypes"), args.vehicleType!)
    }

    // Perform vector search
    const results = await ctx.vectorSearch("productEmbeddings", "by_embedding", {
      vector: embedding,
      limit: args.limit || 5,
      filter,
    })

    // Fetch the products
    const products = []
    for (const result of results) {
      const embedding = await ctx.db.get(result._id)
      if (embedding) {
        const product = await ctx.db.get(embedding.productId)
        if (product) {
          products.push({
            ...product,
            relevanceScore: result._score,
          })
        }
      }
    }

    return products
  },
})

// Search vehicle recommendations using vector search
export const searchVehicleRecommendations = action({
  args: {
    query: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query)

    // Build the filter based on provided args
    let filter: any = undefined
    if (args.make) {
      filter = (q: any) => q.eq("make", args.make!)
    }

    // Perform vector search
    const results = await ctx.vectorSearch("vehicleRecommendationEmbeddings", "by_embedding", {
      vector: embedding,
      limit: args.limit || 5,
      filter,
    })

    // Fetch the recommendations
    const recommendations = await ctx.runQuery(internal.embeddings.fetchVehicleRecommendations, {
      embeddingIds: results.map((result) => result._id),
    })

    // Filter by model and year if provided
    let filteredRecommendations = recommendations
    if (args.model) {
      filteredRecommendations = filteredRecommendations.filter((rec) => rec.model === args.model)
    }
    if (args.year) {
      filteredRecommendations = filteredRecommendations.filter(
        (rec) => args.year! >= rec.yearRange[0] && args.year! <= rec.yearRange[1],
      )
    }

    // Add relevance scores to the results
    const scoredRecommendations = filteredRecommendations.map((rec, index) => ({
      ...rec,
      relevanceScore: results[index]._score,
    }))

    return scoredRecommendations
  },
})

// Fetch vehicle recommendations by embedding IDs
export const fetchVehicleRecommendations = query({
  args: {
    embeddingIds: v.array(v.id("vehicleRecommendationEmbeddings")),
  },
  handler: async (ctx, args) => {
    const recommendations = []
    for (const id of args.embeddingIds) {
      const recommendation = await ctx.db
        .query("vehicleRecommendations")
        .withIndex("by_embedding", (q) => q.eq("embeddingId", id))
        .unique()
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
    return recommendations
  },
})

// Find similar user queries for analytics
export const findSimilarQueries = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await generateEmbedding(args.query)

    // Perform vector search
    const results = await ctx.vectorSearch("userQueryEmbeddings", "by_embedding", {
      vector: embedding,
      limit: args.limit || 10,
    })

    // Fetch the queries
    const queries = await ctx.runQuery(internal.embeddings.fetchUserQueries, {
      embeddingIds: results.map((result) => result._id),
    })

    // Add relevance scores to the results
    const scoredQueries = queries.map((query, index) => ({
      ...query,
      relevanceScore: results[index]._score,
    }))

    return scoredQueries
  },
})

// Fetch user queries by embedding IDs
export const fetchUserQueries = query({
  args: {
    embeddingIds: v.array(v.id("userQueryEmbeddings")),
  },
  handler: async (ctx, args) => {
    const queries = []
    for (const id of args.embeddingIds) {
      const query = await ctx.db
        .query("userQueries")
        .withIndex("by_embedding", (q) => q.eq("embeddingId", id))
        .unique()
      if (query) {
        queries.push(query)
      }
    }
    return queries
  },
})

// Batch import knowledge base items
export const batchImportKnowledge = mutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
        category: v.string(),
        tags: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const results = []
    for (const item of args.items) {
      // Generate embedding for the content
      const embedding = await generateEmbedding(`${item.title} ${item.content}`)

      // Store the embedding
      const embeddingId = await ctx.db.insert("knowledgeEmbeddings", {
        embedding,
        category: item.category,
        tags: item.tags,
      })

      // Store the knowledge base item
      const knowledgeId = await ctx.db.insert("knowledgeBase", {
        title: item.title,
        content: item.content,
        category: item.category,
        tags: item.tags,
        embeddingId,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })

      results.push({ knowledgeId, embeddingId })
    }
    return results
  },
})
