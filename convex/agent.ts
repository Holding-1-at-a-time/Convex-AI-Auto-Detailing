import { v } from "convex/values"
import { action, mutation, query } from "./_generated/server"
import { Agent, createTool } from "@convex-dev/agent"
import { openai } from "@ai-sdk/openai"
import { components } from "./_generated/api"
import { internal } from "./_generated/api"
import { z } from "zod"

// Create the auto detailing agent
const autoDetailingAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: `
    You are an AI-powered auto detailing assistant. You help users with:
    
    1. Providing detailed advice on car cleaning and maintenance
    2. Recommending products and techniques for specific vehicle issues
    3. Creating personalized detailing plans based on vehicle type, condition, and owner preferences
    4. Offering predictive maintenance insights based on vehicle data and usage patterns
    5. Answering questions about auto detailing best practices
    
    Be helpful, informative, and provide specific actionable advice. When recommending products,
    explain why they're suitable for the specific situation.
  `,
  tools: {
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
        limit: z.optional(z.number()).describe("Maximum number of results to return"),
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
  },
  maxSteps: 5, // Allow multiple tool calls in a single conversation turn
})

// Create a thread for the user
export const createThread = mutation({
  args: {
    title: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
    // Store the user query for analytics
    await ctx.runMutation(internal.embeddings.storeUserQuery, {
      userId: args.userId,
      threadId: args.threadId,
      query: args.message,
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
    const messages = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
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
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
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
