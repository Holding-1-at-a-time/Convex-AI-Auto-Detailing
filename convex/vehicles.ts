import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getCurrentTimestamp, formatDate } from "./utils"
import { internal } from "./_generated/api"

// Define the vehicle schema
export const addVehicle = mutation({
  args: {
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    vin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate year
    const currentYear = new Date().getFullYear()
    if (args.year < 1900 || args.year > currentYear + 1) {
      throw new Error(`Year must be between 1900 and ${currentYear + 1}`)
    }

    // Check if VIN is provided and unique
    if (args.vin) {
      const existingVehicle = await ctx.db
        .query("vehicles")
        .filter((q) => q.eq(q.field("vin"), args.vin))
        .first()

      if (existingVehicle) {
        throw new Error("A vehicle with this VIN already exists")
      }
    }

    const vehicleId = await ctx.db.insert("vehicles", {
      userId: args.userId,
      make: args.make,
      model: args.model,
      year: args.year,
      color: args.color,
      notes: args.notes,
      vin: args.vin,
      createdAt: getCurrentTimestamp(),
      lastDetailingDate: null,
      detailingScore: 100, // Start with perfect score
    })

    return vehicleId
  },
})

// Update vehicle information
export const updateVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    vin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId)

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Validate year if provided
    if (args.year) {
      const currentYear = new Date().getFullYear()
      if (args.year < 1900 || args.year > currentYear + 1) {
        throw new Error(`Year must be between 1900 and ${currentYear + 1}`)
      }
    }

    // Check if VIN is provided and unique
    if (args.vin && args.vin !== vehicle.vin) {
      const existingVehicle = await ctx.db
        .query("vehicles")
        .filter((q) => q.eq(q.field("vin"), args.vin))
        .first()

      if (existingVehicle) {
        throw new Error("A vehicle with this VIN already exists")
      }
    }

    // Update only the provided fields
    const updates: any = {}
    if (args.make !== undefined) updates.make = args.make
    if (args.model !== undefined) updates.model = args.model
    if (args.year !== undefined) updates.year = args.year
    if (args.color !== undefined) updates.color = args.color
    if (args.notes !== undefined) updates.notes = args.notes
    if (args.vin !== undefined) updates.vin = args.vin

    await ctx.db.patch(args.vehicleId, updates)

    return args.vehicleId
  },
})

// Delete a vehicle and all associated records
export const deleteVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId)

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Delete detailing records
    const detailingRecords = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    for (const record of detailingRecords) {
      await ctx.db.delete(record._id)
    }

    // Delete product usage records
    const productUsageRecords = await ctx.db
      .query("productUsage")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    for (const record of productUsageRecords) {
      await ctx.db.delete(record._id)
    }

    // Delete condition assessments
    const conditionAssessments = await ctx.db
      .query("conditionAssessments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    for (const assessment of conditionAssessments) {
      await ctx.db.delete(assessment._id)
    }

    // Delete the vehicle
    await ctx.db.delete(args.vehicleId)

    return { success: true }
  },
})

// Get all vehicles for a user
export const getUserVehicles = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    return vehicles
  },
})

// Get vehicle data with history and recommendations
export const getVehicleData = query({
  args: {
    vehicleId: v.optional(v.id("vehicles")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If no vehicleId is provided but userId is, get the user's most recent vehicle
    let vehicleId = args.vehicleId
    if (!vehicleId && args.userId) {
      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(1)

      if (vehicles.length > 0) {
        vehicleId = vehicles[0]._id
      }
    }

    // If we have a vehicleId, get the real data
    if (vehicleId) {
      const vehicle = await ctx.db.get(vehicleId)

      if (!vehicle) {
        throw new Error("Vehicle not found")
      }

      // Get detailing history
      const history = await ctx.db
        .query("detailingRecords")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
        .order("desc")
        .collect()

      // Get the latest condition assessment
      const latestAssessment = await ctx.db
        .query("conditionAssessments")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicleId))
        .order("desc")
        .first()

      // Get recommendations
      const recommendations = await ctx.runAction(internal.recommendations.generateRecommendations, {
        vehicleId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        lastDetailingDate: vehicle.lastDetailingDate || vehicle.createdAt,
        currentScore: latestAssessment?.overallScore || vehicle.detailingScore,
      })

      return {
        ...vehicle,
        detailingScore: latestAssessment?.overallScore || vehicle.detailingScore,
        lastDetailing: vehicle.lastDetailingDate ? formatDate(vehicle.lastDetailingDate) : null,
        recommendations,
        history: history.map((record) => ({
          id: record._id,
          date: formatDate(record.date),
          service: record.service,
          notes: record.notes || "",
        })),
      }
    }

    // Return mock data if no vehicle is found
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
    products: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId)

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Validate date
    const recordDate = new Date(args.date)
    if (isNaN(recordDate.getTime())) {
      throw new Error("Invalid date format")
    }

    // Create the detailing record
    const recordId = await ctx.db.insert("detailingRecords", {
      vehicleId: args.vehicleId,
      service: args.service,
      date: args.date,
      notes: args.notes,
      createdAt: getCurrentTimestamp(),
    })

    // Update the vehicle's last detailing date
    await ctx.db.patch(args.vehicleId, {
      lastDetailingDate: args.date,
    })

    // Add product usage records if products were used
    if (args.products && args.products.length > 0) {
      for (const productId of args.products) {
        await ctx.db.insert("productUsage", {
          vehicleId: args.vehicleId,
          productId,
          date: args.date,
          createdAt: getCurrentTimestamp(),
        })
      }
    }

    // Create a condition assessment if it's a full detailing service
    if (args.service.toLowerCase().includes("full") || args.service.toLowerCase().includes("complete")) {
      await ctx.db.insert("conditionAssessments", {
        vehicleId: args.vehicleId,
        date: args.date,
        overallScore: 95, // High score after full detailing
        exteriorScore: 95,
        interiorScore: 95,
        notes: "Assessment after full detailing service",
        createdAt: getCurrentTimestamp(),
      })
    }

    return recordId
  },
})

// Get detailing records for a vehicle
export const getDetailingRecords = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect()

    return records
  },
})

// Add a condition assessment
export const addConditionAssessment = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    overallScore: v.number(),
    exteriorScore: v.number(),
    interiorScore: v.number(),
    notes: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId)

    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Validate scores
    if (
      args.overallScore < 0 ||
      args.overallScore > 100 ||
      args.exteriorScore < 0 ||
      args.exteriorScore > 100 ||
      args.interiorScore < 0 ||
      args.interiorScore > 100
    ) {
      throw new Error("Scores must be between 0 and 100")
    }

    // Create the assessment
    const assessmentId = await ctx.db.insert("conditionAssessments", {
      vehicleId: args.vehicleId,
      date: getCurrentTimestamp(),
      overallScore: args.overallScore,
      exteriorScore: args.exteriorScore,
      interiorScore: args.interiorScore,
      notes: args.notes,
      imageUrls: args.imageUrls,
      createdAt: getCurrentTimestamp(),
    })

    // Update the vehicle's detailing score
    await ctx.db.patch(args.vehicleId, {
      detailingScore: args.overallScore,
    })

    return assessmentId
  },
})

// Get condition assessments for a vehicle
export const getConditionAssessments = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("conditionAssessments")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect()

    return assessments
  },
})
