import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Define the vehicle schema
export const addVehicle = mutation({
  args: {
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vehicleId = await ctx.db.insert("vehicles", {
      userId: args.userId,
      make: args.make,
      model: args.model,
      year: args.year,
      color: args.color,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    return vehicleId
  },
})

// Get vehicle data for a user
export const getVehicleData = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query the database
    // For now, we'll return mock data
    return {
      make: "Toyota",
      model: "Camry",
      year: 2022,
      lastDetailing: "2025-04-15",
      detailingScore: 85,
      recommendations: [
        { id: 1, title: "Wax exterior", priority: "high", dueDate: "2025-05-30" },
        { id: 2, title: "Clean interior vents", priority: "medium", dueDate: "2025-06-15" },
        { id: 3, title: "Replace cabin air filter", priority: "low", dueDate: "2025-07-01" },
      ],
      history: [
        { id: 1, date: "2025-04-15", service: "Full Detailing", notes: "Complete interior and exterior detailing" },
        { id: 2, date: "2025-03-01", service: "Wash & Wax", notes: "Basic wash and wax service" },
        { id: 3, date: "2025-02-01", service: "Interior Cleaning", notes: "Vacuum and dashboard cleaning" },
      ],
    }
  },
})

// Add a detailing record
export const addDetailingRecord = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    service: v.string(),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("detailingRecords", {
      vehicleId: args.vehicleId,
      service: args.service,
      date: args.date,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    return recordId
  },
})
