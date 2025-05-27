import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getCurrentTimestamp } from "./utils"
import { internal } from "./_generated/api"

// Add a product
export const addProduct = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.string(),
    recommendedFor: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    brand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if product already exists
    const existingProduct = await ctx.db
      .query("products")
      .filter((q) => q.and(q.eq(q.field("name"), args.name), q.eq(q.field("brand"), args.brand || "")))
      .first()

    if (existingProduct) {
      throw new Error("A product with this name and brand already exists")
    }

    // Create the product
    const productId = await ctx.db.insert("products", {
      name: args.name,
      category: args.category,
      description: args.description,
      recommendedFor: args.recommendedFor,
      imageUrl: args.imageUrl,
      price: args.price,
      brand: args.brand,
      createdAt: getCurrentTimestamp(),
    })

    // Generate embedding for the product if we have embedding functionality
    try {
      await ctx.runAction(internal.embeddings.storeProductEmbedding, {
        productId,
        name: args.name,
        description: args.description,
        category: args.category,
        recommendedFor: args.recommendedFor,
      })
    } catch (error) {
      console.error("Failed to generate product embedding:", error)
      // Continue anyway, embedding is not critical
    }

    return productId
  },
})

// Update a product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    recommendedFor: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    brand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)

    if (!product) {
      throw new Error("Product not found")
    }

    // Update only the provided fields
    const updates: any = {}
    if (args.name !== undefined) updates.name = args.name
    if (args.category !== undefined) updates.category = args.category
    if (args.description !== undefined) updates.description = args.description
    if (args.recommendedFor !== undefined) updates.recommendedFor = args.recommendedFor
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl
    if (args.price !== undefined) updates.price = args.price
    if (args.brand !== undefined) updates.brand = args.brand

    await ctx.db.patch(args.productId, updates)

    // Update embedding if significant fields changed
    if (
      args.name !== undefined ||
      args.description !== undefined ||
      args.category !== undefined ||
      args.recommendedFor !== undefined
    ) {
      try {
        await ctx.runAction(internal.embeddings.storeProductEmbedding, {
          productId: args.productId,
          name: args.name || product.name,
          description: args.description || product.description,
          category: args.category || product.category,
          recommendedFor: args.recommendedFor || product.recommendedFor,
        })
      } catch (error) {
        console.error("Failed to update product embedding:", error)
        // Continue anyway, embedding is not critical
      }
    }

    return args.productId
  },
})

// Delete a product
export const deleteProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)

    if (!product) {
      throw new Error("Product not found")
    }

    // Delete product usage records
    const usageRecords = await ctx.db
      .query("productUsage")
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .collect()

    for (const record of usageRecords) {
      await ctx.db.delete(record._id)
    }

    // Delete product embedding
    try {
      const productEmbedding = await ctx.db
        .query("productEmbeddings")
        .filter((q) => q.eq(q.field("productId"), args.productId))
        .first()

      if (productEmbedding) {
        await ctx.db.delete(productEmbedding._id)
      }
    } catch (error) {
      console.error("Failed to delete product embedding:", error)
      // Continue anyway, embedding is not critical
    }

    // Delete the product
    await ctx.db.delete(args.productId)

    return { success: true }
  },
})

// Get all products
export const getAllProducts = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    skip: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let productsQuery = ctx.db.query("products")

    // Filter by category if provided
    if (args.category) {
      productsQuery = productsQuery.filter((q) => q.eq(q.field("category"), args.category!))
    }

    // Apply pagination
    if (args.skip) {
      productsQuery = productsQuery.skip(args.skip)
    }

    const limit = args.limit || 50
    const products = await productsQuery.take(limit)

    return products
  },
})

// Search products
export const searchProducts = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchTerms = args.query.toLowerCase().split(" ")
    const limit = args.limit || 20

    let productsQuery = ctx.db.query("products")

    // Filter by category if provided
    if (args.category) {
      productsQuery = productsQuery.filter((q) => q.eq(q.field("category"), args.category!))
    }

    const allProducts = await productsQuery.collect()

    // Simple search implementation
    const results = allProducts.filter((product) => {
      const nameMatch = searchTerms.some((term) => product.name.toLowerCase().includes(term))

      const descriptionMatch = searchTerms.some((term) => product.description.toLowerCase().includes(term))

      const categoryMatch = searchTerms.some((term) => product.category.toLowerCase().includes(term))

      const recommendedForMatch = searchTerms.some((term) =>
        product.recommendedFor.some((rec) => rec.toLowerCase().includes(term)),
      )

      return nameMatch || descriptionMatch || categoryMatch || recommendedForMatch
    })

    // Sort by relevance (simple implementation)
    results.sort((a, b) => {
      const aNameMatches = searchTerms.filter((term) => a.name.toLowerCase().includes(term)).length

      const bNameMatches = searchTerms.filter((term) => b.name.toLowerCase().includes(term)).length

      // Prioritize name matches
      if (aNameMatches !== bNameMatches) {
        return bNameMatches - aNameMatches
      }

      // Then description matches
      const aDescMatches = searchTerms.filter((term) => a.description.toLowerCase().includes(term)).length

      const bDescMatches = searchTerms.filter((term) => b.description.toLowerCase().includes(term)).length

      return bDescMatches - aDescMatches
    })

    return results.slice(0, limit)
  },
})

// Get product usage statistics
export const getProductUsageStats = query({
  args: {
    productId: v.optional(v.id("products")),
    timeframe: v.optional(v.string()), // "week", "month", "year", "all"
  },
  handler: async (ctx, args) => {
    let usageQuery = ctx.db.query("productUsage")

    // Filter by product if provided
    if (args.productId) {
      usageQuery = usageQuery.filter((q) => q.eq(q.field("productId"), args.productId!))
    }

    const allUsage = await usageQuery.collect()

    // Filter by timeframe
    let filteredUsage = allUsage
    if (args.timeframe) {
      const now = new Date()
      let cutoffDate: Date

      switch (args.timeframe) {
        case "week":
          cutoffDate = new Date(now.setDate(now.getDate() - 7))
          break
        case "month":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case "year":
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
        default:
          cutoffDate = new Date(0) // Beginning of time
      }

      filteredUsage = allUsage.filter((usage) => new Date(usage.date) >= cutoffDate)
    }

    // Group by product
    const productCounts: Record<string, number> = {}
    for (const usage of filteredUsage) {
      if (!productCounts[usage.productId]) {
        productCounts[usage.productId] = 0
      }
      productCounts[usage.productId]++
    }

    // Get product details and format results
    const results = []
    for (const [productId, count] of Object.entries(productCounts)) {
      const product = await ctx.db.get(productId as any)
      if (product) {
        results.push({
          product: {
            id: productId,
            name: product.name,
            category: product.category,
            brand: product.brand,
          },
          count,
        })
      }
    }

    // Sort by usage count (descending)
    results.sort((a, b) => b.count - a.count)

    return results
  },
})

// Add product embedding function to embeddings.ts
export const storeProductEmbedding = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    recommendedFor: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // This would be implemented in embeddings.ts
    // For now, just return success
    return { success: true }
  },
})
