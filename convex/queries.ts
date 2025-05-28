import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * Get all car makes
 */
export const getCarMakes = query({
  args: {},
  handler: async (ctx) => {
    const makes = await ctx.db.query("carMakes").collect()
    return makes
  },
})

/**
 * Get car models for a specific make
 */
export const getCarModels = query({
  args: {
    makeId: v.id("carMakes"),
  },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query("carModels")
      .withIndex("by_makeId", (q) => q.eq("makeId", args.makeId))
      .collect()

    return models
  },
})

/**
 * Get seeding logs
 */
export const getSeedingLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    const logs = await ctx.db.query("seedingLogs").order("desc").take(limit)

    return logs
  },
})

/**
 * Get seeding status summary
 */
export const getSeedingStatus = query({
  args: {},
  handler: async (ctx) => {
    // Get counts of data in each table
    const makeCount = await ctx.db.query("carMakes").count()
    const modelCount = await ctx.db.query("carModels").count()
    const productCount = await ctx.db.query("products").count()
    const techniqueCount = await ctx.db
      .query("knowledgeBase")
      .filter((q) => q.eq(q.field("category"), "technique"))
      .count()

    // Get the latest seeding log
    const latestLog = await ctx.db.query("seedingLogs").order("desc").first()

    return {
      counts: {
        makes: makeCount,
        models: modelCount,
        products: productCount,
        techniques: techniqueCount,
      },
      lastSeeded: latestLog?.endTime || null,
      status: latestLog?.status || "unknown",
    }
  },
})
