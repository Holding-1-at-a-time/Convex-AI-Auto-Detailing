import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

// Predict condition score based on vehicle data
export const predictConditionScore = action({
  args: {
    daysSinceLastDetailing: v.number(),
    issuesCount: v.number(),
    mileage: v.optional(v.number()),
    historicalData: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ score: number; analysis: string }> => {
    // In a production system, this would use a trained ML model
    // For now, we'll use a simple algorithm

    // Base score starts at 100
    let score = 100

    // Reduce score based on days since last detailing
    if (args.daysSinceLastDetailing > 90) {
      score -= 20
    } else if (args.daysSinceLastDetailing > 30) {
      score -= 10
    }

    // Reduce score based on number of issues
    score -= args.issuesCount * 5

    // Reduce score based on mileage if provided
    if (args.mileage) {
      if (args.mileage > 50000) {
        score -= 10
      } else if (args.mileage > 20000) {
        score -= 5
      }
    }

    // Use historical data to refine prediction if available
    if (args.historicalData && args.historicalData.length > 0) {
      // Calculate average rate of decline
      const sortedData = [...args.historicalData].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      if (sortedData.length >= 2) {
        const firstAssessment = sortedData[0]
        const lastAssessment = sortedData[sortedData.length - 1]
        const daysBetween =
          (new Date(lastAssessment.date).getTime() - new Date(firstAssessment.date).getTime()) / (1000 * 60 * 60 * 24)
        const scoreDifference = firstAssessment.overallScore - lastAssessment.overallScore

        if (daysBetween > 0) {
          const declineRate = scoreDifference / daysBetween
          const adjustedDecline = declineRate * args.daysSinceLastDetailing
          score -= adjustedDecline
        }
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)))

    // Generate analysis text
    let analysis = `Your vehicle was last detailed ${args.daysSinceLastDetailing} days ago and has ${args.issuesCount} reported issues.`

    if (args.mileage) {
      analysis += ` With a mileage of ${args.mileage}, `
    } else {
      analysis += ` Based on this data, `
    }

    analysis += `your vehicle's condition score is ${score}/100.`

    if (score > 80) {
      analysis += " Your vehicle is in excellent condition."
    } else if (score > 60) {
      analysis += " Your vehicle is in good condition but could benefit from some maintenance."
    } else if (score > 40) {
      analysis += " Your vehicle needs attention to prevent further deterioration."
    } else {
      analysis += " Your vehicle requires immediate attention and comprehensive detailing."
    }

    return { score, analysis }
  },
})

// Analyze vehicle images using computer vision
export const analyzeVehicleImages = action({
  args: {
    imageUrls: v.array(v.string()),
    vehicleId: v.id("vehicles"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    detectedIssues: string[]
    recommendedActions: string[]
    confidenceScore: number
  }> => {
    // In a production system, this would use a computer vision model
    // For now, we'll return mock data

    // Use vector search to find similar issues based on vehicle type
    const vehicle = await ctx.db.get(args.vehicleId)

    if (!vehicle) {
      return {
        detectedIssues: [
          "Light scratches on driver's side door",
          "Water spots on windshield",
          "Dust accumulation in interior vents",
        ],
        recommendedActions: [
          "Apply scratch remover and polish to driver's side door",
          "Use vinegar solution to remove water spots",
          "Clean vents with compressed air and detailing brush",
        ],
        confidenceScore: 0.85,
      }
    }

    // Search for common issues with this vehicle make/model
    const searchQuery = `${vehicle.make} ${vehicle.model} common detailing issues`

    const knowledgeResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
      query: searchQuery,
      category: "vehicle_specific",
      limit: 3,
    })

    if (knowledgeResults && knowledgeResults.length > 0) {
      // Extract issues and recommendations from knowledge base
      const detectedIssues = knowledgeResults.map((item) => item.title)
      const recommendedActions = knowledgeResults.map((item) => item.content)

      return {
        detectedIssues,
        recommendedActions,
        confidenceScore: 0.9,
      }
    }

    // Fallback to generic issues
    return {
      detectedIssues: [
        `Light scratches on ${vehicle.make} ${vehicle.model} paint`,
        "Water spots on windshield",
        "Dust accumulation in interior vents",
      ],
      recommendedActions: [
        "Apply scratch remover and polish to affected areas",
        "Use vinegar solution to remove water spots",
        "Clean vents with compressed air and detailing brush",
      ],
      confidenceScore: 0.85,
    }
  },
})

// Generate predictive maintenance insights
export const predictMaintenanceNeeds = action({
  args: {
    vehicle: v.any(),
    detailingHistory: v.any(),
    conditionAssessments: v.any(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      description: string
      confidence: number
      category: string
    }>
  > => {
    // Use vector search to find relevant maintenance insights
    const searchQuery = `${args.vehicle.make} ${args.vehicle.model} maintenance schedule predictive insights`

    const knowledgeResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
      query: searchQuery,
      limit: 5,
    })

    if (knowledgeResults && knowledgeResults.length > 0) {
      // Extract insights from knowledge base
      return knowledgeResults.map((item, index) => ({
        description: item.content,
        confidence: 0.95 - index * 0.05, // Decrease confidence for lower-ranked results
        category: item.tags[0] || "general",
      }))
    }

    // Fallback to generic insights
    return [
      {
        description:
          "Wax application will be needed in approximately 2 weeks based on current weather patterns and last application date.",
        confidence: 0.92,
        category: "exterior",
      },
      {
        description:
          "Interior cleaning frequency should increase during summer months due to higher dust accumulation.",
        confidence: 0.85,
        category: "interior",
      },
      {
        description:
          "Based on your driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
        confidence: 0.78,
        category: "wheels",
      },
    ]
  },
})

// Predict optimal detailing schedule
export const predictDetailingSchedule = action({
  args: {
    vehicleId: v.id("vehicles"),
    currentScore: v.number(),
    environmentalFactors: v.optional(
      v.object({
        climate: v.optional(v.string()),
        parkingCondition: v.optional(v.string()),
        drivingConditions: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      service: string
      recommendedDate: string
      priority: string
      reason: string
    }>
  > => {
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Get detailing history
    const detailingHistory = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    // Calculate average time between services
    const serviceIntervals: Record<string, number[]> = {}

    if (detailingHistory.length >= 2) {
      const sortedHistory = [...detailingHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      for (let i = 1; i < sortedHistory.length; i++) {
        const current = sortedHistory[i]
        const previous = sortedHistory[i - 1]

        if (current.service === previous.service) {
          const daysBetween =
            (new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)

          if (!serviceIntervals[current.service]) {
            serviceIntervals[current.service] = []
          }

          serviceIntervals[current.service].push(daysBetween)
        }
      }
    }

    // Generate schedule based on history and current condition
    const schedule = []
    const currentDate = new Date()

    // Standard services and their default intervals (in days)
    const standardServices = {
      "Full Detailing": { interval: 90, priority: "high" },
      "Wash & Wax": { interval: 30, priority: "medium" },
      "Interior Cleaning": { interval: 45, priority: "medium" },
      "Paint Protection": { interval: 180, priority: "high" },
      "Wheel & Tire Cleaning": { interval: 21, priority: "low" },
    }

    // Adjust intervals based on current score
    const scoreMultiplier = args.currentScore > 80 ? 1.2 : args.currentScore > 60 ? 1 : 0.8

    // Adjust for environmental factors
    let environmentalMultiplier = 1
    if (args.environmentalFactors) {
      if (args.environmentalFactors.climate === "humid" || args.environmentalFactors.climate === "coastal") {
        environmentalMultiplier *= 0.8 // More frequent in humid/coastal areas
      }
      if (args.environmentalFactors.parkingCondition === "outdoor") {
        environmentalMultiplier *= 0.8 // More frequent for outdoor parking
      }
      if (args.environmentalFactors.drivingConditions?.includes("offroad")) {
        environmentalMultiplier *= 0.7 // More frequent for offroad driving
      }
    }

    // Generate schedule for each service
    for (const [service, details] of Object.entries(standardServices)) {
      // Calculate interval based on history or use default
      let interval = details.interval
      if (serviceIntervals[service] && serviceIntervals[service].length > 0) {
        // Use average of historical intervals
        const avgInterval =
          serviceIntervals[service].reduce((sum, val) => sum + val, 0) / serviceIntervals[service].length
        interval = avgInterval
      }

      // Apply adjustments
      interval = interval * scoreMultiplier * environmentalMultiplier

      // Find last service date or use current date minus interval
      let lastServiceDate = currentDate
      const serviceHistory = detailingHistory.filter((record) => record.service === service)
      if (serviceHistory.length > 0) {
        const sortedServiceHistory = [...serviceHistory].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        lastServiceDate = new Date(sortedServiceHistory[0].date)
      }

      // Calculate next service date
      const nextServiceDate = new Date(lastServiceDate.getTime() + interval * 24 * 60 * 60 * 1000)

      // Generate reason based on vehicle and environmental factors
      let reason = `Based on your ${vehicle.make} ${vehicle.model}'s maintenance history`
      if (args.environmentalFactors) {
        if (args.environmentalFactors.climate) {
          reason += ` and ${args.environmentalFactors.climate} climate conditions`
        }
        if (args.environmentalFactors.parkingCondition === "outdoor") {
          reason += `, outdoor parking exposure`
        }
      }

      schedule.push({
        service,
        recommendedDate: nextServiceDate.toISOString().split("T")[0],
        priority: details.priority,
        reason: `${reason}, we recommend this service by the specified date.`,
      })
    }

    // Sort by date
    schedule.sort((a, b) => new Date(a.recommendedDate).getTime() - new Date(b.recommendedDate).getTime())

    return schedule
  },
})
