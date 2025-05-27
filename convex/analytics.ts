import { v } from "convex/values"
import { query, action, mutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { getCurrentTimestamp, formatDate, daysBetween } from "./utils"
import type { Id } from "./_generated/dataModel"

// Get analytics data
export const getAnalyticsData = query({
  args: {
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
    timeframe: v.optional(v.string()), // "month", "quarter", "year", "all"
  },
  handler: async (ctx, args) => {
    // If no specific vehicle or user, return mock data
    if (!args.userId && !args.vehicleId) {
      // Return mock data for demo purposes
      return getMockAnalyticsData()
    }

    // If we have a userId but no vehicleId, get all user's vehicles
    let vehicleIds: Id<"vehicles">[] = []
    if (args.userId && !args.vehicleId) {
      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect()

      vehicleIds = vehicles.map((v) => v._id)
    } else if (args.vehicleId) {
      // If we have a specific vehicleId, use just that one
      vehicleIds = [args.vehicleId as Id<"vehicles">]
    }

    // If we have no vehicles, return mock data
    if (vehicleIds.length === 0) {
      return getMockAnalyticsData()
    }

    // Get detailing frequency data
    const detailingFrequency = await getDetailingFrequencyData(ctx, vehicleIds, args.timeframe)

    // Get condition trends data
    const conditionTrends = await getConditionTrendsData(ctx, vehicleIds, args.timeframe)

    // Get product usage data
    const productUsage = await getProductUsageData(ctx, vehicleIds)

    // Generate predictive insights
    const predictiveInsights = await generatePredictiveInsights(ctx, vehicleIds)

    return {
      detailingFrequency,
      conditionTrends,
      productUsage,
      predictiveInsights,
    }
  },
})

// Helper function to get mock analytics data
function getMockAnalyticsData() {
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
        insight: "Interior cleaning frequency should increase during summer months due to higher dust accumulation.",
      },
      {
        insight:
          "Based on your driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
      },
    ],
  }
}

// Helper function to get detailing frequency data
async function getDetailingFrequencyData(ctx: any, vehicleIds: Id<"vehicles">[], timeframe?: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentYear = new Date().getFullYear()

  // Get all detailing records for these vehicles
  let allDetailingRecords = []
  for (const vehicleId of vehicleIds) {
    const records = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
      .collect()

    allDetailingRecords = [...allDetailingRecords, ...records]
  }

  // Filter records based on timeframe
  let filteredRecords = allDetailingRecords
  if (timeframe) {
    const now = new Date()
    let cutoffDate: Date

    switch (timeframe) {
      case "month":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case "quarter":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case "year":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default:
        cutoffDate = new Date(0) // Beginning of time
    }

    filteredRecords = allDetailingRecords.filter((record) => new Date(record.date) >= cutoffDate)
  } else {
    // Default to current year if no timeframe specified
    filteredRecords = allDetailingRecords.filter((record) => {
      const recordYear = new Date(record.date).getFullYear()
      return recordYear === currentYear
    })
  }

  // Count records by month
  const countsByMonth: Record<string, number> = {}
  months.forEach((month) => {
    countsByMonth[month] = 0
  })

  filteredRecords.forEach((record) => {
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
async function getConditionTrendsData(ctx: any, vehicleIds: Id<"vehicles">[], timeframe?: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentYear = new Date().getFullYear()

  // Get all condition assessments for these vehicles
  let allAssessments = []
  for (const vehicleId of vehicleIds) {
    const assessments = await ctx.db
      .query("conditionAssessments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
      .collect()

    allAssessments = [...allAssessments, ...assessments]
  }

  // Filter assessments based on timeframe
  let filteredAssessments = allAssessments
  if (timeframe) {
    const now = new Date()
    let cutoffDate: Date

    switch (timeframe) {
      case "month":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case "quarter":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case "year":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default:
        cutoffDate = new Date(0) // Beginning of time
    }

    filteredAssessments = allAssessments.filter((assessment) => new Date(assessment.date) >= cutoffDate)
  } else {
    // Default to current year if no timeframe specified
    filteredAssessments = allAssessments.filter((assessment) => {
      const assessmentYear = new Date(assessment.date).getFullYear()
      return assessmentYear === currentYear
    })
  }

  // Get average score by month
  const scoresByMonth: Record<string, { total: number; count: number }> = {}
  months.forEach((month) => {
    scoresByMonth[month] = { total: 0, count: 0 }
  })

  filteredAssessments.forEach((assessment) => {
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
async function getProductUsageData(ctx: any, vehicleIds: Id<"vehicles">[]) {
  // Get all product usage records for these vehicles
  let allUsageRecords = []
  for (const vehicleId of vehicleIds) {
    const records = await ctx.db
      .query("productUsage")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
      .collect()

    allUsageRecords = [...allUsageRecords, ...records]
  }

  // Get product details for each record
  const productCounts: Record<string, { name: string; count: number }> = {}

  for (const record of allUsageRecords) {
    const product = await ctx.db.get(record.productId)
    if (product) {
      if (!productCounts[record.productId]) {
        productCounts[record.productId] = {
          name: product.name,
          count: 0,
        }
      }
      productCounts[record.productId].count++
    }
  }

  // Format data for chart
  return Object.values(productCounts)
    .map((product) => ({
      product: product.name,
      count: product.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5 products
}

// Helper function to generate predictive insights
async function generatePredictiveInsights(ctx: any, vehicleIds: Id<"vehicles">[]) {
  // For each vehicle, get the latest condition assessment and detailing record
  const vehicleData = []
  for (const vehicleId of vehicleIds) {
    const vehicle = await ctx.db.get(vehicleId)
    if (!vehicle) continue

    const latestAssessment = await ctx.db
      .query("conditionAssessments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
      .order("desc")
      .first()

    const latestDetailingRecord = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
      .order("desc")
      .first()

    vehicleData.push({
      vehicle,
      assessment: latestAssessment,
      detailingRecord: latestDetailingRecord,
    })
  }

  // Generate insights based on the data
  const insights = []

  for (const data of vehicleData) {
    if (data.detailingRecord) {
      const daysSinceLastDetailing = daysBetween(data.detailingRecord.date)

      // Wax application insight
      if (data.detailingRecord.service.toLowerCase().includes("wax") && daysSinceLastDetailing > 60) {
        insights.push({
          insight: `Your ${data.vehicle.make} ${data.vehicle.model} was last waxed ${daysSinceLastDetailing} days ago. We recommend applying a new coat of wax every 2-3 months for optimal protection.`,
        })
      }

      // Interior cleaning insight
      if (daysSinceLastDetailing > 30 && !data.detailingRecord.service.toLowerCase().includes("interior")) {
        insights.push({
          insight: `It's been over a month since your ${data.vehicle.make} ${data.vehicle.model} had an interior cleaning. Regular interior maintenance prevents dust buildup and keeps surfaces in good condition.`,
        })
      }
    }

    // Condition-based insights
    if (data.assessment) {
      if (data.assessment.exteriorScore < 70) {
        insights.push({
          insight: `Your ${data.vehicle.make} ${data.vehicle.model}'s exterior score is ${data.assessment.exteriorScore}/100. Consider a full exterior detailing to restore its appearance and protection.`,
        })
      }

      if (data.assessment.interiorScore < 70) {
        insights.push({
          insight: `Your ${data.vehicle.make} ${data.vehicle.model}'s interior score is ${data.assessment.interiorScore}/100. A deep interior cleaning would significantly improve the cabin condition.`,
        })
      }
    }
  }

  // If we don't have enough insights, add some generic ones
  if (insights.length < 3) {
    insights.push({
      insight:
        "Regular waxing every 3 months helps protect your paint from environmental damage and maintains a glossy finish.",
    })

    insights.push({
      insight: "Interior cleaning frequency should increase during summer months due to higher dust accumulation.",
    })

    insights.push({
      insight:
        "Based on typical driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
    })
  }

  return insights.slice(0, 5) // Return top 5 insights
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
      date: formatDate(assessment.date),
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
    // Try to find similar vehicles in our database
    const similarVehicles = await ctx.db
      .query("vehicles")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("make"), args.make),
            q.eq(q.field("model"), args.model),
            q.neq(q.field("year"), args.year),
          ),
          q.and(q.eq(q.field("make"), args.make), q.neq(q.field("model"), args.model)),
          q.and(q.neq(q.field("make"), args.make), q.eq(q.field("model"), args.model)),
        ),
      )
      .take(10)

    // If we found similar vehicles, get their data
    if (similarVehicles.length > 0) {
      const results = []

      for (const vehicle of similarVehicles) {
        // Get average condition score
        const assessments = await ctx.db
          .query("conditionAssessments")
          .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
          .collect()

        const averageScore =
          assessments.length > 0
            ? Math.round(assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length)
            : 80

        // Get common issues
        const commonIssues = await getCommonIssues(ctx, vehicle._id)

        // Get recommended products
        const recommendedProducts = await getRecommendedProducts(ctx, vehicle.make, vehicle.model, vehicle.year)

        results.push({
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          averageScore,
          commonIssues,
          recommendedProducts,
        })
      }

      return results
    }

    // If we don't have enough data, return mock data
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

// Helper function to get common issues for a vehicle
async function getCommonIssues(ctx: any, vehicleId: Id<"vehicles">) {
  // Get condition assessments with notes
  const assessments = await ctx.db
    .query("conditionAssessments")
    .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
    .filter((q) => q.neq(q.field("notes"), null))
    .collect()

  if (assessments.length > 0) {
    // Extract issues from notes (simplified implementation)
    const allIssues = assessments
      .map((a) => a.notes || "")
      .join(" ")
      .toLowerCase()
      .split(".")
      .filter(
        (s) =>
          s.includes("issue") ||
          s.includes("problem") ||
          s.includes("damage") ||
          s.includes("wear") ||
          s.includes("scratch") ||
          s.includes("stain"),
      )

    // Return unique issues
    return [...new Set(allIssues)]
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3)
  }

  // Default issues if none found
  return ["Paint swirls", "Interior wear", "Wheel corrosion"]
}

// Helper function to get recommended products
async function getRecommendedProducts(ctx: any, make: string, model: string, year: number) {
  // Search for products recommended for this vehicle
  const products = await ctx.db
    .query("products")
    .filter(
      (q) => q.includes(q.field("recommendedFor"), `${make}`) || q.includes(q.field("recommendedFor"), `${model}`),
    )
    .take(5)

  if (products.length > 0) {
    return products.map((p) => p.name)
  }

  // Default products if none found
  return ["Ceramic coating", "Leather conditioner", "Wheel cleaner"]
}

// Get trending detailing techniques
export const getTrendingTechniques = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Search knowledge base for trending techniques
    try {
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
    } catch (error) {
      console.error("Failed to search knowledge base:", error)

      // Return mock data if search fails
      return [
        {
          title: "Ceramic Coating Application",
          description:
            "Long-lasting protection that repels water, dirt, and contaminants while providing a high-gloss finish.",
          popularity: 95,
          tags: ["exterior", "protection", "advanced"],
        },
        {
          title: "Rinseless Wash Technique",
          description:
            "Water-saving method that uses special polymers to encapsulate dirt for safe removal without traditional rinsing.",
          popularity: 88,
          tags: ["exterior", "eco-friendly", "intermediate"],
        },
        {
          title: "Paint Correction with Dual Action Polisher",
          description: "Removes swirls, scratches and oxidation using a DA polisher with varying pads and compounds.",
          popularity: 82,
          tags: ["exterior", "correction", "advanced"],
        },
        {
          title: "Steam Cleaning Interior",
          description:
            "Uses high-temperature steam to sanitize and deep clean interior surfaces without harsh chemicals.",
          popularity: 79,
          tags: ["interior", "cleaning", "intermediate"],
        },
        {
          title: "Two Bucket Wash Method",
          description:
            "Prevents swirl marks by using separate buckets for clean soap solution and rinsing the wash mitt.",
          popularity: 75,
          tags: ["exterior", "washing", "beginner"],
        },
      ]
    }
  },
})

// Get user query analytics
export const getUserQueryAnalytics = action({
  args: {
    timeframe: v.optional(v.string()), // "day", "week", "month", "year"
  },
  handler: async (ctx, args) => {
    // Try to get real query data
    try {
      const userQueries = await ctx.db.query("userQueries").collect()

      if (userQueries.length > 0) {
        // Filter by timeframe
        let filteredQueries = userQueries
        if (args.timeframe) {
          const now = new Date()
          let cutoffDate: Date

          switch (args.timeframe) {
            case "day":
              cutoffDate = new Date(now.setDate(now.getDate() - 1))
              break
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

          filteredQueries = userQueries.filter((q) => new Date(q.timestamp) >= cutoffDate)
        }

        // Count query occurrences
        const queryCounts: Record<string, number> = {}
        for (const query of filteredQueries) {
          if (!queryCounts[query.query]) {
            queryCounts[query.query] = 0
          }
          queryCounts[query.query]++
        }

        // Sort and format top queries
        const topQueries = Object.entries(queryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([query, count]) => ({ query, count }))

        // Calculate average response quality
        const qualityRatings = filteredQueries
          .filter((q) => q.responseQuality !== undefined)
          .map((q) => q.responseQuality!)

        const averageQuality =
          qualityRatings.length > 0
            ? Math.round((qualityRatings.reduce((sum, q) => sum + q, 0) / qualityRatings.length) * 10) / 10
            : 4.2

        // Categorize queries (simplified implementation)
        const categories = {
          "Product Recommendations": 0,
          "Technique Questions": 0,
          "Problem Solving": 0,
          "Maintenance Schedule": 0,
        }

        for (const query of filteredQueries) {
          const q = query.query.toLowerCase()
          if (q.includes("product") || q.includes("recommend") || q.includes("best")) {
            categories["Product Recommendations"]++
          } else if (q.includes("how to") || q.includes("technique") || q.includes("method")) {
            categories["Technique Questions"]++
          } else if (q.includes("problem") || q.includes("issue") || q.includes("fix") || q.includes("remove")) {
            categories["Problem Solving"]++
          } else if (q.includes("schedule") || q.includes("when") || q.includes("often") || q.includes("frequency")) {
            categories["Maintenance Schedule"]++
          } else {
            // Default to technique questions if we can't categorize
            categories["Technique Questions"]++
          }
        }

        // Calculate percentages
        const total = Object.values(categories).reduce((sum, count) => sum + count, 0)
        const queryCategories = Object.entries(categories).map(([category, count]) => ({
          category,
          percentage: total > 0 ? Math.round((count / total) * 100) : 25,
        }))

        return {
          topQueries,
          queryCategories,
          averageResponseQuality: averageQuality,
          responseTimeAverage: "1.2 seconds", // This would need actual timing data
        }
      }
    } catch (error) {
      console.error("Failed to get query analytics:", error)
    }

    // Return mock data if we don't have enough real data
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

// Save analytics event
export const saveAnalyticsEvent = mutation({
  args: {
    userId: v.optional(v.string()),
    eventType: v.string(), // "page_view", "feature_use", "error", etc.
    page: v.optional(v.string()),
    feature: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Create analytics events table if it doesn't exist in the schema
    try {
      const eventId = await ctx.db.insert("analyticsEvents", {
        userId: args.userId,
        eventType: args.eventType,
        page: args.page,
        feature: args.feature,
        errorMessage: args.errorMessage,
        metadata: args.metadata,
        timestamp: getCurrentTimestamp(),
      })

      return { eventId }
    } catch (error) {
      console.error("Failed to save analytics event:", error)
      // This might fail if the table doesn't exist, which is fine for now
      return { success: false }
    }
  },
})

// Get user activity summary
export const getUserActivitySummary = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    // Get detailing records for all vehicles
    let allDetailingRecords = []
    for (const vehicle of vehicles) {
      const records = await ctx.db
        .query("detailingRecords")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
        .collect()

      allDetailingRecords = [...allDetailingRecords, ...records]
    }

    // Get user queries
    const userQueries = await ctx.db
      .query("userQueries")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()

    // Calculate activity metrics
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const recentDetailings = allDetailingRecords.filter((record) => new Date(record.date) >= lastMonth).length

    const recentQueries = userQueries.filter((query) => new Date(query.timestamp) >= lastMonth).length

    // Get average vehicle condition
    let averageCondition = 0
    if (vehicles.length > 0) {
      let totalScore = 0
      for (const vehicle of vehicles) {
        const latestAssessment = await ctx.db
          .query("conditionAssessments")
          .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
          .order("desc")
          .first()

        totalScore += latestAssessment?.overallScore || vehicle.detailingScore || 75
      }
      averageCondition = Math.round(totalScore / vehicles.length)
    }

    // Calculate days since last detailing
    let daysSinceLastDetailing = null
    if (allDetailingRecords.length > 0) {
      const sortedRecords = [...allDetailingRecords].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )

      daysSinceLastDetailing = daysBetween(sortedRecords[0].date)
    }

    return {
      vehicleCount: vehicles.length,
      totalDetailings: allDetailingRecords.length,
      recentDetailings,
      totalQueries: userQueries.length,
      recentQueries,
      averageCondition,
      daysSinceLastDetailing,
      lastActive:
        userQueries.length > 0
          ? formatDate(userQueries[0].timestamp)
          : allDetailingRecords.length > 0
            ? formatDate(allDetailingRecords[0].date)
            : null,
    }
  },
})
