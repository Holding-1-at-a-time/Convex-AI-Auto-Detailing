import { v } from "convex/values"
import { query, action } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

// Get analytics data
export const getAnalyticsData = query({
  args: {
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId && !args.vehicleId) {
      // Return mock data for demo purposes
      return {
        detailingFrequency: [
          { month: "Jan", count: 2 },
          { month: "Feb", count: 3 },
          { month: "Mar", count: 1 },
          { month: "Apr", count: 4 },
          { month: "May", count: 2 },
          { month: "Jun", count: 3 },
          { month: "Jul", count: 5 },
          { month: "Aug", count: 2 },
          { month: "Sep", count: 3 },
          { month: "Oct", count: 4 },
          { month: "Nov", count: 2 },
          { month: "Dec", count: 3 },
        ],
        conditionTrends: [
          { month: "Jan", score: 75 },
          { month: "Feb", score: 78 },
          { month: "Mar", score: 72 },
          { month: "Apr", score: 80 },
          { month: "May", score: 85 },
          { month: "Jun", score: 82 },
          { month: "Jul", score: 88 },
          { month: "Aug", score: 85 },
          { month: "Sep", score: 82 },
          { month: "Oct", score: 86 },
          { month: "Nov", score: 90 },
          { month: "Dec", score: 85 },
        ],
        productUsage: [
          { product: "Wax", count: 12 },
          { product: "Interior Cleaner", count: 18 },
          { product: "Wheel Cleaner", count: 8 },
          { product: "Glass Cleaner", count: 15 },
          { product: "Leather Conditioner", count: 6 },
        ],
        predictiveInsights: [
          {
            insight:
              "Wax application will be needed in approximately 2 weeks based on current weather patterns and last application date.",
          },
          {
            insight:
              "Interior cleaning frequency should increase during summer months due to higher dust accumulation.",
          },
          {
            insight:
              "Based on your driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
          },
        ],
      }
    }

    // Get the vehicle ID if only userId is provided
    let vehicleId = args.vehicleId
    if (!vehicleId && args.userId) {
      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(1)

      if (vehicles.length > 0) {
        vehicleId = vehicles[0]._id
      } else {
        throw new Error("No vehicles found for this user")
      }
    }

    // Get detailing frequency data
    const detailingFrequency = await getDetailingFrequencyData(ctx, vehicleId as Id<"vehicles">)

    // Get condition trends data
    const conditionTrends = await getConditionTrendsData(ctx, vehicleId as Id<"vehicles">)

    // Get product usage data
    const productUsage = await getProductUsageData(ctx, vehicleId as Id<"vehicles">)

    // Generate predictive insights
    const predictiveInsights = await ctx.runAction(internal.ml.predictMaintenanceNeeds, {
      vehicleId,
    })

    return {
      detailingFrequency,
      conditionTrends,
      productUsage,
      predictiveInsights,
    }
  },
})

// Helper function to get detailing frequency data
async function getDetailingFrequencyData(ctx: any, vehicleId: Id<"vehicles">) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentYear = new Date().getFullYear()

  // Get all detailing records for this vehicle from the current year
  const detailingRecords = await ctx.db
    .query("detailingRecords")
    .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
    .collect()

  // Filter records from the current year
  const currentYearRecords = detailingRecords.filter((record) => {
    const recordYear = new Date(record.date).getFullYear()
    return recordYear === currentYear
  })

  // Count records by month
  const countsByMonth: Record<string, number> = {}
  months.forEach((month) => {
    countsByMonth[month] = 0
  })

  currentYearRecords.forEach((record) => {
    const recordMonth = months[new Date(record.date).getMonth()]
    countsByMonth[recordMonth]++
  })

  // Format data for chart
  return months.map((month) => ({
    month,
    count: countsByMonth[month],
  }))
}

// Helper function to get condition trends data
async function getConditionTrendsData(ctx: any, vehicleId: Id<"vehicles">) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentYear = new Date().getFullYear()

  // Get all condition assessments for this vehicle from the current year
  const assessments = await ctx.db
    .query("conditionAssessments")
    .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
    .collect()

  // Filter assessments from the current year
  const currentYearAssessments = assessments.filter((assessment) => {
    const assessmentYear = new Date(assessment.date).getFullYear()
    return assessmentYear === currentYear
  })

  // Get average score by month
  const scoresByMonth: Record<string, { total: number; count: number }> = {}
  months.forEach((month) => {
    scoresByMonth[month] = { total: 0, count: 0 }
  })

  currentYearAssessments.forEach((assessment) => {
    const assessmentMonth = months[new Date(assessment.date).getMonth()]
    scoresByMonth[assessmentMonth].total += assessment.overallScore
    scoresByMonth[assessmentMonth].count++
  })

  // Format data for chart, using default score of 75 for months with no data
  return months.map((month) => ({
    month,
    score: scoresByMonth[month].count > 0 ? Math.round(scoresByMonth[month].total / scoresByMonth[month].count) : 75,
  }))
}

// Helper function to get product usage data
async function getProductUsageData(ctx: any, vehicleId: Id<"vehicles">) {
  // Get all product usage records for this vehicle
  const usageRecords = await ctx.db
    .query("productUsage")
    .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
    .collect()

  // Get product details for each record
  const productIds = [...new Set(usageRecords.map((record) => record.productId))]
  const products: Record<string, { name: string; count: number }> = {}

  for (const productId of productIds) {
    const product = await ctx.db.get(productId)
    if (product) {
      products[productId] = {
        name: product.name,
        count: usageRecords.filter((record) => record.productId === productId).length,
      }
    }
  }

  // Format data for chart
  return Object.values(products)
    .map((product) => ({
      product: product.name,
      count: product.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5 products
}

// Get vehicle condition history
export const getVehicleConditionHistory = query({
  args: {
    vehicleId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("conditionAssessments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId as Id<"vehicles">))
      .order("desc")
      .collect()

    return assessments.map((assessment) => ({
      date: assessment.date,
      overallScore: assessment.overallScore,
      exteriorScore: assessment.exteriorScore,
      interiorScore: assessment.interiorScore,
    }))
  },
})

// Get similar vehicles for comparison
export const getSimilarVehicles = action({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // In a production system, this would use vector search to find similar vehicles
    // For now, we'll return mock data
    return [
      {
        make: args.make,
        model: args.model,
        year: args.year - 1,
        averageScore: 82,
        commonIssues: ["Paint swirls", "Interior wear", "Wheel corrosion"],
        recommendedProducts: ["Ceramic coating", "Leather conditioner", "Wheel cleaner"],
      },
      {
        make: args.make,
        model: args.model,
        year: args.year + 1,
        averageScore: 88,
        commonIssues: ["Water spots", "Dashboard fading", "Brake dust"],
        recommendedProducts: ["Water spot remover", "UV protectant", "Wheel cleaner"],
      },
      {
        make: args.make === "Toyota" ? "Honda" : "Toyota",
        model: args.make === "Toyota" ? "Accord" : "Camry",
        year: args.year,
        averageScore: 85,
        commonIssues: ["Light scratches", "Fabric stains", "Tire sidewall fading"],
        recommendedProducts: ["Scratch remover", "Fabric cleaner", "Tire dressing"],
      },
    ]
  },
})

// Get trending detailing techniques
export const getTrendingTechniques = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Search knowledge base for trending techniques
    const searchResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
      query: "trending popular detailing techniques",
      category: "technique",
      limit: args.limit || 5,
    })

    return searchResults.map((result) => ({
      title: result.title,
      description: result.content,
      popularity: Math.round(result.relevanceScore * 100),
      tags: result.tags,
    }))
  },
})

// Get user query analytics
export const getUserQueryAnalytics = action({
  args: {
    timeframe: v.optional(v.string()), // "day", "week", "month", "year"
  },
  handler: async (ctx, args) => {
    // In a production system, this would analyze user queries using vector search
    // For now, we'll return mock data
    return {
      topQueries: [
        { query: "How to remove water spots", count: 42 },
        { query: "Best wax for black cars", count: 38 },
        { query: "How to clean leather seats", count: 35 },
        { query: "Ceramic coating vs wax", count: 31 },
        { query: "How to remove scratches", count: 28 },
      ],
      queryCategories: [
        { category: "Product Recommendations", percentage: 35 },
        { category: "Technique Questions", percentage: 30 },
        { category: "Problem Solving", percentage: 25 },
        { category: "Maintenance Schedule", percentage: 10 },
      ],
      averageResponseQuality: 4.2, // Out of 5
      responseTimeAverage: "1.2 seconds",
    }
  },
})
