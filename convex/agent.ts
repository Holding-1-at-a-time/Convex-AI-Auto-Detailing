import { v } from "convex/values"
import { action, mutation, query } from "./_generated/server"
import { Agent, createTool } from "@convex-dev/agent"
import { openai } from "@ai-sdk/openai"
import { components } from "./_generated/api"
import { internal } from "./_generated/api"
import { z } from "zod"
import { getCurrentTimestamp, formatDate } from "./utils"

// Create the auto detailing agent with comprehensive configuration
const autoDetailingAgent = new Agent(components.agent, {
  // Use OpenAI's GPT-4o model for chat
  chat: openai.chat("gpt-4o"),

  // Use OpenAI's text-embedding-3-small model for embeddings
  textEmbedding: openai.embedding("text-embedding-3-small"),

  // Detailed instructions for the agent
  instructions: `
    You are an AI-powered auto detailing business assistant. You help business owners and staff with:
    
    1. Providing detailed advice on car cleaning and maintenance techniques
    2. Recommending products and techniques for specific vehicle issues
    3. Creating personalized detailing plans based on vehicle type, condition, and owner preferences
    4. Offering predictive maintenance insights based on vehicle data and usage patterns
    5. Answering questions about auto detailing best practices
    6. Managing appointments and scheduling
    7. Calculating pricing for different detailing packages
    8. Managing customer information and history
    9. Tracking inventory and supplies
    10. Providing business analytics and insights
    11. Suggesting marketing strategies and promotions
    12. Managing staff schedules and training
    13. Checking weather forecasts for planning outdoor detailing
    14. Analyzing competitors and market trends
    
    Be helpful, informative, and provide specific actionable advice. When recommending products,
    explain why they're suitable for the specific situation. When providing business advice,
    consider both short-term operations and long-term growth.
  `,

  // Define tools with proper Convex context
  tools: {
    // EXISTING TOOLS

    // Tool to look up vehicle-specific detailing recommendations using vector search
    vehicleRecommendations: createTool({
      description: "Get detailing recommendations for a specific vehicle make, model, and year",
      args: z.object({
        make: z.string().describe("The make of the vehicle"),
        model: z.string().describe("The model of the vehicle"),
        year: z.number().describe("The year of the vehicle"),
        query: z.optional(z.string()).describe("Optional specific query about the vehicle"),
      }),
      handler: async (ctx, args): Promise<{ recommendations: string[] }> => {
        // Use vector search to find relevant recommendations
        const searchQuery = args.query || `${args.year} ${args.make} ${args.model} detailing recommendations`

        const recommendations = await ctx.runAction(internal.embeddings.searchVehicleRecommendations, {
          query: searchQuery,
          make: args.make,
          model: args.model,
          year: args.year,
          limit: 5,
        })

        // If we have specific recommendations for this vehicle, use them
        if (recommendations && recommendations.length > 0) {
          return {
            recommendations: recommendations.map(
              (rec) => `${rec.title}: ${rec.description} (Priority: ${rec.priority})`,
            ),
          }
        }

        // Fallback to knowledge base search
        const knowledgeResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
          query: searchQuery,
          category: "vehicle_specific",
          limit: 5,
        })

        if (knowledgeResults && knowledgeResults.length > 0) {
          return {
            recommendations: knowledgeResults.map((item) => `${item.title}: ${item.content}`),
          }
        }

        // Fallback to generic recommendations
        return {
          recommendations: [
            `For ${args.year} ${args.make} ${args.model}: Use pH-neutral soap for the paint`,
            `For ${args.year} ${args.make} ${args.model}: Consider ceramic coating for long-term protection`,
            `For ${args.year} ${args.make} ${args.model}: Use dedicated leather cleaner for interior surfaces`,
          ],
        }
      },
    }),

    // Tool to analyze vehicle condition based on uploaded data
    analyzeCondition: createTool({
      description: "Analyze the current condition of a vehicle based on provided data",
      args: z.object({
        lastDetailingDate: z.string().describe("The date of the last detailing"),
        currentIssues: z.array(z.string()).describe("Current issues with the vehicle"),
        mileage: z.number().optional().describe("Current mileage of the vehicle"),
        vehicleId: z.string().optional().describe("ID of the vehicle in the database"),
      }),
      handler: async (ctx, args): Promise<{ score: number; analysis: string }> => {
        // Calculate days since last detailing
        const lastDetailingDate = new Date(args.lastDetailingDate)
        const currentDate = new Date()
        const daysSinceLastDetailing = Math.floor(
          (currentDate.getTime() - lastDetailingDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        // Get historical condition data if vehicleId is provided
        let historicalData = null
        if (args.vehicleId) {
          historicalData = await ctx.runQuery(internal.analytics.getVehicleConditionHistory, {
            vehicleId: args.vehicleId,
          })
        }

        // Use our predictive model to calculate the condition score
        const predictedScore = await ctx.runAction(internal.ml.predictConditionScore, {
          daysSinceLastDetailing,
          issuesCount: args.currentIssues.length,
          mileage: args.mileage,
          historicalData,
        })

        return {
          score: predictedScore.score,
          analysis: predictedScore.analysis,
        }
      },
    }),

    // Tool to generate a detailing plan
    generateDetailingPlan: createTool({
      description: "Generate a personalized detailing plan",
      args: z.object({
        vehicleType: z.string().describe("The type of vehicle"),
        currentCondition: z.string().describe("Current condition of the vehicle"),
        userPreferences: z.array(z.string()).describe("User preferences for detailing"),
        timeAvailable: z.number().describe("Time available for detailing in hours"),
      }),
      handler: async (ctx, args): Promise<{ plan: string[] }> => {
        // Search knowledge base for relevant detailing steps
        const searchQuery = `${args.vehicleType} ${args.currentCondition} detailing plan`

        const knowledgeResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
          query: searchQuery,
          category: "detailing_plan",
          tags: args.userPreferences,
          limit: 10,
        })

        // If we have relevant knowledge, use it to enhance the plan
        if (knowledgeResults && knowledgeResults.length > 0) {
          // Extract steps from knowledge base results
          const knowledgeSteps = knowledgeResults
            .flatMap((item) => item.content.split("\n"))
            .filter((step) => step.trim().length > 0)
            .slice(0, 10)

          // Generate a plan using the knowledge base steps
          const plan = await ctx.runAction(internal.recommendations.generateDetailingPlan, {
            vehicleType: args.vehicleType,
            currentCondition: args.currentCondition,
            userPreferences: args.userPreferences,
            timeAvailable: args.timeAvailable,
            additionalSteps: knowledgeSteps,
          })

          return { plan: plan.steps }
        }

        // Fallback to standard plan generation
        const plan = await ctx.runAction(internal.recommendations.generateDetailingPlan, {
          vehicleType: args.vehicleType,
          currentCondition: args.currentCondition,
          userPreferences: args.userPreferences,
          timeAvailable: args.timeAvailable,
        })

        return { plan: plan.steps }
      },
    }),

    // Tool to search knowledge base
    searchKnowledgeBase: createTool({
      description: "Search the auto detailing knowledge base",
      args: z.object({
        query: z.string().describe("The search query"),
        category: z.optional(z.string()).describe("Optional category to filter by"),
        tags: z.optional(z.array(z.string())).describe("Optional tags to filter by"),
        limit: z.optional(z.number()).describe("Maximum number of results to return"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{ results: Array<{ title: string; content: string; relevanceScore: number }> }> => {
        const searchResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
          query: args.query,
          category: args.category,
          tags: args.tags,
          limit: args.limit || 5,
        })

        return {
          results: searchResults.map((result) => ({
            title: result.title,
            content: result.content,
            relevanceScore: result.relevanceScore,
          })),
        }
      },
    }),

    // Tool to search for auto detailing products
    searchProducts: createTool({
      description: "Search for auto detailing products",
      args: z.object({
        query: z.string().describe("Search query for products"),
        category: z.optional(z.string()).describe("Product category filter"),
        limit: v.optional(z.number()).describe("Maximum number of results to return"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{ products: Array<{ name: string; description: string; category: string }> }> => {
        // Search knowledge base for product information
        const searchResults = await ctx.runAction(internal.embeddings.searchKnowledgeBase, {
          query: args.query,
          category: "product",
          tags: args.category ? [args.category] : undefined,
          limit: args.limit || 5,
        })

        // Format results as products
        const products = searchResults.map((result) => ({
          name: result.title,
          description: result.content,
          category: result.tags[0] || "general",
        }))

        return { products }
      },
    }),

    // NEW BUSINESS TOOLS

    // Tool to manage appointments
    manageAppointments: createTool({
      description: "Manage appointments for auto detailing services",
      args: z.object({
        action: z.enum(["check", "schedule", "reschedule", "cancel"]).describe("The action to perform"),
        date: z.string().describe("The date for the appointment (YYYY-MM-DD)"),
        time: z.optional(z.string()).describe("The time for the appointment (HH:MM)"),
        duration: z.optional(z.number()).describe("The duration of the appointment in hours"),
        customerId: z.optional(z.string()).describe("The ID of the customer"),
        serviceType: z.optional(z.string()).describe("The type of detailing service"),
        appointmentId: z.optional(z.string()).describe("The ID of the appointment (for reschedule/cancel)"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        availableSlots?: { date: string; time: string }[]
        appointment?: any
      }> => {
        try {
          // In a real implementation, this would interact with a scheduling system
          // For now, we'll simulate the behavior

          // Check availability
          if (args.action === "check") {
            // Simulate checking available slots
            const availableSlots = [
              { date: args.date, time: "09:00" },
              { date: args.date, time: "11:00" },
              { date: args.date, time: "14:00" },
              { date: args.date, time: "16:00" },
            ]

            return {
              success: true,
              message: `Available slots found for ${args.date}`,
              availableSlots,
            }
          }

          // Schedule new appointment
          if (args.action === "schedule") {
            if (!args.time || !args.duration || !args.customerId || !args.serviceType) {
              return {
                success: false,
                message: "Missing required information for scheduling",
              }
            }

            // Simulate scheduling an appointment
            const appointmentId = `appt-${Date.now()}`
            const appointment = {
              id: appointmentId,
              date: args.date,
              time: args.time,
              duration: args.duration,
              customerId: args.customerId,
              serviceType: args.serviceType,
              status: "confirmed",
            }

            return {
              success: true,
              message: `Appointment scheduled successfully for ${args.date} at ${args.time}`,
              appointment,
            }
          }

          // Reschedule appointment
          if (args.action === "reschedule") {
            if (!args.appointmentId || !args.time) {
              return {
                success: false,
                message: "Missing appointment ID or new time for rescheduling",
              }
            }

            // Simulate rescheduling
            const appointment = {
              id: args.appointmentId,
              date: args.date,
              time: args.time,
              status: "rescheduled",
            }

            return {
              success: true,
              message: `Appointment ${args.appointmentId} rescheduled to ${args.date} at ${args.time}`,
              appointment,
            }
          }

          // Cancel appointment
          if (args.action === "cancel") {
            if (!args.appointmentId) {
              return {
                success: false,
                message: "Missing appointment ID for cancellation",
              }
            }

            // Simulate cancellation
            return {
              success: true,
              message: `Appointment ${args.appointmentId} has been cancelled`,
            }
          }

          return {
            success: false,
            message: "Invalid action specified",
          }
        } catch (error) {
          console.error("Error managing appointments:", error)
          return {
            success: false,
            message: "An error occurred while managing appointments",
          }
        }
      },
    }),

    // Tool to calculate pricing
    calculatePrice: createTool({
      description: "Calculate pricing for auto detailing services",
      args: z.object({
        vehicleType: z.enum(["sedan", "suv", "truck", "van", "luxury", "exotic"]).describe("The type of vehicle"),
        servicePackage: z.enum(["basic", "standard", "premium", "ultimate"]).describe("The service package"),
        addOns: z.optional(z.array(z.string())).describe("Additional services"),
        vehicleCondition: z
          .optional(z.enum(["excellent", "good", "fair", "poor"]))
          .describe("The condition of the vehicle"),
        isRegularCustomer: z.optional(z.boolean()).describe("Whether the customer is a regular client"),
        promoCode: z.optional(z.string()).describe("Promotional code for discounts"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        basePrice: number
        addOnPrices: { [key: string]: number }
        discounts: { [key: string]: number }
        totalPrice: number
        estimatedDuration: number
        breakdown: string
      }> => {
        // Base pricing by vehicle type and package
        const basePricing = {
          sedan: { basic: 80, standard: 150, premium: 250, ultimate: 350 },
          suv: { basic: 100, standard: 180, premium: 300, ultimate: 400 },
          truck: { basic: 120, standard: 200, premium: 320, ultimate: 450 },
          van: { basic: 120, standard: 200, premium: 320, ultimate: 450 },
          luxury: { basic: 150, standard: 250, premium: 400, ultimate: 600 },
          exotic: { basic: 200, standard: 350, premium: 600, ultimate: 1000 },
        }

        // Add-on pricing
        const addOnPricing = {
          "engine detailing": 75,
          "headlight restoration": 60,
          "paint correction": 200,
          "ceramic coating": 500,
          "leather treatment": 80,
          "odor removal": 60,
          "pet hair removal": 50,
          "stain removal": 40,
        }

        // Calculate base price
        const basePrice = basePricing[args.vehicleType][args.servicePackage]

        // Calculate add-on prices
        const addOnPrices: { [key: string]: number } = {}
        let addOnTotal = 0
        if (args.addOns && args.addOns.length > 0) {
          args.addOns.forEach((addOn) => {
            const addOnLower = addOn.toLowerCase()
            if (addOnPricing[addOnLower]) {
              addOnPrices[addOn] = addOnPricing[addOnLower]
              addOnTotal += addOnPricing[addOnLower]
            }
          })
        }

        // Calculate condition adjustment
        let conditionAdjustment = 0
        if (args.vehicleCondition) {
          const conditionMultipliers = {
            excellent: 0,
            good: 0.1,
            fair: 0.2,
            poor: 0.3,
          }
          conditionAdjustment = basePrice * conditionMultipliers[args.vehicleCondition]
        }

        // Calculate discounts
        const discounts: { [key: string]: number } = {}
        let discountTotal = 0

        // Regular customer discount
        if (args.isRegularCustomer) {
          discounts["Regular Customer"] = Math.round(basePrice * 0.1)
          discountTotal += discounts["Regular Customer"]
        }

        // Promo code discount
        if (args.promoCode) {
          // Simulate promo code validation
          const validPromoCodes = {
            SPRING2025: 0.15,
            NEWCUSTOMER: 0.2,
            WEEKEND: 0.1,
          }

          if (validPromoCodes[args.promoCode.toUpperCase()]) {
            const promoDiscount = Math.round(basePrice * validPromoCodes[args.promoCode.toUpperCase()])
            discounts[`Promo (${args.promoCode})`] = promoDiscount
            discountTotal += promoDiscount
          }
        }

        // Calculate total price
        const subtotal = basePrice + addOnTotal + conditionAdjustment
        const totalPrice = Math.max(0, subtotal - discountTotal)

        // Estimate duration based on service package and vehicle type
        const baseDuration = {
          sedan: { basic: 1, standard: 2, premium: 3, ultimate: 4 },
          suv: { basic: 1.5, standard: 2.5, premium: 3.5, ultimate: 4.5 },
          truck: { basic: 1.5, standard: 2.5, premium: 3.5, ultimate: 5 },
          van: { basic: 1.5, standard: 2.5, premium: 3.5, ultimate: 5 },
          luxury: { basic: 1.5, standard: 2.5, premium: 4, ultimate: 6 },
          exotic: { basic: 2, standard: 3, premium: 5, ultimate: 8 },
        }

        let estimatedDuration = baseDuration[args.vehicleType][args.servicePackage]

        // Add time for add-ons
        const addOnDuration = {
          "engine detailing": 0.5,
          "headlight restoration": 0.5,
          "paint correction": 2,
          "ceramic coating": 3,
          "leather treatment": 0.5,
          "odor removal": 0.5,
          "pet hair removal": 0.5,
          "stain removal": 0.5,
        }

        if (args.addOns && args.addOns.length > 0) {
          args.addOns.forEach((addOn) => {
            const addOnLower = addOn.toLowerCase()
            if (addOnDuration[addOnLower]) {
              estimatedDuration += addOnDuration[addOnLower]
            }
          })
        }

        // Create a detailed breakdown
        let breakdown = `Base price for ${args.vehicleType} (${args.servicePackage} package): $${basePrice}\n`

        if (Object.keys(addOnPrices).length > 0) {
          breakdown += "Add-ons:\n"
          for (const [addOn, price] of Object.entries(addOnPrices)) {
            breakdown += `- ${addOn}: $${price}\n`
          }
        }

        if (conditionAdjustment > 0) {
          breakdown += `Condition adjustment (${args.vehicleCondition}): $${conditionAdjustment}\n`
        }

        if (Object.keys(discounts).length > 0) {
          breakdown += "Discounts:\n"
          for (const [discountName, amount] of Object.entries(discounts)) {
            breakdown += `- ${discountName}: -$${amount}\n`
          }
        }

        breakdown += `\nTotal: $${totalPrice}\n`
        breakdown += `Estimated duration: ${estimatedDuration} hours`

        return {
          basePrice,
          addOnPrices,
          discounts,
          totalPrice,
          estimatedDuration,
          breakdown,
        }
      },
    }),

    // Tool to manage customer information
    manageCustomer: createTool({
      description: "Manage customer information and history",
      args: z.object({
        action: z.enum(["get", "create", "update", "getHistory"]).describe("The action to perform"),
        customerId: z.optional(z.string()).describe("The ID of the customer (required for get/update/getHistory)"),
        customerInfo: z
          .optional(
            z.object({
              name: z.optional(z.string()),
              email: z.optional(z.string()),
              phone: z.optional(z.string()),
              address: z.optional(z.string()),
              preferredServices: z.optional(z.array(z.string())),
              notes: z.optional(z.string()),
            }),
          )
          .describe("Customer information for create/update"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        customer?: any
        history?: any[]
      }> => {
        try {
          // In a real implementation, this would interact with a customer database
          // For now, we'll simulate the behavior

          // Get customer information
          if (args.action === "get") {
            if (!args.customerId) {
              return {
                success: false,
                message: "Customer ID is required",
              }
            }

            // Simulate fetching customer data
            const customer = {
              id: args.customerId,
              name: "John Doe",
              email: "john.doe@example.com",
              phone: "555-123-4567",
              address: "123 Main St, Anytown, USA",
              preferredServices: ["Premium Detailing", "Ceramic Coating"],
              notes: "Prefers eco-friendly products",
              memberSince: "2023-01-15",
              loyaltyPoints: 250,
            }

            return {
              success: true,
              message: "Customer information retrieved",
              customer,
            }
          }

          // Create new customer
          if (args.action === "create") {
            if (!args.customerInfo) {
              return {
                success: false,
                message: "Customer information is required",
              }
            }

            // Simulate creating a customer
            const customerId = `cust-${Date.now()}`
            const customer = {
              id: customerId,
              ...args.customerInfo,
              memberSince: formatDate(new Date().toISOString()),
              loyaltyPoints: 0,
            }

            return {
              success: true,
              message: "Customer created successfully",
              customer,
            }
          }

          // Update customer information
          if (args.action === "update") {
            if (!args.customerId || !args.customerInfo) {
              return {
                success: false,
                message: "Customer ID and updated information are required",
              }
            }

            // Simulate updating customer data
            const customer = {
              id: args.customerId,
              name: "John Doe",
              email: "john.doe@example.com",
              phone: "555-123-4567",
              address: "123 Main St, Anytown, USA",
              preferredServices: ["Premium Detailing", "Ceramic Coating"],
              notes: "Prefers eco-friendly products",
              memberSince: "2023-01-15",
              loyaltyPoints: 250,
              ...args.customerInfo,
            }

            return {
              success: true,
              message: "Customer information updated successfully",
              customer,
            }
          }

          // Get customer service history
          if (args.action === "getHistory") {
            if (!args.customerId) {
              return {
                success: false,
                message: "Customer ID is required",
              }
            }

            // Simulate fetching service history
            const history = [
              {
                id: "serv-001",
                date: "2025-03-15",
                service: "Premium Detailing",
                vehicle: "2022 Tesla Model 3",
                price: 300,
                notes: "Customer very satisfied with the result",
              },
              {
                id: "serv-002",
                date: "2025-01-20",
                service: "Basic Wash & Wax",
                vehicle: "2022 Tesla Model 3",
                price: 120,
                notes: "Scheduled follow-up for ceramic coating",
              },
              {
                id: "serv-003",
                date: "2024-11-05",
                service: "Interior Deep Clean",
                vehicle: "2022 Tesla Model 3",
                price: 180,
                notes: "Removed coffee stains from passenger seat",
              },
            ]

            return {
              success: true,
              message: "Customer service history retrieved",
              history,
            }
          }

          return {
            success: false,
            message: "Invalid action specified",
          }
        } catch (error) {
          console.error("Error managing customer information:", error)
          return {
            success: false,
            message: "An error occurred while managing customer information",
          }
        }
      },
    }),

    // Tool to manage inventory
    manageInventory: createTool({
      description: "Manage inventory of detailing products and supplies",
      args: z.object({
        action: z.enum(["check", "update", "lowStock", "usage"]).describe("The action to perform"),
        productId: z.optional(z.string()).describe("The ID of the product (for check/update)"),
        category: z.optional(z.string()).describe("Product category (for filtering)"),
        quantity: z.optional(z.number()).describe("Quantity to add/remove (for update)"),
        threshold: z.optional(z.number()).describe("Low stock threshold (for lowStock)"),
        period: z.optional(z.enum(["week", "month", "quarter", "year"])).describe("Time period for usage statistics"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        inventory?: any[]
        product?: any
        lowStockItems?: any[]
        usageStats?: any
      }> => {
        try {
          // In a real implementation, this would interact with an inventory system
          // For now, we'll simulate the behavior

          // Sample inventory data
          const inventoryData = [
            {
              id: "prod-001",
              name: "Premium Car Wash Soap",
              category: "cleaning",
              currentStock: 15,
              minStockLevel: 5,
              unitPrice: 24.99,
              lastRestocked: "2025-03-01",
              supplier: "DetailPro Supplies",
            },
            {
              id: "prod-002",
              name: "Microfiber Towels (Pack of 10)",
              category: "tools",
              currentStock: 8,
              minStockLevel: 10,
              unitPrice: 19.99,
              lastRestocked: "2025-02-15",
              supplier: "DetailPro Supplies",
            },
            {
              id: "prod-003",
              name: "Ceramic Coating Solution",
              category: "protection",
              currentStock: 3,
              minStockLevel: 2,
              unitPrice: 149.99,
              lastRestocked: "2025-01-20",
              supplier: "Premium Auto Finishes",
            },
            {
              id: "prod-004",
              name: "Interior Cleaner",
              category: "cleaning",
              currentStock: 4,
              minStockLevel: 5,
              unitPrice: 14.99,
              lastRestocked: "2025-02-10",
              supplier: "DetailPro Supplies",
            },
            {
              id: "prod-005",
              name: "Clay Bar Kit",
              category: "decontamination",
              currentStock: 12,
              minStockLevel: 5,
              unitPrice: 29.99,
              lastRestocked: "2025-03-05",
              supplier: "Premium Auto Finishes",
            },
          ]

          // Check inventory
          if (args.action === "check") {
            if (args.productId) {
              // Check specific product
              const product = inventoryData.find((p) => p.id === args.productId)
              if (!product) {
                return {
                  success: false,
                  message: `Product with ID ${args.productId} not found`,
                }
              }

              return {
                success: true,
                message: "Product information retrieved",
                product,
              }
            } else if (args.category) {
              // Filter by category
              const filteredInventory = inventoryData.filter((p) => p.category === args.category)
              return {
                success: true,
                message: `Found ${filteredInventory.length} products in category '${args.category}'`,
                inventory: filteredInventory,
              }
            } else {
              // Return all inventory
              return {
                success: true,
                message: `Retrieved ${inventoryData.length} inventory items`,
                inventory: inventoryData,
              }
            }
          }

          // Update inventory
          if (args.action === "update") {
            if (!args.productId || args.quantity === undefined) {
              return {
                success: false,
                message: "Product ID and quantity are required for inventory updates",
              }
            }

            // Find product
            const productIndex = inventoryData.findIndex((p) => p.id === args.productId)
            if (productIndex === -1) {
              return {
                success: false,
                message: `Product with ID ${args.productId} not found`,
              }
            }

            // Update stock
            const updatedProduct = {
              ...inventoryData[productIndex],
              currentStock: Math.max(0, inventoryData[productIndex].currentStock + args.quantity),
              lastRestocked:
                args.quantity > 0 ? formatDate(new Date().toISOString()) : inventoryData[productIndex].lastRestocked,
            }

            return {
              success: true,
              message: `Inventory updated for ${updatedProduct.name}`,
              product: updatedProduct,
            }
          }

          // Check low stock items
          if (args.action === "lowStock") {
            const threshold = args.threshold || 0
            const lowStockItems = inventoryData.filter((p) => p.currentStock <= (threshold || p.minStockLevel))

            return {
              success: true,
              message: `Found ${lowStockItems.length} items below threshold`,
              lowStockItems,
            }
          }

          // Get usage statistics
          if (args.action === "usage") {
            // Simulate usage statistics
            const usageStats = {
              period: args.period || "month",
              topUsedProducts: [
                { id: "prod-001", name: "Premium Car Wash Soap", unitsUsed: 12, costValue: 299.88 },
                { id: "prod-002", name: "Microfiber Towels (Pack of 10)", unitsUsed: 8, costValue: 159.92 },
                { id: "prod-004", name: "Interior Cleaner", unitsUsed: 7, costValue: 104.93 },
              ],
              totalUsage: {
                unitsUsed: 45,
                costValue: 1245.67,
              },
              usageByCategory: {
                cleaning: { unitsUsed: 19, costValue: 404.81 },
                tools: { unitsUsed: 8, costValue: 159.92 },
                protection: { unitsUsed: 5, costValue: 749.95 },
                decontamination: { unitsUsed: 6, costValue: 179.94 },
              },
            }

            return {
              success: true,
              message: `Usage statistics for ${args.period || "month"}`,
              usageStats,
            }
          }

          return {
            success: false,
            message: "Invalid action specified",
          }
        } catch (error) {
          console.error("Error managing inventory:", error)
          return {
            success: false,
            message: "An error occurred while managing inventory",
          }
        }
      },
    }),

    // Tool to get business analytics
    getBusinessAnalytics: createTool({
      description: "Get business analytics and insights",
      args: z.object({
        metric: z
          .enum(["revenue", "appointments", "customers", "services", "satisfaction", "comparison", "forecast"])
          .describe("The metric to analyze"),
        period: z.enum(["day", "week", "month", "quarter", "year"]).describe("The time period to analyze"),
        startDate: z.optional(z.string()).describe("Start date for the analysis (YYYY-MM-DD)"),
        endDate: z.optional(z.string()).describe("End date for the analysis (YYYY-MM-DD)"),
        compareWithPrevious: z.optional(z.boolean()).describe("Whether to compare with the previous period"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        data: any
        insights: string[]
      }> => {
        try {
          // In a real implementation, this would query a business analytics system
          // For now, we'll simulate the behavior

          // Set default dates if not provided
          const endDate = args.endDate ? new Date(args.endDate) : new Date()
          let startDate = new Date(endDate)

          // Adjust start date based on period
          if (args.period === "day") {
            startDate.setDate(startDate.getDate() - 1)
          } else if (args.period === "week") {
            startDate.setDate(startDate.getDate() - 7)
          } else if (args.period === "month") {
            startDate.setMonth(startDate.getMonth() - 1)
          } else if (args.period === "quarter") {
            startDate.setMonth(startDate.getMonth() - 3)
          } else if (args.period === "year") {
            startDate.setFullYear(startDate.getFullYear() - 1)
          }

          // Override with provided start date if available
          if (args.startDate) {
            startDate = new Date(args.startDate)
          }

          // Format dates for display
          const formattedStartDate = formatDate(startDate.toISOString())
          const formattedEndDate = formatDate(endDate.toISOString())

          // Generate analytics based on the requested metric
          let data: any = {}
          let insights: string[] = []

          // Revenue analytics
          if (args.metric === "revenue") {
            data = {
              totalRevenue: 24850,
              averagePerDay: 828.33,
              byService: {
                "Basic Wash": 3200,
                "Standard Detailing": 7500,
                "Premium Detailing": 9600,
                "Ceramic Coating": 4550,
              },
              byPaymentMethod: {
                "Credit Card": 16395,
                Cash: 2485,
                "Mobile Payment": 5970,
              },
              trend: [
                { date: "2025-03-01", revenue: 750 },
                { date: "2025-03-08", revenue: 950 },
                { date: "2025-03-15", revenue: 825 },
                { date: "2025-03-22", revenue: 975 },
                { date: "2025-03-29", revenue: 1100 },
              ],
            }

            if (args.compareWithPrevious) {
              data.previousPeriod = {
                totalRevenue: 22300,
                percentChange: 11.4,
              }
            }

            insights = [
              "Revenue has increased by 11.4% compared to the previous period",
              "Premium Detailing services generate the highest revenue",
              "Weekend revenue is consistently higher than weekday revenue",
              "Credit card is the most popular payment method",
            ]
          }

          // Appointment analytics
          else if (args.metric === "appointments") {
            data = {
              totalAppointments: 85,
              completedAppointments: 78,
              cancelledAppointments: 7,
              averagePerDay: 2.8,
              byService: {
                "Basic Wash": 25,
                "Standard Detailing": 30,
                "Premium Detailing": 20,
                "Ceramic Coating": 10,
              },
              byDayOfWeek: {
                Monday: 10,
                Tuesday: 12,
                Wednesday: 11,
                Thursday: 13,
                Friday: 15,
                Saturday: 18,
                Sunday: 6,
              },
              trend: [
                { date: "2025-03-01", appointments: 18 },
                { date: "2025-03-08", appointments: 16 },
                { date: "2025-03-15", appointments: 17 },
                { date: "2025-03-22", appointments: 15 },
                { date: "2025-03-29", appointments: 19 },
              ],
            }

            if (args.compareWithPrevious) {
              data.previousPeriod = {
                totalAppointments: 80,
                percentChange: 6.25,
              }
            }

            insights = [
              "Saturday is the busiest day for appointments",
              "Standard Detailing is the most requested service",
              "The cancellation rate is 8.2%, which is within the acceptable range",
              "Consider adding more slots on Saturdays to accommodate demand",
            ]
          }

          // Customer analytics
          else if (args.metric === "customers") {
            data = {
              totalCustomers: 65,
              newCustomers: 12,
              returningCustomers: 53,
              averageServicesPerCustomer: 1.3,
              topCustomers: [
                { id: "cust-001", name: "John Smith", visits: 4, totalSpent: 1250 },
                { id: "cust-002", name: "Sarah Johnson", visits: 3, totalSpent: 950 },
                { id: "cust-003", name: "Michael Brown", visits: 3, totalSpent: 875 },
              ],
              customerRetentionRate: 82,
              customerAcquisitionCost: 35,
              lifetimeValue: 750,
            }

            if (args.compareWithPrevious) {
              data.previousPeriod = {
                totalCustomers: 60,
                newCustomers: 15,
                percentChangeTotal: 8.3,
                percentChangeNew: -20,
              }
            }

            insights = [
              "Customer retention rate is strong at 82%",
              "New customer acquisition has decreased by 20% compared to the previous period",
              "The average lifetime value of a customer is $750",
              "Consider implementing a referral program to increase new customer acquisition",
            ]
          }

          // Service analytics
          else if (args.metric === "services") {
            data = {
              totalServices: 85,
              byType: {
                "Basic Wash": { count: 25, revenue: 3200, averageDuration: 1.2 },
                "Standard Detailing": { count: 30, revenue: 7500, averageDuration: 2.5 },
                "Premium Detailing": { count: 20, revenue: 9600, averageDuration: 3.8 },
                "Ceramic Coating": { count: 10, revenue: 4550, averageDuration: 5.2 },
              },
              mostProfitableService: "Premium Detailing",
              fastestGrowingService: "Ceramic Coating",
              averageServiceDuration: 2.8,
              serviceEfficiency: 85, // percentage
            }

            if (args.compareWithPrevious) {
              data.previousPeriod = {
                totalServices: 80,
                percentChange: 6.25,
                serviceGrowth: {
                  "Basic Wash": 0,
                  "Standard Detailing": 7.1,
                  "Premium Detailing": 5.3,
                  "Ceramic Coating": 25,
                },
              }
            }

            insights = [
              "Premium Detailing generates the highest revenue per service",
              "Ceramic Coating is the fastest growing service with 25% growth",
              "The average service duration is 2.8 hours",
              "Consider promoting Premium Detailing packages to increase revenue",
            ]
          }

          // Customer satisfaction analytics
          else if (args.metric === "satisfaction") {
            data = {
              overallSatisfaction: 4.7, // out of 5
              responseRate: 68, // percentage
              byService: {
                "Basic Wash": 4.5,
                "Standard Detailing": 4.6,
                "Premium Detailing": 4.8,
                "Ceramic Coating": 4.9,
              },
              byAspect: {
                Quality: 4.8,
                Value: 4.5,
                Timeliness: 4.6,
                "Customer Service": 4.9,
              },
              netPromoterScore: 72,
              testimonials: [
                { customer: "John S.", rating: 5, comment: "Excellent service, my car looks brand new!" },
                { customer: "Sarah J.", rating: 5, comment: "The ceramic coating is amazing, worth every penny." },
                { customer: "Michael B.", rating: 4, comment: "Great job overall, just a bit pricey." },
              ],
            }

            if (args.compareWithPrevious) {
              data.previousPeriod = {
                overallSatisfaction: 4.5,
                percentChange: 4.4,
              }
            }

            insights = [
              "Overall satisfaction has improved by 4.4% compared to the previous period",
              "Customer service receives the highest satisfaction ratings",
              "Ceramic Coating has the highest satisfaction among all services",
              "Value for money has the lowest satisfaction rating - consider reviewing pricing or communicating value better",
            ]
          }

          // Competitive comparison
          else if (args.metric === "comparison") {
            data = {
              marketPosition: 2, // rank in local market
              marketShare: 28, // percentage
              competitorAnalysis: [
                {
                  name: "Luxury Auto Spa",
                  strengths: ["Premium brand image", "Larger facility"],
                  weaknesses: ["Higher prices", "Longer wait times"],
                  priceComparison: "+15%",
                  satisfactionComparison: "-0.2",
                },
                {
                  name: "Quick & Clean",
                  strengths: ["Faster service", "More locations"],
                  weaknesses: ["Lower quality", "Limited premium services"],
                  priceComparison: "-20%",
                  satisfactionComparison: "-0.5",
                },
                {
                  name: "EcoDetail",
                  strengths: ["Eco-friendly products", "Strong online presence"],
                  weaknesses: ["Limited capacity", "Higher prices"],
                  priceComparison: "+5%",
                  satisfactionComparison: "-0.1",
                },
              ],
              uniqueSellingPoints: [
                "Personalized service plans",
                "Advanced ceramic coating options",
                "Flexible scheduling",
                "Mobile detailing service",
              ],
            }

            insights = [
              "Your business holds the second position in the local market with 28% market share",
              "Your satisfaction ratings exceed all competitors",
              "Luxury Auto Spa is the main competitor with a stronger brand image but higher prices",
              "Consider emphasizing your personalized service and flexible scheduling in marketing",
            ]
          }

          // Business forecast
          else if (args.metric === "forecast") {
            data = {
              revenueProjection: {
                nextMonth: 26500,
                nextQuarter: 82000,
                nextYear: 340000,
                growthRate: 8.5, // percentage
              },
              appointmentProjection: {
                nextMonth: 90,
                nextQuarter: 275,
                nextYear: 1100,
                growthRate: 6.2, // percentage
              },
              seasonalTrends: {
                spring: { demand: "High", focus: "Exterior detailing after winter" },
                summer: { demand: "Very High", focus: "Full detailing and protection" },
                fall: { demand: "Medium", focus: "Interior cleaning and protection" },
                winter: { demand: "Low", focus: "Maintenance and gift cards" },
              },
              growthOpportunities: [
                { service: "Ceramic Coating", potential: "High", investment: "Medium" },
                { service: "Fleet Services", potential: "Medium", investment: "Low" },
                { service: "Mobile Detailing", potential: "High", investment: "High" },
              ],
            }

            insights = [
              "Revenue is projected to grow by 8.5% over the next year",
              "Summer months show the highest demand for detailing services",
              "Ceramic Coating services offer the highest growth potential",
              "Consider investing in mobile detailing services to capture new market segments",
            ]
          }

          return {
            success: true,
            message: `${args.metric} analytics for ${formattedStartDate} to ${formattedEndDate}`,
            data,
            insights,
          }
        } catch (error) {
          console.error("Error getting business analytics:", error)
          return {
            success: false,
            message: "An error occurred while retrieving business analytics",
            data: {},
            insights: [],
          }
        }
      },
    }),

    // Tool to generate marketing suggestions
    generateMarketingPlan: createTool({
      description: "Generate marketing and promotion suggestions",
      args: z.object({
        businessGoal: z
          .enum(["increase_customers", "boost_revenue", "promote_service", "seasonal_campaign", "customer_retention"])
          .describe("The primary business goal"),
        targetAudience: z.optional(z.array(z.string())).describe("Target audience segments"),
        budget: z.optional(z.enum(["low", "medium", "high"])).describe("Available marketing budget"),
        timeframe: z.optional(z.enum(["immediate", "short_term", "long_term"])).describe("Campaign timeframe"),
        specificService: z.optional(z.string()).describe("Specific service to promote"),
        season: z.optional(z.enum(["spring", "summer", "fall", "winter"])).describe("Season for seasonal campaigns"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        marketingPlan: {
          strategies: Array<{ name: string; description: string; cost: string; effort: string; impact: string }>
          promotions: Array<{ name: string; description: string; discount: string; duration: string }>
          channels: Array<{ name: string; tactics: string[]; priority: string }>
          timeline: string
          budget: { total: string; breakdown: Record<string, string> }
          kpis: string[]
        }
      }> => {
        try {
          // In a real implementation, this would use more sophisticated logic
          // For now, we'll generate a marketing plan based on the inputs

          // Default values
          const budget = args.budget || "medium"
          const timeframe = args.timeframe || "short_term"
          const targetAudience = args.targetAudience || ["general"]
          const season =
            args.season ||
            (new Date().getMonth() >= 2 && new Date().getMonth() <= 4
              ? "spring"
              : new Date().getMonth() >= 5 && new Date().getMonth() <= 7
                ? "summer"
                : new Date().getMonth() >= 8 && new Date().getMonth() <= 10
                  ? "fall"
                  : "winter")

          // Generate marketing strategies based on business goal
          let strategies = []
          let promotions = []
          let channels = []
          let timeline = ""
          let budgetPlan = { total: "", breakdown: {} }
          let kpis = []

          // Increase customers
          if (args.businessGoal === "increase_customers") {
            strategies = [
              {
                name: "Referral Program",
                description: "Implement a customer referral program offering discounts for both referrer and referee",
                cost: budget === "low" ? "Low" : "Medium",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Local SEO Optimization",
                description: "Optimize Google My Business and local search presence to attract nearby customers",
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Community Partnerships",
                description:
                  "Partner with local businesses like car dealerships and auto repair shops for cross-promotion",
                cost: "Low",
                effort: "Medium",
                impact: "Medium",
              },
            ]

            if (budget !== "low") {
              strategies.push({
                name: "Targeted Social Media Ads",
                description: "Run targeted ads on Facebook and Instagram to reach potential customers in your area",
                cost: "Medium",
                effort: "Medium",
                impact: "High",
              })
            }

            if (budget === "high") {
              strategies.push({
                name: "Local Event Sponsorship",
                description: "Sponsor local car shows or community events to increase brand visibility",
                cost: "High",
                effort: "High",
                impact: "Medium",
              })
            }

            promotions = [
              {
                name: "New Customer Special",
                description: "20% off first detailing service for new customers",
                discount: "20%",
                duration: "Ongoing",
              },
              {
                name: "Bring-a-Friend Discount",
                description: "10% off for both existing customers and their friends when booking together",
                discount: "10%",
                duration: "3 months",
              },
            ]

            channels = [
              {
                name: "Social Media",
                tactics: [
                  "Before/after photos of detailing work",
                  "Customer testimonials and reviews",
                  "Educational content about car care",
                  "Targeted ads to local car enthusiasts",
                ],
                priority: "High",
              },
              {
                name: "Local Search",
                tactics: [
                  "Google My Business optimization",
                  "Local SEO for 'car detailing near me' searches",
                  "Encourage and respond to reviews",
                ],
                priority: "High",
              },
              {
                name: "Email Marketing",
                tactics: [
                  "Welcome series for new customers",
                  "Referral program promotions",
                  "Seasonal offers and tips",
                ],
                priority: "Medium",
              },
            ]

            kpis = [
              "Number of new customers per month",
              "Customer acquisition cost",
              "Referral program participation rate",
              "Conversion rate from website visitors to customers",
              "Social media engagement and follower growth",
            ]
          }

          // Boost revenue
          else if (args.businessGoal === "boost_revenue") {
            strategies = [
              {
                name: "Upselling Premium Services",
                description: "Train staff to effectively upsell premium services and add-ons",
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Service Packages",
                description: "Create bundled service packages that offer value while increasing average order value",
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Loyalty Program",
                description: "Implement a tiered loyalty program that rewards repeat business and encourages upgrades",
                cost: "Medium",
                effort: "High",
                impact: "High",
              },
            ]

            if (budget !== "low") {
              strategies.push({
                name: "Premium Service Promotion",
                description: "Market high-margin services like ceramic coating and paint correction",
                cost: "Medium",
                effort: "Medium",
                impact: "High",
              })
            }

            if (budget === "high") {
              strategies.push({
                name: "Business Client Outreach",
                description: "Develop corporate accounts and fleet service contracts",
                cost: "High",
                effort: "High",
                impact: "Very High",
              })
            }

            promotions = [
              {
                name: "Package Upgrade Special",
                description: "50% off upgrade from standard to premium package",
                discount: "50% on upgrade portion",
                duration: "2 months",
              },
              {
                name: "Loyalty Tier Promotion",
                description: "Double points for loyalty program members during promotional period",
                discount: "Variable (points-based)",
                duration: "1 month",
              },
            ]

            channels = [
              {
                name: "Direct Customer Communication",
                tactics: [
                  "Staff training on upselling techniques",
                  "Visual displays of premium services",
                  "Before/after demonstrations",
                ],
                priority: "Very High",
              },
              {
                name: "Email Marketing",
                tactics: [
                  "Targeted emails based on previous services",
                  "Exclusive offers for premium services",
                  "Educational content about benefits of premium services",
                ],
                priority: "High",
              },
              {
                name: "Website",
                tactics: [
                  "Clear service comparison charts",
                  "Prominent display of premium services",
                  "Customer testimonials for high-end services",
                ],
                priority: "Medium",
              },
            ]

            kpis = [
              "Average order value",
              "Revenue per customer",
              "Upsell conversion rate",
              "Premium service bookings",
              "Customer lifetime value",
            ]
          }

          // Promote specific service
          else if (args.businessGoal === "promote_service") {
            const service = args.specificService || "Premium Detailing"

            strategies = [
              {
                name: "Service Spotlight Campaign",
                description: `Focused marketing campaign highlighting the benefits and results of ${service}`,
                cost: budget === "low" ? "Low" : "Medium",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Educational Content",
                description: `Create educational content about the benefits and process of ${service}`,
                cost: "Low",
                effort: "Medium",
                impact: "Medium",
              },
              {
                name: "Before/After Showcase",
                description: `Showcase dramatic before and after results of ${service}`,
                cost: "Low",
                effort: "Low",
                impact: "High",
              },
            ]

            if (budget !== "low") {
              strategies.push({
                name: "Demonstration Events",
                description: `Host in-person or virtual demonstrations of ${service}`,
                cost: "Medium",
                effort: "High",
                impact: "Medium",
              })
            }

            if (budget === "high") {
              strategies.push({
                name: "Influencer Partnerships",
                description: "Partner with local car enthusiasts or influencers to showcase the service",
                cost: "High",
                effort: "Medium",
                impact: "High",
              })
            }

            promotions = [
              {
                name: "Introductory Offer",
                description: `15% off ${service} for first-time users of this service`,
                discount: "15%",
                duration: "2 months",
              },
              {
                name: "Service Bundle",
                description: `${service} bundled with complementary services at a discount`,
                discount: "10-20% on bundle",
                duration: "3 months",
              },
            ]

            channels = [
              {
                name: "Social Media",
                tactics: [
                  "Before/after photos and videos",
                  "Process demonstrations",
                  "Customer testimonials specific to the service",
                  "Targeted ads to relevant audiences",
                ],
                priority: "High",
              },
              {
                name: "Email Marketing",
                tactics: [
                  "Targeted emails to customers who might benefit",
                  "Educational series about the service benefits",
                  "Special offers and promotions",
                ],
                priority: "High",
              },
              {
                name: "In-Store Promotion",
                tactics: ["Staff recommendations", "Visual displays and examples", "Brochures and information sheets"],
                priority: "Medium",
              },
            ]

            kpis = [
              `Number of ${service} bookings`,
              "Conversion rate from promotion to booking",
              "Revenue from the specific service",
              "Customer satisfaction with the service",
              "Repeat bookings for the service",
            ]
          }

          // Seasonal campaign
          else if (args.businessGoal === "seasonal_campaign") {
            const seasonalThemes = {
              spring: {
                theme: "Spring Refresh",
                focus: "Post-winter cleaning and protection",
                services: ["Salt removal", "Paint correction", "Protective coatings"],
              },
              summer: {
                theme: "Summer Shine",
                focus: "UV protection and maintaining appearance",
                services: ["Ceramic coating", "Interior protection", "Convertible top treatment"],
              },
              fall: {
                theme: "Fall Protection",
                focus: "Preparing for harsh weather",
                services: ["Paint sealant", "Undercarriage protection", "Interior waterproofing"],
              },
              winter: {
                theme: "Winter Shield",
                focus: "Protection against salt and harsh conditions",
                services: ["Protective wax", "Undercarriage treatment", "Interior protection"],
              },
            }

            const currentSeason = seasonalThemes[season]

            strategies = [
              {
                name: `${currentSeason.theme} Campaign`,
                description: `Seasonal marketing campaign focused on ${currentSeason.focus}`,
                cost: budget === "low" ? "Low" : "Medium",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Seasonal Service Packages",
                description: `Create special packages tailored to ${season} needs`,
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Educational Content",
                description: `Educate customers about ${season}-specific car care needs`,
                cost: "Low",
                effort: "Medium",
                impact: "Medium",
              },
            ]

            if (budget !== "low") {
              strategies.push({
                name: "Targeted Advertising",
                description: `Run ads highlighting ${season}-specific services and benefits`,
                cost: "Medium",
                effort: "Medium",
                impact: "High",
              })
            }

            if (budget === "high") {
              strategies.push({
                name: "Seasonal Event",
                description: `Host a ${currentSeason.theme} event or workshop`,
                cost: "High",
                effort: "High",
                impact: "Medium",
              })
            }

            promotions = [
              {
                name: `${currentSeason.theme} Special`,
                description: `15% off ${season}-specific detailing packages`,
                discount: "15%",
                duration: "Throughout the season",
              },
              {
                name: "Early Bird Discount",
                description: `20% off when booking ${season} services in advance`,
                discount: "20%",
                duration: "First month of the season",
              },
            ]

            channels = [
              {
                name: "Social Media",
                tactics: [
                  `${season}-specific car care tips`,
                  "Before/after photos relevant to seasonal issues",
                  "Promotion of seasonal packages",
                  "Weather-triggered reminders",
                ],
                priority: "High",
              },
              {
                name: "Email Marketing",
                tactics: [
                  "Seasonal newsletter with tips and offers",
                  "Targeted emails based on previous services",
                  "Early bird promotions",
                ],
                priority: "High",
              },
              {
                name: "Local Advertising",
                tactics: [
                  "Seasonal signage",
                  "Local publications and community boards",
                  "Weather-triggered digital ads",
                ],
                priority: "Medium",
              },
            ]

            kpis = [
              "Seasonal package bookings",
              "Revenue during the season compared to previous year",
              "New customer acquisition during the campaign",
              "Email open and click-through rates",
              "Social media engagement with seasonal content",
            ]
          }

          // Customer retention
          else if (args.businessGoal === "customer_retention") {
            strategies = [
              {
                name: "Customer Loyalty Program",
                description: "Implement a points-based loyalty program with rewards for repeat business",
                cost: budget === "low" ? "Low" : "Medium",
                effort: "High",
                impact: "High",
              },
              {
                name: "Personalized Communication",
                description: "Develop personalized email and text communication based on customer history",
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
              {
                name: "Service Reminders",
                description: "Set up automated service reminders based on vehicle type and last service date",
                cost: "Low",
                effort: "Medium",
                impact: "High",
              },
            ]

            if (budget !== "low") {
              strategies.push({
                name: "Customer Appreciation Events",
                description: "Host exclusive events or offers for loyal customers",
                cost: "Medium",
                effort: "High",
                impact: "Medium",
              })
            }

            if (budget === "high") {
              strategies.push({
                name: "Premium Membership Program",
                description: "Create a premium membership with exclusive benefits and priority scheduling",
                cost: "High",
                effort: "High",
                impact: "High",
              })
            }

            promotions = [
              {
                name: "Loyalty Rewards",
                description: "Tiered discounts based on number of services (5%, 10%, 15%)",
                discount: "Variable (5-15%)",
                duration: "Ongoing",
              },
              {
                name: "Anniversary Special",
                description: "Special discount on customer's anniversary with your business",
                discount: "25%",
                duration: "Customer's anniversary month",
              },
            ]

            channels = [
              {
                name: "Email Marketing",
                tactics: [
                  "Personalized service reminders",
                  "Thank you messages after service",
                  "Birthday and anniversary offers",
                  "Exclusive content for loyal customers",
                ],
                priority: "Very High",
              },
              {
                name: "SMS/Text Messaging",
                tactics: [
                  "Service reminders",
                  "Appointment confirmations",
                  "Quick feedback requests",
                  "Special offers",
                ],
                priority: "High",
              },
              {
                name: "Direct Customer Interaction",
                tactics: [
                  "Staff recognition of repeat customers",
                  "Personalized service recommendations",
                  "Follow-up calls for premium customers",
                ],
                priority: "High",
              },
            ]

            kpis = [
              "Customer retention rate",
              "Frequency of repeat visits",
              "Average time between services",
              "Loyalty program participation rate",
              "Customer lifetime value",
            ]
          }

          // Generate timeline based on timeframe
          if (timeframe === "immediate") {
            timeline = "Launch within 1-2 weeks, run for 1-2 months, evaluate results weekly"
          } else if (timeframe === "short_term") {
            timeline = "Plan for 2-4 weeks, launch campaign for 3-6 months, evaluate results monthly"
          } else {
            timeline = "Develop comprehensive plan over 1-2 months, implement for 6-12 months, quarterly evaluation"
          }

          // Generate budget plan based on budget level
          if (budget === "low") {
            budgetPlan = {
              total: "$500-1,500",
              breakdown: {
                "Digital marketing": "40%",
                "Promotional discounts": "40%",
                "Materials and collateral": "20%",
              },
            }
          } else if (budget === "medium") {
            budgetPlan = {
              total: "$1,500-5,000",
              breakdown: {
                "Digital marketing": "35%",
                "Promotional discounts": "30%",
                "Materials and collateral": "15%",
                "Events or partnerships": "20%",
              },
            }
          } else {
            budgetPlan = {
              total: "$5,000-15,000",
              breakdown: {
                "Digital marketing": "30%",
                "Promotional discounts": "25%",
                "Materials and collateral": "15%",
                "Events or partnerships": "20%",
                "Premium advertising": "10%",
              },
            }
          }

          return {
            success: true,
            message: `Marketing plan generated for ${args.businessGoal} goal`,
            marketingPlan: {
              strategies,
              promotions,
              channels,
              timeline,
              budget: budgetPlan,
              kpis,
            },
          }
        } catch (error) {
          console.error("Error generating marketing plan:", error)
          return {
            success: false,
            message: "An error occurred while generating the marketing plan",
            marketingPlan: {
              strategies: [],
              promotions: [],
              channels: [],
              timeline: "",
              budget: { total: "", breakdown: {} },
              kpis: [],
            },
          }
        }
        \
       catch (error)
        console.error("Error generating marketing plan:", error)
        return {
          success: false,
          message: "An error occurred while generating the marketing plan",
          marketingPlan: {
            strategies: [],
            promotions: [],
            channels: [],
            timeline: "",
            budget: { total: "", breakdown: {} },
            kpis: [],
          },
        }
      },
    }),

    // Tool to manage staff and scheduling
    manageStaff: createTool({
      description: "Manage staff scheduling and performance",
      args: z.object({
        action: z.enum(["schedule", "performance", "training", "availability"]).describe("The action to perform"),
        staffId: z.optional(z.string()).describe("The ID of the staff member"),
        date: z.optional(z.string()).describe("The date for scheduling (YYYY-MM-DD)"),
        timeRange: z.optional(z.string()).describe("Time range for scheduling (e.g., '9:00-17:00')"),
        serviceType: z.optional(z.string()).describe("Type of service for scheduling"),
        trainingTopic: z.optional(z.string()).describe("Topic for training"),
        period: z.optional(z.enum(["week", "month", "quarter"])).describe("Period for performance metrics"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        data?: any
      }> => {
        try {
          // In a real implementation, this would interact with a staff management system
          // For now, we'll simulate the behavior

          // Sample staff data
          const staffData = [
            {
              id: "staff-001",
              name: "Michael Johnson",
              role: "Senior Detailer",
              specialties: ["Ceramic Coating", "Paint Correction"],
              availability: {
                monday: "9:00-17:00",
                tuesday: "9:00-17:00",
                wednesday: "9:00-17:00",
                thursday: "9:00-17:00",
                friday: "9:00-17:00",
                saturday: "10:00-15:00",
                sunday: "Off",
              },
              performance: {
                servicesCompleted: 45,
                averageRating: 4.9,
                efficiency: 92, // percentage
                upsellRate: 35, // percentage
              },
              certifications: ["Ceramic Pro Certified", "3M Paint Protection Film"],
            },
            {
              id: "staff-002",
              name: "Sarah Williams",
              role: "Detailer",
              specialties: ["Interior Detailing", "Odor Removal"],
              availability: {
                monday: "9:00-17:00",
                tuesday: "9:00-17:00",
                wednesday: "Off",
                thursday: "9:00-17:00",
                friday: "9:00-17:00",
                saturday: "10:00-15:00",
                sunday: "Off",
              },
              performance: {
                servicesCompleted: 38,
                averageRating: 4.7,
                efficiency: 85, // percentage
                upsellRate: 28, // percentage
              },
              certifications: ["Interior Detailing Specialist"],
            },
            {
              id: "staff-003",
              name: "David Chen",
              role: "Apprentice Detailer",
              specialties: ["Basic Wash", "Interior Cleaning"],
              availability: {
                monday: "9:00-17:00",
                tuesday: "Off",
                wednesday: "9:00-17:00",
                thursday: "9:00-17:00",
                friday: "9:00-17:00",
                saturday: "10:00-15:00",
                sunday: "Off",
              },
              performance: {
                servicesCompleted: 30,
                averageRating: 4.5,
                efficiency: 78, // percentage
                upsellRate: 15, // percentage
              },
              certifications: [],
            },
          ]

          // Staff scheduling
          if (args.action === "schedule") {
            if (!args.date || !args.timeRange) {
              return {
                success: false,
                message: "Date and time range are required for scheduling",
              }
            }

            // Find available staff for the requested date and time
            const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })
            const availableStaff = staffData.filter((staff) => {
              // Check if staff is available on this day
              const availabilityForDay = staff.availability[dayOfWeek]
              if (availabilityForDay === "Off") return false

              // Check if the requested time range falls within staff availability
              // This is a simplified check - a real implementation would be more sophisticated
              const [requestStart, requestEnd] = args.timeRange!.split("-")
              const [availStart, availEnd] = availabilityForDay.split("-")
              return requestStart >= availStart && requestEnd <= availEnd
            })

            // If looking for a specific staff member
            if (args.staffId) {
              const staff = staffData.find((s) => s.id === args.staffId)
              if (!staff) {
                return {
                  success: false,
                  message: `Staff member with ID ${args.staffId} not found`,
                }
              }

              // Check if this staff member is available
              const isAvailable = availableStaff.some((s) => s.id === args.staffId)
              if (!isAvailable) {
                return {
                  success: false,
                  message: `${staff.name} is not available on ${args.date} at ${args.timeRange}`,
                }
              }

              // Simulate scheduling
              return {
                success: true,
                message: `Successfully scheduled ${staff.name} on ${args.date} at ${args.timeRange}`,
                data: {
                  staffId: staff.id,
                  name: staff.name,
                  date: args.date,
                  timeRange: args.timeRange,
                  serviceType: args.serviceType || "General Detailing",
                },
              }
            }

            // If looking for any available staff
            if (availableStaff.length === 0) {
              return {
                success: false,
                message: `No staff members are available on ${args.date} at ${args.timeRange}`,
              }
            }

            // If service type is specified, find staff with that specialty
            let matchedStaff = availableStaff
            if (args.serviceType) {
              const specializedStaff = availableStaff.filter((staff) =>
                staff.specialties.some((specialty) =>
                  specialty.toLowerCase().includes(args.serviceType!.toLowerCase()),
                ),
              )
              if (specializedStaff.length > 0) {
                matchedStaff = specializedStaff
              }
            }

            // Sort by seniority (role) and return the best match
            const bestMatch = matchedStaff.sort((a, b) => {
              if (a.role === "Senior Detailer") return -1
              if (b.role === "Senior Detailer") return 1
              if (a.role === "Detailer" && b.role === "Apprentice Detailer") return -1
              if (a.role === "Apprentice Detailer" && b.role === "Detailer") return 1
              return 0
            })[0]

            return {
              success: true,
              message: `Found available staff for ${args.date} at ${args.timeRange}`,
              data: {
                staffId: bestMatch.id,
                name: bestMatch.name,
                role: bestMatch.role,
                date: args.date,
                timeRange: args.timeRange,
                serviceType: args.serviceType || "General Detailing",
              },
            }
          }

          // Staff performance
          else if (args.action === "performance") {
            const period = args.period || "month"

            // If looking for a specific staff member
            if (args.staffId) {
              const staff = staffData.find((s) => s.id === args.staffId)
              if (!staff) {
                return {
                  success: false,
                  message: `Staff member with ID ${args.staffId} not found`,
                }
              }

              // Simulate performance metrics
              const performanceData = {
                ...staff.performance,
                period,
                serviceBreakdown: {
                  "Basic Wash": 12,
                  "Standard Detailing": 18,
                  "Premium Detailing": 10,
                  "Ceramic Coating": 5,
                },
                customerFeedback: [
                  { rating: 5, comment: "Michael did an amazing job on my car!" },
                  { rating: 5, comment: "Very thorough and professional service." },
                  { rating: 4, comment: "Good work, just a bit slower than expected." },
                ],
                trends: {
                  servicesCompleted: "+5% from last period",
                  averageRating: "Stable",
                  efficiency: "+3% from last period",
                  upsellRate: "+2% from last period",
                },
                areas: {
                  strengths: ["Customer satisfaction", "Quality of work", "Technical knowledge"],
                  improvement: ["Processing time", "Documentation"],
                },
              }

              return {
                success: true,
                message: `Performance data retrieved for ${staff.name}`,
                data: performanceData,
              }
            }

            // If looking for all staff
            const performanceSummary = {
              period,
              topPerformer: "Michael Johnson",
              averageRating: 4.7,
              totalServicesCompleted: 113,
              staffMetrics: staffData.map((staff) => ({
                id: staff.id,
                name: staff.name,
                role: staff.role,
                servicesCompleted: staff.performance.servicesCompleted,
                averageRating: staff.performance.averageRating,
                efficiency: staff.performance.efficiency,
                upsellRate: staff.performance.upsellRate,
              })),
              teamStrengths: ["Customer service", "Quality of work"],
              teamImprovements: ["Efficiency", "Upselling premium services"],
            }

            return {
              success: true,
              message: `Team performance summary for the ${period}`,
              data: performanceSummary,
            }
          }

          // Staff training
          else if (args.action === "training") {
            if (!args.trainingTopic) {
              // Return available training topics
              const trainingTopics = [
                {
                  topic: "Ceramic Coating Application",
                  description: "Advanced techniques for applying ceramic coatings",
                  duration: "8 hours",
                  recommendedFor: ["Detailer", "Senior Detailer"],
                },
                {
                  topic: "Paint Correction Techniques",
                  description: "Professional paint correction methods for various paint types",
                  duration: "16 hours",
                  recommendedFor: ["Detailer", "Senior Detailer"],
                },
                {
                  topic: "Interior Detailing Mastery",
                  description: "Advanced techniques for interior cleaning and restoration",
                  duration: "8 hours",
                  recommendedFor: ["Apprentice Detailer", "Detailer", "Senior Detailer"],
                },
                {
                  topic: "Customer Service Excellence",
                  description: "Enhancing customer experience and handling difficult situations",
                  duration: "4 hours",
                  recommendedFor: ["Apprentice Detailer", "Detailer", "Senior Detailer"],
                },
                {
                  topic: "Upselling Techniques",
                  description: "Effective methods for recommending additional services",
                  duration: "4 hours",
                  recommendedFor: ["Apprentice Detailer", "Detailer", "Senior Detailer"],
                },
              ]

              return {
                success: true,
                message: "Available training topics retrieved",
                data: { trainingTopics },
              }
            }

            // If staff ID is provided, schedule training for that staff member
            if (args.staffId) {
              const staff = staffData.find((s) => s.id === args.staffId)
              if (!staff) {
                return {
                  success: false,
                  message: `Staff member with ID ${args.staffId} not found`,
                }
              }

              // Simulate scheduling training
              return {
                success: true,
                message: `Training on "${args.trainingTopic}" scheduled for ${staff.name}`,
                data: {
                  staffId: staff.id,
                  name: staff.name,
                  trainingTopic: args.trainingTopic,
                  date: args.date || "To be determined",
                  status: "Scheduled",
                },
              }
            }

            // Recommend staff for the training topic
            const topic = args.trainingTopic.toLowerCase()
            let recommendedStaff = []

            if (topic.includes("ceramic") || topic.includes("coating")) {
              recommendedStaff = staffData.filter(
                (staff) => staff.role === "Detailer" || staff.role === "Apprentice Detailer",
              )
            } else if (topic.includes("paint") || topic.includes("correction")) {
              recommendedStaff = staffData.filter(
                (staff) => staff.role === "Detailer" || staff.role === "Apprentice Detailer",
              )
            } else if (topic.includes("interior")) {
              recommendedStaff = staffData.filter((staff) => !staff.specialties.includes("Interior Detailing"))
            } else if (topic.includes("customer") || topic.includes("upsell")) {
              recommendedStaff = staffData.filter((staff) => staff.performance.upsellRate < 30)
            } else {
              recommendedStaff = staffData
            }

            return {
              success: true,
              message: `Recommended staff for "${args.trainingTopic}" training`,
              data: {
                trainingTopic: args.trainingTopic,
                recommendedStaff: recommendedStaff.map((staff) => ({
                  id: staff.id,
                  name: staff.name,
                  role: staff.role,
                  currentCertifications: staff.certifications,
                })),
              },
            }
          }

          // Staff availability
          else if (args.action === "availability") {
            // If staff ID is provided, get availability for that staff member
            if (args.staffId) {
              const staff = staffData.find((s) => s.id === args.staffId)
              if (!staff) {
                return {
                  success: false,
                  message: `Staff member with ID ${args.staffId} not found`,
                }
              }

              return {
                success: true,
                message: `Availability retrieved for ${staff.name}`,
                data: {
                  staffId: staff.id,
                  name: staff.name,
                  role: staff.role,
                  availability: staff.availability,
                  specialties: staff.specialties,
                },
              }
            }

            // If date is provided, get available staff for that date
            if (args.date) {
              const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })
              const availableStaff = staffData.filter((staff) => staff.availability[dayOfWeek] !== "Off")

              return {
                success: true,
                message: `Available staff for ${args.date}`,
                data: {
                  date: args.date,
                  availableStaff: availableStaff.map((staff) => ({
                    id: staff.id,
                    name: staff.name,
                    role: staff.role,
                    hours: staff.availability[dayOfWeek],
                    specialties: staff.specialties,
                  })),
                },
              }
            }

            // Return availability for all staff
            return {
              success: true,
              message: "Staff availability retrieved",
              data: {
                staffAvailability: staffData.map((staff) => ({
                  id: staff.id,
                  name: staff.name,
                  role: staff.role,
                  availability: staff.availability,
                  specialties: staff.specialties,
                })),
              },
            }
          }

          return {
            success: false,
            message: "Invalid action specified",
          }
        } catch (error) {
          console.error("Error managing staff:", error)
          return {
            success: false,
            message: "An error occurred while managing staff",
          }
        }
      },
    }),

    // Tool to check weather forecast for planning outdoor detailing
    checkWeatherForecast: createTool({
      description: "Check weather forecast for planning outdoor detailing",
      args: z.object({
        location: z.string().describe("Location (city, zip code, or coordinates)"),
        date: z.optional(z.string()).describe("Date to check (YYYY-MM-DD), defaults to next 7 days if not provided"),
        detailingType: z.optional(z.enum(["exterior", "interior", "both"])).describe("Type of detailing being planned"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        forecast?: any
        recommendations?: string[]
      }> => {
        try {
          // In a real implementation, this would call a weather API
          // For now, we'll simulate the behavior

          const location = args.location
          const detailingType = args.detailingType || "both"

          // Generate a simulated forecast
          const today = new Date()
          const forecast = []

          // If specific date is provided
          if (args.date) {
            const targetDate = new Date(args.date)
            const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (daysDiff < 0 || daysDiff > 10) {
              return {
                success: false,
                message: "Forecast is only available for the next 10 days",
              }
            }

            // Generate a random but realistic forecast for the target date
            const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Thunderstorm"]
            const weights = [0.3, 0.3, 0.2, 0.1, 0.05, 0.05] // Probability weights
            const randomIndex = weightedRandom(weights)
            const condition = conditions[randomIndex]

            // Generate temperature based on condition
            let tempMin, tempMax
            if (condition === "Sunny") {
              tempMin = 65 + Math.floor(Math.random() * 10)
              tempMax = tempMin + 10 + Math.floor(Math.random() * 10)
            } else if (condition === "Partly Cloudy") {
              tempMin = 60 + Math.floor(Math.random() * 10)
              tempMax = tempMin + 8 + Math.floor(Math.random() * 8)
            } else if (condition === "Cloudy") {
              tempMin = 55 + Math.floor(Math.random() * 10)
              tempMax = tempMin + 5 + Math.floor(Math.random() * 10)
            } else if (condition === "Light Rain") {
              tempMin = 50 + Math.floor(Math.random() * 10)
              tempMax = tempMin + 5 + Math.floor(Math.random() * 8)
            } else {
              tempMin = 45 + Math.floor(Math.random() * 10)
              tempMax = tempMin + 5 + Math.floor(Math.random() * 5)
            }

            // Generate humidity based on condition
            let humidity
            if (condition === "Sunny") {
              humidity = 30 + Math.floor(Math.random() * 20)
            } else if (condition === "Partly Cloudy") {
              humidity = 40 + Math.floor(Math.random() * 20)
            } else if (condition === "Cloudy") {
              humidity = 50 + Math.floor(Math.random() * 20)
            } else if (condition === "Light Rain") {
              humidity = 70 + Math.floor(Math.random() * 20)
            } else {
              humidity = 80 + Math.floor(Math.random() * 15)
            }

            // Generate wind speed
            const windSpeed = 5 + Math.floor(Math.random() * 15)

            // Generate UV index based on condition
            let uvIndex
            if (condition === "Sunny") {
              uvIndex = 7 + Math.floor(Math.random() * 4)
            } else if (condition === "Partly Cloudy") {
              uvIndex = 5 + Math.floor(Math.random() * 3)
            } else if (condition === "Cloudy") {
              uvIndex = 3 + Math.floor(Math.random() * 3)
            } else {
              uvIndex = 1 + Math.floor(Math.random() * 2)
            }

            // Generate precipitation probability based on condition
            let precipProbability
            if (condition === "Sunny") {
              precipProbability = Math.floor(Math.random() * 10)
            } else if (condition === "Partly Cloudy") {
              precipProbability = 10 + Math.floor(Math.random() * 20)
            } else if (condition === "Cloudy") {
              precipProbability = 30 + Math.floor(Math.random() * 30)
            } else if (condition === "Light Rain") {
              precipProbability = 70 + Math.floor(Math.random() * 20)
            } else {
              precipProbability = 90 + Math.floor(Math.random() * 10)
            }

            forecast.push({
              date: args.date,
              condition,
              tempMin,
              tempMax,
              humidity,
              windSpeed,
              uvIndex,
              precipProbability,
            })
          } else {
            // Generate forecast for the next 7 days
            for (let i = 0; i < 7; i++) {
              const forecastDate = new Date(today)
              forecastDate.setDate(today.getDate() + i)
              const dateString = formatDate(forecastDate.toISOString())

              // Generate a random but realistic forecast
              const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Thunderstorm"]
              const weights = [0.3, 0.3, 0.2, 0.1, 0.05, 0.05] // Probability weights
              const randomIndex = weightedRandom(weights)
              const condition = conditions[randomIndex]

              // Generate temperature based on condition
              let tempMin, tempMax
              if (condition === "Sunny") {
                tempMin = 65 + Math.floor(Math.random() * 10)
                tempMax = tempMin + 10 + Math.floor(Math.random() * 10)
              } else if (condition === "Partly Cloudy") {
                tempMin = 60 + Math.floor(Math.random() * 10)
                tempMax = tempMin + 8 + Math.floor(Math.random() * 8)
              } else if (condition === "Cloudy") {
                tempMin = 55 + Math.floor(Math.random() * 10)
                tempMax = tempMin + 5 + Math.floor(Math.random() * 10)
              } else if (condition === "Light Rain") {
                tempMin = 50 + Math.floor(Math.random() * 10)
                tempMax = tempMin + 5 + Math.floor(Math.random() * 8)
              } else {
                tempMin = 45 + Math.floor(Math.random() * 10)
                tempMax = tempMin + 5 + Math.floor(Math.random() * 5)
              }

              // Generate humidity based on condition
              let humidity
              if (condition === "Sunny") {
                humidity = 30 + Math.floor(Math.random() * 20)
              } else if (condition === "Partly Cloudy") {
                humidity = 40 + Math.floor(Math.random() * 20)
              } else if (condition === "Cloudy") {
                humidity = 50 + Math.floor(Math.random() * 20)
              } else if (condition === "Light Rain") {
                humidity = 70 + Math.floor(Math.random() * 20)
              } else {
                humidity = 80 + Math.floor(Math.random() * 15)
              }

              // Generate wind speed
              const windSpeed = 5 + Math.floor(Math.random() * 15)

              // Generate UV index based on condition
              let uvIndex
              if (condition === "Sunny") {
                uvIndex = 7 + Math.floor(Math.random() * 4)
              } else if (condition === "Partly Cloudy") {
                uvIndex = 5 + Math.floor(Math.random() * 3)
              } else if (condition === "Cloudy") {
                uvIndex = 3 + Math.floor(Math.random() * 3)
              } else {
                uvIndex = 1 + Math.floor(Math.random() * 2)
              }

              // Generate precipitation probability based on condition
              let precipProbability
              if (condition === "Sunny") {
                precipProbability = Math.floor(Math.random() * 10)
              } else if (condition === "Partly Cloudy") {
                precipProbability = 10 + Math.floor(Math.random() * 20)
              } else if (condition === "Cloudy") {
                precipProbability = 30 + Math.floor(Math.random() * 30)
              } else if (condition === "Light Rain") {
                precipProbability = 70 + Math.floor(Math.random() * 20)
              } else {
                precipProbability = 90 + Math.floor(Math.random() * 10)
              }

              forecast.push({
                date: dateString,
                condition,
                tempMin,
                tempMax,
                humidity,
                windSpeed,
                uvIndex,
                precipProbability,
              })
            }
          }

          // Generate recommendations based on forecast and detailing type
          const recommendations = []

          // Helper function for weighted random selection
          function weightedRandom(weights: number[]): number {
            const r = Math.random()
            let sum = 0
            for (let i = 0; i < weights.length; i++) {
              sum += weights[i]
              if (r <= sum) return i
            }
            return weights.length - 1
          }

          // Analyze forecast for detailing recommendations
          for (const day of forecast) {
            if (detailingType === "exterior" || detailingType === "both") {
              // Exterior detailing recommendations
              if (
                day.condition === "Sunny" ||
                day.condition === "Partly Cloudy" ||
                (day.condition === "Cloudy" && day.precipProbability < 30)
              ) {
                if (day.windSpeed < 10) {
                  recommendations.push(
                    `${day.date}: Good conditions for exterior detailing. Low wind and dry conditions are ideal.`,
                  )
                } else {
                  recommendations.push(
                    `${day.date}: Acceptable for exterior detailing, but higher winds (${day.windSpeed} mph) may affect drying times and product application.`,
                  )
                }

                if (day.uvIndex > 7) {
                  recommendations.push(
                    `${day.date}: High UV index (${day.uvIndex}). Work in shaded areas to prevent products from drying too quickly.`,
                  )
                }
              } else {
                recommendations.push(
                  `${day.date}: Not recommended for exterior detailing due to ${day.condition.toLowerCase()} conditions.`,
                )
              }

              // Temperature considerations
              if (day.tempMax > 85) {
                recommendations.push(
                  `${day.date}: High temperature (${day.tempMax}°F). Avoid working in direct sunlight and keep surfaces cool.`,
                )
              } else if (day.tempMin < 50) {
                recommendations.push(
                  `${day.date}: Low temperature (${day.tempMin}°F). Some products may not work effectively in colder conditions.`,
                )
              }
            }

            if (detailingType === "interior" || detailingType === "both") {
              // Interior detailing recommendations
              if (day.humidity > 70) {
                recommendations.push(
                  `${day.date}: High humidity (${day.humidity}%). Interior drying times will be extended. Consider using fans or dehumidifiers.`,
                )
              } else if (day.humidity < 30) {
                recommendations.push(
                  `${day.date}: Low humidity (${day.humidity}%). Good for quick drying but may cause static electricity issues.`,
                )
              } else {
                recommendations.push(`${day.date}: Good conditions for interior detailing.`)
              }
            }
          }

          // Overall recommendation
          const goodDays = forecast.filter(
            (day) =>
              (day.condition === "Sunny" || day.condition === "Partly Cloudy") &&
              day.precipProbability < 30 &&
              day.windSpeed < 12 &&
              day.tempMin > 50 &&
              day.tempMax < 90,
          )

          if (goodDays.length > 0) {
            const bestDay = goodDays[0]
            recommendations.unshift(
              `Best day for ${detailingType} detailing: ${bestDay.date} (${bestDay.condition}, ${bestDay.tempMin}-${bestDay.tempMax}°F)`,
            )
          } else {
            recommendations.unshift(
              `No ideal days found in the forecast for ${detailingType} detailing. Consider indoor facilities if available.`,
            )
          }

          return {
            success: true,
            message: `Weather forecast retrieved for ${location}`,
            forecast,
            recommendations,
          }
        } catch (error) {
          console.error("Error checking weather forecast:", error)
          return {
            success: false,
            message: "An error occurred while checking the weather forecast",
          }
        }
      },
    }),

    // Tool to analyze competitors and market trends
    analyzeCompetitors: createTool({
      description: "Analyze competitors and market trends in the auto detailing industry",
      args: z.object({
        location: z.optional(z.string()).describe("Location for market analysis (city or region)"),
        competitorName: z.optional(z.string()).describe("Specific competitor to analyze"),
        analysisType: z
          .enum(["pricing", "services", "marketing", "trends", "full"])
          .describe("Type of analysis to perform"),
        radius: z.optional(z.number()).describe("Radius in miles for local market analysis"),
      }),
      handler: async (
        ctx,
        args,
      ): Promise<{
        success: boolean
        message: string
        analysis?: any
      }> => {
        try {
          // In a real implementation, this would use market research APIs and web scraping
          // For now, we'll simulate the behavior

          const location = args.location || "Local area"
          const radius = args.radius || 10
          const analysisType = args.analysisType

          // Simulated competitor data
          const competitors = [
            {
              name: "Luxury Auto Spa",
              location: "Downtown",
              distance: 3.2,
              pricing: {
                "Basic Wash": "$35-45",
                "Full Detail": "$180-250",
                "Ceramic Coating": "$800-1200",
                "Paint Correction": "$350-500",
              },
              services: [
                "Hand Wash",
                "Interior Detailing",
                "Paint Correction",
                "Ceramic Coating",
                "PPF Installation",
                "Headlight Restoration",
              ],
              strengths: ["Premium brand image", "High-end facility", "Certified technicians"],
              weaknesses: ["Higher prices", "Longer wait times", "Limited availability"],
              marketing: ["Luxury car partnerships", "Social media presence", "Referral program"],
              ratings: { google: 4.7, yelp: 4.5, facebook: 4.6 },
              popularity: "High",
            },
            {
              name: "Quick & Clean Auto Detailing",
              location: "Suburban Mall",
              distance: 5.8,
              pricing: {
                "Basic Wash": "$25-30",
                "Full Detail": "$120-180",
                "Ceramic Coating": "$600-900",
                "Paint Correction": "$250-400",
              },
              services: ["Express Wash", "Interior Cleaning", "Wax Application", "Ceramic Coating", "Odor Removal"],
              strengths: ["Quick service", "Convenient location", "Competitive pricing"],
              weaknesses: ["Inconsistent quality", "Limited premium services", "High staff turnover"],
              marketing: ["Discount coupons", "Mall advertising", "Loyalty program"],
              ratings: { google: 4.2, yelp: 3.9, facebook: 4.1 },
              popularity: "Medium-High",
            },
            {
              name: "EcoDetail",
              location: "West Side",
              distance: 7.3,
              pricing: {
                "Basic Wash": "$30-40",
                "Full Detail": "$150-220",
                "Ceramic Coating": "$750-1100",
                "Paint Correction": "$300-450",
              },
              services: [
                "Eco-Friendly Wash",
                "Interior Detailing",
                "Organic Wax Application",
                "Ceramic Coating",
                "Steam Cleaning",
                "Pet Hair Removal",
              ],
              strengths: ["Eco-friendly products", "Strong online presence", "Unique selling proposition"],
              weaknesses: ["Limited capacity", "Higher prices", "Narrower service range"],
              marketing: ["Environmental focus", "Online content marketing", "Community events"],
              ratings: { google: 4.8, yelp: 4.7, facebook: 4.9 },
              popularity: "Medium",
            },
          ]

          // Market trends data
          const marketTrends = {
            growingServices: [
              {
                name: "Ceramic Coatings",
                growth: "25% year-over-year",
                customerDemand: "High",
                profitMargin: "Very High",
                investmentRequired: "Medium-High",
                notes: "Becoming mainstream rather than luxury-only service",
              },
              {
                name: "Paint Protection Film",
                growth: "30% year-over-year",
                customerDemand: "Medium-High",
                profitMargin: "Very High",
                investmentRequired: "High",
                notes: "Requires specialized training and certification",
              },
              {
                name: "Mobile Detailing",
                growth: "40% year-over-year",
                customerDemand: "High",
                profitMargin: "Medium-High",
                investmentRequired: "Medium",
                notes: "Convenience factor driving strong growth",
              },
            ],
            decliningServices: [
              {
                name: "Traditional Waxing",
                decline: "15% year-over-year",
                customerDemand: "Medium-Low",
                profitMargin: "Medium",
                notes: "Being replaced by ceramic and synthetic sealants",
              },
            ],
            customerPreferences: [
              "Convenience and time-saving options",
              "Eco-friendly and sustainable products",
              "Long-lasting protection solutions",
              "Digital booking and communication",
              "Transparent pricing and processes",
            ],
            technologyTrends: [
              "Mobile booking apps and online scheduling",
              "CRM systems for customer management",
              "Advanced ceramic coating formulations",
              "Steam cleaning technology",
              "Waterless and low-water cleaning solutions",
            ],
            marketChallenges: [
              "Increasing competition",
              "Rising customer expectations",
              "Product and supply costs",
              "Skilled labor shortage",
              "Environmental regulations",
            ],
          }

          // If specific competitor is requested
          if (args.competitorName) {
            const competitor = competitors.find((c) => c.name.toLowerCase() === args.competitorName!.toLowerCase())
            if (!competitor) {
              return {
                success: false,
                message: `Competitor "${args.competitorName}" not found in the database`,
              }
            }

            // Return analysis based on type
            if (analysisType === "pricing" || analysisType === "full") {
              return {
                success: true,
                message: `Analysis for ${competitor.name}`,
                analysis: {
                  competitor,
                  comparisonToMarket: {
                    pricingPosition:
                      competitor.name === "Luxury Auto Spa"
                        ? "Premium"
                        : competitor.name === "Quick & Clean Auto Detailing"
                          ? "Value"
                          : "Mid-range",
                    serviceQuality: competitor.ratings.google > 4.5 ? "High" : "Medium",
                    uniqueSellingPoints: competitor.strengths,
                    recommendations: [
                      "Focus on differentiating your services",
                      "Emphasize quality and value rather than competing solely on price",
                      competitor.name === "Luxury Auto Spa"
                        ? "Consider mid-tier service options"
                        : "Consider premium service options",
                    ],
                  },
                },
              }
            }
          }

          // General market analysis
          let analysis = {}

          // Pricing analysis
          if (analysisType === "pricing" || analysisType === "full") {
            analysis = {
              ...analysis,
              pricingAnalysis: {
                marketAverages: {
                  "Basic Wash": "$25-40",
                  "Full Detail": "$120-250",
                  "Ceramic Coating": "$600-1200",
                  "Paint Correction": "$250-500",
                },
                priceRanges: {
                  budget: {
                    "Basic Wash": "$20-30",
                    "Full Detail": "$100-150",
                    "Ceramic Coating": "$500-700",
                    "Paint Correction": "$200-300",
                  },
                  midRange: {
                    "Basic Wash": "$30-40",
                    "Full Detail": "$150-200",
                    "Ceramic Coating": "$700-900",
                    "Paint Correction": "$300-400",
                  },
                  premium: {
                    "Basic Wash": "$40-50",
                    "Full Detail": "$200-300",
                    "Ceramic Coating": "$900-1500",
                    "Paint Correction": "$400-600",
                  },
                },
                pricingSensitivity: "Medium-High",
                recommendations: [
                  "Price based on value delivered rather than competing on cost",
                  "Consider tiered service packages to capture different market segments",
                  "Highlight the value proposition for premium services",
                  "Offer seasonal promotions rather than permanent discounts",
                ],
              },
            }
          }

          // Services analysis
          if (analysisType === "services" || analysisType === "full") {
            analysis = {
              ...analysis,
              servicesAnalysis: {
                mostCommonServices: [
                  "Basic Wash",
                  "Interior Detailing",
                  "Wax/Sealant Application",
                  "Ceramic Coating",
                  "Paint Correction",
                ],
                serviceGaps: [
                  "Specialized services for electric vehicles",
                  "Subscription-based maintenance plans",
                  "Leather restoration and dyeing",
                  "Headlight restoration",
                  "Wheel refinishing",
                ],
                highMarginServices: [
                  "Ceramic Coating",
                  "Paint Protection Film",
                  "Paint Correction",
                  "Odor Removal",
                  "Headlight Restoration",
                ],
                recommendations: [
                  "Focus on high-margin services that competitors aren't emphasizing",
                  "Consider adding specialized services for luxury or electric vehicles",
                  "Develop service packages that combine popular and high-margin services",
                  "Implement a subscription model for recurring maintenance",
                ],
              },
            }
          }

          // Marketing analysis
          if (analysisType === "marketing" || analysisType === "full") {
            analysis = {
              ...analysis,
              marketingAnalysis: {
                effectiveChannels: [
                  "Social media (especially Instagram and Facebook)",
                  "Local SEO and Google Business Profile",
                  "Email marketing to existing customers",
                  "Partnerships with auto dealerships and repair shops",
                  "Before/after content marketing",
                ],
                competitorStrategies: competitors.map((c) => ({
                  name: c.name,
                  strategies: c.marketing,
                  effectiveness: c.popularity,
                })),
                marketingGaps: [
                  "Educational content marketing",
                  "Customer loyalty programs",
                  "Targeted social media advertising",
                  "Video content showing processes and results",
                  "Local community involvement",
                ],
                recommendations: [
                  "Develop a strong before/after portfolio for social media",
                  "Implement a referral program for existing customers",
                  "Create educational content about detailing benefits",
                  "Partner with complementary local businesses",
                  "Invest in professional photography of completed work",
                ],
              },
            }
          }

          // Market trends analysis
          if (analysisType === "trends" || analysisType === "full") {
            analysis = {
              ...analysis,
              trendsAnalysis: marketTrends,
              recommendations: [
                "Invest in training for ceramic coating application",
                "Consider adding mobile detailing services",
                "Develop eco-friendly service options",
                "Implement online booking and digital communication",
                "Focus marketing on long-term protection benefits",
              ],
            }
          }

          // Full analysis includes competitor comparison
          if (analysisType === "full") {
            analysis = {
              ...analysis,
              competitorAnalysis: {
                competitors: competitors.map((c) => ({
                  name: c.name,
                  location: c.location,
                  distance: c.distance,
                  strengths: c.strengths,
                  weaknesses: c.weaknesses,
                  ratings: c.ratings,
                  popularity: c.popularity,
                })),
                competitiveLandscape: {
                  totalCompetitors: competitors.length + Math.floor(Math.random() * 5),
                  marketSaturation: "Medium",
                  barriers: ["Initial equipment investment", "Technical expertise", "Customer acquisition"],
                  opportunities: [
                    "Specialization in high-end services",
                    "Mobile services for convenience",
                    "Eco-friendly positioning",
                    "Subscription-based recurring services",
                  ],
                },
              },
              swotAnalysis: {
                strengths: [
                  "Specialized knowledge and expertise",
                  "Quality of service",
                  "Customer relationships",
                  "Location and facilities",
                ],
                weaknesses: [
                  "Limited market awareness",
                  "Scaling challenges",
                  "Seasonal demand fluctuations",
                  "Staff training and retention",
                ],
                opportunities: [
                  "Growing interest in vehicle protection",
                  "Increasing average vehicle prices",
                  "Rising consumer spending on vehicle maintenance",
                  "New vehicle technologies requiring specialized care",
                ],
                threats: [
                  "Increasing competition",
                  "DIY products and information",
                  "Economic downturns affecting discretionary spending",
                  "Rising costs of supplies and labor",
                ],
              },
            }
          }

          return {
            success: true,
            message: `${analysisType === "full" ? "Comprehensive" : analysisType} market analysis for ${location} (${radius} mile radius)`,
            analysis,
          }
        } catch (error) {
          console.error("Error analyzing competitors:", error)
          return {
            success: false,
            message: "An error occurred while analyzing competitors and market trends",
          }
        }
      },
    }),
  },

  // Configure context options for message history
  contextOptions: {
    includeToolCalls: true,
    recentMessages: 10,
    searchOtherThreads: false,
    searchOptions: {
      limit: 50,
      textSearch: true,
      vectorSearch: true,
      messageRange: { before: 1, after: 1 },
    },
  },

  // Configure storage options
  storageOptions: {
    saveAllInputMessages: true,
    saveOutputMessages: true,
  },

  // Set execution limits
  maxSteps: 5,
  maxRetries: 3,
})

// Create a thread for the user
export const createThread = mutation({
  args: {
    title: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ threadId: string }> => {
    const { threadId } = await autoDetailingAgent.createThreadMutation()(ctx, {
      title: args.title,
      userId: args.userId,
    })

    return { threadId }
  },
})

// Send a message to the agent and get a response
export const sendMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ text: string; messageId: string }> => {
    // Store the user query for analytics
    await ctx.runMutation(internal.embeddings.storeUserQuery, {
      userId: args.userId,
      threadId: args.threadId,
      query: args.message,
      category: "user_query",
      timestamp: getCurrentTimestamp(),
    })

    const { thread } = await autoDetailingAgent.continueThread(ctx, {
      threadId: args.threadId,
      userId: args.userId,
    })

    const result = await thread.generateText({
      prompt: args.message,
    })

    return {
      text: result.text,
      messageId: result.messageId,
    }
  },
})

// Get thread history
export const getThreadHistory = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.runQuery(components.agent.messages.getThreadMessages, {
      threadId: args.threadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: 100 },
    })

    return messages
  },
})

// Save user feedback on agent responses
export const saveUserFeedback = mutation({
  args: {
    userId: v.optional(v.string()),
    threadId: v.string(),
    messageId: v.string(),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Update the user query with feedback
    const userQuery = await ctx.db
      .query("userQueries")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .first()

    if (userQuery) {
      await ctx.db.patch(userQuery._id, {
        responseQuality: args.rating,
      })
    }

    // Store feedback in the agent system
    await autoDetailingAgent.rateMutation()(ctx, {
      messageId: args.messageId,
      rating: args.rating,
      feedback: args.feedback,
    })

    return { success: true }
  },
})

// Get similar questions that users have asked
export const getSimilarQuestions = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{ query: string; relevanceScore: number }>> => {
    const similarQueries = await ctx.runAction(internal.embeddings.findSimilarQueries, {
      query: args.query,
      limit: args.limit || 5,
    })

    return similarQueries
      .filter((q) => q.relevanceScore > 0.7) // Only return highly relevant queries
      .map((q) => ({
        query: q.query,
        relevanceScore: q.relevanceScore,
      }))
  },
})

// Generate text without creating a thread (one-off interaction)
export const generateOneOffResponse = action({
  args: {
    prompt: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ text: string }> => {
    const result = await autoDetailingAgent.generateText(ctx, { userId: args.userId }, { prompt: args.prompt })
    return { text: result.text }
  },
})

// Expose the agent as an action for use in workflows
export const autoDetailingAgentStep = autoDetailingAgent.asAction({ maxSteps: 5 })

// Search for messages across threads
export const searchMessages = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.runQuery(components.agent.messages.searchMessages, {
      query: args.query,
      limit: args.limit || 10,
      textSearch: true,
      vectorSearch: true,
    })

    return messages
  },
})

// Save custom messages to a thread
export const saveCustomMessages = mutation({
  args: {
    threadId: v.string(),
    userId: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const formattedMessages = args.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const savedMessages = await autoDetailingAgent.saveMessages(ctx, {
      threadId: args.threadId,
      userId: args.userId,
      messages: formattedMessages,
    })

    return savedMessages
  },
})
