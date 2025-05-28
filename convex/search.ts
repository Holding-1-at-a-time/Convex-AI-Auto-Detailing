import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

// Search services
export const searchServices = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        minPrice: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
        duration: v.optional(v.number()),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: args.query,
    })

    // Search for services using vector search
    let services = await ctx.runQuery(internal.embeddings.searchServiceEmbeddings, {
      embedding,
      limit: args.limit || 10,
    })

    // Apply filters if provided
    if (args.filters) {
      if (args.filters.category) {
        services = services.filter((service) => service.category === args.filters.category)
      }

      if (args.filters.minPrice !== undefined) {
        services = services.filter((service) => service.price >= args.filters.minPrice)
      }

      if (args.filters.maxPrice !== undefined) {
        services = services.filter((service) => service.price <= args.filters.maxPrice)
      }

      if (args.filters.duration !== undefined) {
        services = services.filter((service) => service.duration <= args.filters.duration)
      }
    }

    return services
  },
})

// Search businesses
export const searchBusinesses = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        businessType: v.optional(v.string()),
        service: v.optional(v.string()),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: args.query,
    })

    // Search for businesses using vector search
    let businesses = await ctx.runQuery(internal.embeddings.searchBusinessEmbeddings, {
      embedding,
      limit: args.limit || 10,
    })

    // Apply filters if provided
    if (args.filters) {
      if (args.filters.city) {
        businesses = businesses.filter((business) => business.city === args.filters.city)
      }

      if (args.filters.state) {
        businesses = businesses.filter((business) => business.state === args.filters.state)
      }

      if (args.filters.businessType) {
        businesses = businesses.filter((business) => business.businessType === args.filters.businessType)
      }

      if (args.filters.service) {
        businesses = businesses.filter((business) => business.servicesOffered?.includes(args.filters.service))
      }
    }

    return businesses
  },
})

// Search knowledge base
export const searchKnowledgeBase = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for the query
    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: args.query,
    })

    // Search for knowledge base articles using vector search
    const articles = await ctx.runQuery(internal.embeddings.searchKnowledgeEmbeddings, {
      embedding,
      filters: args.filters,
      limit: args.limit || 5,
    })

    return articles
  },
})

// Get vehicle-specific recommendations
export const getVehicleRecommendations = action({
  args: {
    vehicleId: v.id("vehicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get vehicle details
    const vehicle = await ctx.runQuery(async (ctx) => {
      return await ctx.db.get(args.vehicleId)
    })

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Generate embedding for the vehicle
    const vehicleText = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.color || ""}`
    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: vehicleText,
    })

    // Search for vehicle-specific recommendations
    const recommendations = await ctx.runQuery(internal.embeddings.searchVehicleRecommendations, {
      embedding,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      limit: args.limit || 5,
    })

    return recommendations
  },
})

// Get service recommendations based on vehicle
export const getServiceRecommendations = action({
  args: {
    vehicleId: v.id("vehicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get vehicle details
    const vehicle = await ctx.runQuery(async (ctx) => {
      return await ctx.db.get(args.vehicleId)
    })

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Get vehicle condition assessments
    const assessments = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("conditionAssessments")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
        .order("desc")
        .first()
    })

    // Generate embedding for the vehicle with condition info
    let vehicleText = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.color || ""}`

    if (assessments) {
      vehicleText += ` with overall condition score ${assessments.overallScore}, exterior score ${assessments.exteriorScore}, interior score ${assessments.interiorScore}`

      if (assessments.aiAnalysisResults?.detectedIssues) {
        vehicleText += `. Issues: ${assessments.aiAnalysisResults.detectedIssues.join(", ")}`
      }
    }

    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: vehicleText,
    })

    // Search for service recommendations
    const services = await ctx.runQuery(internal.embeddings.searchServiceRecommendations, {
      embedding,
      vehicleType: getVehicleType(vehicle),
      limit: args.limit || 5,
    })

    return services
  },
})

// Helper function to determine vehicle type
function getVehicleType(vehicle: any): string {
  const make = vehicle.make.toLowerCase()
  const model = vehicle.model.toLowerCase()

  // Luxury brands
  const luxuryBrands = ["mercedes", "bmw", "audi", "lexus", "porsche", "bentley", "rolls-royce", "maserati"]
  if (luxuryBrands.some((brand) => make.includes(brand))) {
    return "luxury"
  }

  // Exotic brands
  const exoticBrands = ["ferrari", "lamborghini", "bugatti", "mclaren", "aston martin"]
  if (exoticBrands.some((brand) => make.includes(brand))) {
    return "exotic"
  }

  // SUVs
  const suvKeywords = ["suv", "crossover", "explorer", "tahoe", "suburban", "expedition", "highlander", "pilot"]
  if (suvKeywords.some((keyword) => model.includes(keyword))) {
    return "suv"
  }

  // Trucks
  const truckKeywords = ["truck", "pickup", "silverado", "f-150", "ram", "tundra", "sierra", "ranger"]
  if (truckKeywords.some((keyword) => model.includes(keyword))) {
    return "truck"
  }

  // Vans
  const vanKeywords = ["van", "caravan", "sienna", "odyssey", "pacifica", "transit", "express"]
  if (vanKeywords.some((keyword) => model.includes(keyword))) {
    return "van"
  }

  // Default to sedan
  return "sedan"
}
