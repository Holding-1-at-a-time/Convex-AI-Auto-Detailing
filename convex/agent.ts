import { v } from "convex/values"
import { action, mutation, query } from "./_generated/server"
import { Agent, createTool } from "@convex-dev/agent"
import { openai } from "@ai-sdk/openai"
import { components } from "./_generated/api"
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
    // Tool to look up vehicle-specific detailing recommendations
    vehicleRecommendations: createTool({
      description: "Get detailing recommendations for a specific vehicle make, model, and year",
      args: z.object({
        make: z.string().describe("The make of the vehicle"),
        model: z.string().describe("The model of the vehicle"),
        year: z.number().describe("The year of the vehicle"),
      }),
      handler: async (ctx, args): Promise<{ recommendations: string[] }> => {
        // In a real implementation, this would query a database of vehicle-specific recommendations
        // For now, we'll return some generic recommendations
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
      }),
      handler: async (ctx, args): Promise<{ score: number; analysis: string }> => {
        // Calculate days since last detailing
        const lastDetailingDate = new Date(args.lastDetailingDate)
        const currentDate = new Date()
        const daysSinceLastDetailing = Math.floor(
          (currentDate.getTime() - lastDetailingDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        // Calculate condition score (simple algorithm for demo)
        let score = 100

        // Reduce score based on days since last detailing
        if (daysSinceLastDetailing > 90) {
          score -= 20
        } else if (daysSinceLastDetailing > 30) {
          score -= 10
        }

        // Reduce score based on number of issues
        score -= args.currentIssues.length * 5

        // Ensure score is between 0 and 100
        score = Math.max(0, Math.min(100, score))

        return {
          score,
          analysis: `Your vehicle was last detailed ${daysSinceLastDetailing} days ago and has ${args.currentIssues.length} reported issues. Based on this data, your vehicle's condition score is ${score}/100.`,
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
        // In a real implementation, this would use ML to generate a personalized plan
        // For now, we'll return a simple plan based on the inputs

        const plan = [
          `Step 1: Initial rinse (15 minutes)`,
          `Step 2: Apply soap and wash exterior (30 minutes)`,
          `Step 3: Clean wheels and tires (20 minutes)`,
          `Step 4: Rinse and dry exterior (20 minutes)`,
          `Step 5: Clean interior surfaces (45 minutes)`,
          `Step 6: Vacuum interior (20 minutes)`,
          `Step 7: Apply protectants to surfaces (30 minutes)`,
        ]

        // Adjust plan based on time available
        if (args.timeAvailable < 3) {
          return {
            plan: plan.slice(0, 4),
          }
        }

        return { plan }
      },
    }),
  },
  maxSteps: 5, // Allow multiple tool calls in a single conversation turn
})

// Create a thread for the user
export const createThread = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = await autoDetailingAgent.createThreadMutation()(ctx, {
      title: args.title,
    })

    return { threadId }
  },
})

// Send a message to the agent and get a response
export const sendMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread } = await autoDetailingAgent.continueThread(ctx, {
      threadId: args.threadId,
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
