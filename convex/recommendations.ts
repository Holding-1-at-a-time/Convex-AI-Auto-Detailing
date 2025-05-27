import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

// Generate detailing recommendations
export const generateRecommendations = action({
  args: {
    vehicleId: v.id("vehicles"),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    lastDetailingDate: v.string(),
    currentScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Calculate days since last detailing
    const lastDetailingDate = new Date(args.lastDetailingDate)
    const currentDate = new Date()
    const daysSinceLastDetailing = Math.floor(
      (currentDate.getTime() - lastDetailingDate.getTime()) / (1000 * 60 * 60 * 24),
    )

    // Use vector search to find relevant recommendations
    const searchQuery = `${args.year} ${args.make} ${args.model} detailing recommendations`

    const vectorRecommendations = await ctx.runAction(internal.embeddings.searchVehicleRecommendations, {
      query: searchQuery,
      make: args.make,
      model: args.model,
      year: args.year,
      limit: 10,
    })

    // Format recommendations with priorities and due dates
    const recommendations = vectorRecommendations.map((rec, index) => {
      // Calculate due date based on priority
      let dueDate
      if (rec.priority === "high") {
        dueDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (rec.priority === "medium") {
        dueDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000)
      } else {
        dueDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      }

      return {
        id: index + 1,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        dueDate: dueDate.toISOString().split("T")[0],
      }
    })

    // If we don't have enough recommendations, add some generic ones
    if (recommendations.length < 3) {
      // Add wax recommendation if needed
      if (daysSinceLastDetailing > 60 || (args.currentScore && args.currentScore < 80)) {
        recommendations.push({
          id: recommendations.length + 1,
          title: "Wax exterior",
          description: "Apply a high-quality carnauba or synthetic wax to protect the paint",
          priority: "high",
          dueDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        })
      }

      // Add interior cleaning recommendation if needed
      if (daysSinceLastDetailing > 30 || (args.currentScore && args.currentScore < 85)) {
        recommendations.push({
          id: recommendations.length + 1,
          title: "Clean interior vents",
          description: "Use compressed air and detailing brushes to remove dust from vents",
          priority: "medium",
          dueDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        })
      }

      // Add cabin air filter recommendation
      recommendations.push({
        id: recommendations.length + 1,
        title: "Replace cabin air filter",
        description: "Improve air quality by replacing the cabin air filter",
        priority: "low",
        dueDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      })
    }

    return recommendations.slice(0, 5) // Return top 5 recommendations
  },
})

// Generate a detailing plan
export const generateDetailingPlan = action({
  args: {
    vehicleType: v.string(),
    currentCondition: v.string(),
    userPreferences: v.array(v.string()),
    timeAvailable: v.number(),
    additionalSteps: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Base steps for all vehicles
    const baseSteps = [
      "Initial rinse (15 minutes)",
      "Apply soap and wash exterior (30 minutes)",
      "Clean wheels and tires (20 minutes)",
      "Rinse and dry exterior (20 minutes)",
      "Clean interior surfaces (45 minutes)",
      "Vacuum interior (20 minutes)",
      "Apply protectants to surfaces (30 minutes)",
    ]

    // Additional steps based on vehicle type
    const vehicleTypeSteps: Record<string, string[]> = {
      SUV: ["Clean roof rails (10 minutes)", "Clean third-row seating (15 minutes)"],
      Truck: ["Clean truck bed (20 minutes)", "Apply bed liner protectant (15 minutes)"],
      Sedan: ["Polish chrome accents (15 minutes)"],
      "Sports Car": ["Detail engine bay (30 minutes)", "Apply tire shine (10 minutes)"],
    }

    // Additional steps based on condition
    const conditionSteps: Record<string, string[]> = {
      poor: ["Clay bar treatment (45 minutes)", "Polish paint (60 minutes)", "Apply paint sealant (30 minutes)"],
      average: ["Spot clay bar treatment (20 minutes)", "Apply paint sealant (30 minutes)"],
      good: ["Apply quick detailer (15 minutes)"],
    }

    // Combine steps based on inputs
    let allSteps = [...baseSteps]

    // Add vehicle type specific steps
    const vehicleTypeLower = args.vehicleType.toLowerCase()
    Object.keys(vehicleTypeSteps).forEach((type) => {
      if (vehicleTypeLower.includes(type.toLowerCase())) {
        allSteps = [...allSteps, ...vehicleTypeSteps[type]]
      }
    })

    // Add condition specific steps
    const conditionLower = args.currentCondition.toLowerCase()
    Object.keys(conditionSteps).forEach((condition) => {
      if (conditionLower.includes(condition.toLowerCase())) {
        allSteps = [...allSteps, ...conditionSteps[condition]]
      }
    })

    // Add steps based on user preferences
    args.userPreferences.forEach((pref) => {
      const prefLower = pref.toLowerCase()
      if (prefLower.includes("leather")) {
        allSteps.push("Apply leather conditioner (15 minutes)")
      }
      if (prefLower.includes("wax")) {
        allSteps.push("Apply carnauba wax (45 minutes)")
      }
      if (prefLower.includes("ceramic")) {
        allSteps.push("Apply ceramic coating (60 minutes)")
      }
      if (prefLower.includes("headlight")) {
        allSteps.push("Restore headlights (30 minutes)")
      }
    })

    // Add additional steps from knowledge base if provided
    if (args.additionalSteps && args.additionalSteps.length > 0) {
      // Filter out duplicate steps
      const existingStepTexts = allSteps.map((step) => step.split("(")[0].trim().toLowerCase())
      const filteredAdditionalSteps = args.additionalSteps.filter((step) => {
        const stepText = step.split("(")[0].trim().toLowerCase()
        return !existingStepTexts.includes(stepText)
      })

      // Add time estimates if not present
      const processedAdditionalSteps = filteredAdditionalSteps.map((step) => {
        if (!step.includes("(")) {
          return `${step} (15 minutes)`
        }
        return step
      })

      allSteps = [...allSteps, ...processedAdditionalSteps]
    }

    // Calculate total time
    let totalTime = 0
    allSteps.forEach((step) => {
      const timeMatch = step.match(/$$(\d+) minutes$$/)
      if (timeMatch && timeMatch[1]) {
        totalTime += Number.parseInt(timeMatch[1])
      }
    })

    // If total time exceeds available time, prioritize steps
    if (totalTime > args.timeAvailable * 60) {
      // Sort steps by importance (base steps first, then condition steps, then preferences)
      const prioritizedSteps = [
        ...baseSteps.slice(0, 4), // Essential exterior steps
        ...(conditionSteps[
          Object.keys(conditionSteps).find((c) => conditionLower.includes(c.toLowerCase())) || "average"
        ] || []),
      ]

      // Add steps until we reach the time limit
      let currentTime = 0
      const finalSteps = []

      for (const step of prioritizedSteps) {
        const timeMatch = step.match(/$$(\d+) minutes$$/)
        if (timeMatch && timeMatch[1]) {
          const stepTime = Number.parseInt(timeMatch[1])
          if (currentTime + stepTime <= args.timeAvailable * 60) {
            finalSteps.push(step)
            currentTime += stepTime
          }
        }
      }

      return { steps: finalSteps }
    }

    return { steps: allSteps }
  },
})

// Get product recommendations based on vehicle and conditions
export const getProductRecommendations = action({
  args: {
    vehicleType: v.string(),
    issues: v.array(v.string()),
    preferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Construct a search query from the issues and preferences
    const searchQuery = `${args.vehicleType} ${args.issues.join(" ")} ${
      args.preferences ? args.preferences.join(" ") : ""
    } product recommendations`

    // Search knowledge base for product recommendations
    const searchResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
      query: searchQuery,
      category: "product",
      limit: 8,
    })

    // Format results as product recommendations
    const recommendations = searchResults.map((result, index) => ({
      id: index + 1,
      name: result.title,
      description: result.content,
      category: result.tags[0] || "general",
      relevanceScore: result.relevanceScore,
    }))

    return recommendations
  },
})
