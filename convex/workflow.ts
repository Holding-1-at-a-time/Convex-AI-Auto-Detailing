import { v } from "convex/values"
import { action } from "./_generated/server"
import { WorkflowManager } from "@convex-dev/workflow"
import { components } from "./_generated/api"
import { internal } from "./_generated/api"

// Create a workflow manager
const workflow = new WorkflowManager(components.workflow)

// Define a workflow for the auto detailing assistant
export const autoDetailingWorkflow = workflow.define({
  args: {
    prompt: v.string(),
    userId: v.string(),
    threadId: v.string(),
    vehicleId: v.optional(v.string()),
  },
  handler: async (step, { prompt, userId, threadId, vehicleId }): Promise<{ response: string }> => {
    // Step 1: Get vehicle data if available
    let vehicleData = null
    if (vehicleId) {
      vehicleData = await step.runQuery(internal.vehicles.getVehicleData, {
        userId,
        vehicleId,
      })
    }

    // Step 2: Generate a response using the agent
    const agentResponse = await step.runAction(internal.agent.autoDetailingAgentStep, {
      threadId,
      userId,
      generateText: {
        prompt,
        context: vehicleData ? `User has a ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}` : undefined,
      },
    })

    // Step 3: If vehicle data is available, generate recommendations
    let recommendations = []
    if (vehicleData && vehicleId) {
      recommendations = await step.runAction(internal.recommendations.generateRecommendations, {
        vehicleId,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        lastDetailingDate: vehicleData.lastDetailing,
        currentScore: vehicleData.detailingScore,
      })
    }

    // Step 4: Save the recommendations to the thread if available
    if (recommendations.length > 0) {
      await step.runMutation(internal.agent.saveCustomMessages, {
        threadId,
        userId,
        messages: [
          {
            role: "system",
            content: `Generated recommendations: ${JSON.stringify(recommendations)}`,
          },
        ],
      })
    }

    // Return the agent's response
    return { response: agentResponse.text }
  },
})

// Start the auto detailing workflow
export const startAutoDetailingWorkflow = action({
  args: {
    prompt: v.string(),
    userId: v.string(),
    threadId: v.string(),
    vehicleId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const { workflowId } = await ctx.runAction(workflow.start, {
      name: "autoDetailingWorkflow",
      args: {
        prompt: args.prompt,
        userId: args.userId,
        threadId: args.threadId,
        vehicleId: args.vehicleId,
      },
    })

    return { workflowId }
  },
})

// Get workflow status
export const getWorkflowStatus = action({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.runAction(workflow.getStatus, {
      workflowId: args.workflowId,
    })

    return status
  },
})
