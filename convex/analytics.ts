import { v } from "convex/values"
import { query } from "./_generated/server"

// Get analytics data
export const getAnalyticsData = query({
  args: {
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query the database and run analytics
    // For now, we'll return mock data
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
  },
})

// Generate predictive insights
export const generatePredictiveInsights = query({
  args: {
    vehicleId: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would use ML models to generate insights
    // For now, we'll return mock data
    return [
      {
        insight:
          "Wax application will be needed in approximately 2 weeks based on current weather patterns and last application date.",
      },
      { insight: "Interior cleaning frequency should increase during summer months due to higher dust accumulation." },
      {
        insight:
          "Based on your driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
      },
    ]
  },
})
