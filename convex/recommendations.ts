import { v } from "convex/values"
import { query, action } from "./_generated/server"
import { internal } from "./_generated/api"

// Get recommended services for a customer
export const getRecommendedServices = query({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5

    // Get customer's vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.customerId))
      .collect()

    // Get customer's appointment history
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect()

    // Get all active services
    const allServices = await ctx.db
      .query("servicePackages")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect()

    // Create a frequency map of services used
    const serviceFrequency: Record<string, number> = {}
    appointments.forEach((appointment) => {
      serviceFrequency[appointment.serviceType] = (serviceFrequency[appointment.serviceType] || 0) + 1
    })

    // Score services based on various factors
    const scoredServices = allServices.map((service) => {
      let score = 0

      // Base popularity score
      if (service.popularityRank) {
        score += (10 - service.popularityRank) * 10
      }

      // Previous usage score
      const usageCount = serviceFrequency[service.name] || 0
      if (usageCount > 0) {
        score += usageCount * 5
      }

      // Vehicle type compatibility score
      if (vehicles.length > 0) {
        // Check if service is suitable for customer's vehicles
        const hasLuxuryVehicle = vehicles.some(
          (v) =>
            v.make.toLowerCase().includes("mercedes") ||
            v.make.toLowerCase().includes("bmw") ||
            v.make.toLowerCase().includes("audi") ||
            v.make.toLowerCase().includes("lexus"),
        )

        if (hasLuxuryVehicle && service.category === "premium") {
          score += 20
        }
      }

      // Time since last service score (recommend services not used recently)
      const lastUsed = appointments
        .filter((a) => a.serviceType === service.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

      if (lastUsed) {
        const daysSinceLastUse = Math.floor((Date.now() - new Date(lastUsed.date).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceLastUse > 30) {
          score += Math.min(daysSinceLastUse / 10, 20)
        }
      } else {
        // Never used this service
        score += 15
      }

      // Category diversity score
      const categoriesUsed = new Set(
        appointments.map((a) => {
          const service = allServices.find((s) => s.name === a.serviceType)
          return service?.category
        }),
      )

      if (!categoriesUsed.has(service.category)) {
        score += 10
      }

      return {
        ...service,
        score,
        lastUsed: lastUsed?.date,
      }
    })

    // Sort by score and return top recommendations
    const recommendations = scoredServices
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, lastUsed, ...service }) => service)

    return recommendations
  },
})

// Generate personalized recommendations using ML
export const generatePersonalizedRecommendations = action({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get customer data
    const customer = await ctx.runQuery(internal.customers.getCustomer, {
      customerId: args.customerId,
    })

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Get customer's vehicles
    const vehicles = customer.vehicles || []

    // Get customer's appointment history
    const appointments = customer.recentAppointments || []

    // Generate recommendation prompt
    const prompt = `Based on the following customer data, recommend 3 auto detailing services:

Customer: ${customer.name}
Vehicles: ${vehicles.map((v) => `${v.year} ${v.make} ${v.model}`).join(", ")}
Previous Services: ${appointments.map((a) => a.serviceType).join(", ")}
Total Spent: $${customer.loyalty?.points || 0}

Recommend services that would benefit their vehicles and haven't been used recently.`

    // Here you would integrate with an AI service to generate recommendations
    // For now, we'll use the rule-based system
    const recommendations = await ctx.runQuery(internal.recommendations.getRecommendedServices, {
      customerId: args.customerId,
      limit: 3,
    })

    return recommendations
  },
})

// Track service recommendation interactions
export const trackRecommendationInteraction = action({
  args: {
    customerId: v.string(),
    serviceId: v.id("servicePackages"),
    interactionType: v.string(), // "view", "click", "book"
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("recommendationInteractions", {
      customerId: args.customerId,
      serviceId: args.serviceId,
      interactionType: args.interactionType,
      timestamp: new Date().toISOString(),
    })
  },
})
