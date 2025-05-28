import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Add a vehicle
export const addVehicle = mutation({
  args: {
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vehicleId = await ctx.db.insert("vehicles", {
      userId: args.userId,
      make: args.make,
      model: args.model,
      year: args.year,
      color: args.color,
      vin: args.vin,
      licensePlate: args.licensePlate,
      notes: args.notes,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    })

    return vehicleId
  },
})

// Get vehicle data for a user
export const getVehicleData = query({
  args: {
    userId: v.optional(v.string()),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    // If vehicleId is provided, get that specific vehicle
    if (args.vehicleId) {
      const vehicle = await ctx.db.get(args.vehicleId)
      if (!vehicle) {
        throw new Error("Vehicle not found")
      }

      // Get the last detailing record
      const detailingRecords = await ctx.db
        .query("detailingRecords")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
        .order("desc")
        .take(1)

      const lastDetailingDate = detailingRecords.length > 0 ? detailingRecords[0].date : null

      // Get the last condition assessment
      const conditionAssessments = await ctx.db
        .query("conditionAssessments")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
        .order("desc")
        .take(1)

      const detailingScore = conditionAssessments.length > 0 ? conditionAssessments[0].overallScore : 75

      // Get recommendations
      const recommendations = await ctx.db
        .query("vehicleRecommendations")
        .withIndex("by_vehicle", (q) => q.eq("make", vehicle.make).eq("model", vehicle.model))
        .collect()

      // Filter recommendations by year
      const filteredRecommendations = recommendations.filter(
        (rec) => vehicle.year >= rec.yearRange[0] && vehicle.year <= rec.yearRange[1],
      )

      // Format recommendations
      const formattedRecommendations = filteredRecommendations.map((rec, index) => ({
        id: index + 1,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 weeks from now
      }))

      // Get service history
      const history = await ctx.db
        .query("detailingRecords")
        .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
        .order("desc")
        .collect()

      const formattedHistory = history.map((record, index) => ({
        id: index + 1,
        date: record.date,
        service: record.service,
        notes: record.notes || "",
      }))

      return {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        lastDetailing: lastDetailingDate,
        detailingScore,
        recommendations: formattedRecommendations.slice(0, 3), // Top 3 recommendations
        history: formattedHistory,
      }
    }

    // If userId is provided, get all vehicles for that user
    if (args.userId) {
      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect()

      return vehicles.map((vehicle) => ({
        id: vehicle._id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
      }))
    }

    // If neither is provided, return mock data
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

// Update a vehicle
export const updateVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { vehicleId, ...updates } = args

    // Check if vehicle exists
    const vehicle = await ctx.db.get(vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Add lastUpdated timestamp
    const updatedFields = {
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    // Update the vehicle
    await ctx.db.patch(vehicleId, updatedFields)

    return vehicleId
  },
})

// Delete a vehicle
export const deleteVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Check if vehicle exists
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Delete the vehicle
    await ctx.db.delete(args.vehicleId)

    return { success: true }
  },
})

// Add a detailing record
export const addDetailingRecord = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    userId: v.string(),
    service: v.string(),
    date: v.string(),
    price: v.optional(v.number()),
    staffId: v.optional(v.string()),
    notes: v.optional(v.string()),
    products: v.optional(v.array(v.id("products"))),
    beforeImages: v.optional(v.array(v.string())),
    afterImages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if vehicle exists
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    const recordId = await ctx.db.insert("detailingRecords", {
      vehicleId: args.vehicleId,
      userId: args.userId,
      service: args.service,
      date: args.date,
      price: args.price,
      staffId: args.staffId,
      notes: args.notes,
      products: args.products,
      beforeImages: args.beforeImages,
      afterImages: args.afterImages,
      createdAt: new Date().toISOString(),
    })

    // If products were used, record their usage
    if (args.products && args.products.length > 0) {
      for (const productId of args.products) {
        await ctx.db.insert("productUsage", {
          vehicleId: args.vehicleId,
          productId,
          detailingRecordId: recordId,
          date: args.date,
          quantity: 1, // Default quantity
          createdAt: new Date().toISOString(),
        })
      }
    }

    return recordId
  },
})

// Get detailing records for a vehicle
export const getDetailingRecords = query({
  args: {
    vehicleId: v.id("vehicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    const records = await ctx.db
      .query("detailingRecords")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .take(limit)

    return records
  },
})

// Get all vehicles for a user with summary data
export const getUserVehicles = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    const vehiclesWithData = await Promise.all(
      vehicles.map(async (vehicle) => {
        // Get the last detailing record
        const detailingRecords = await ctx.db
          .query("detailingRecords")
          .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
          .order("desc")
          .take(1)

        const lastDetailingDate = detailingRecords.length > 0 ? detailingRecords[0].date : null

        // Get the last condition assessment
        const conditionAssessments = await ctx.db
          .query("conditionAssessments")
          .withIndex("by_vehicleId", (q) => q.eq("vehicleId", vehicle._id))
          .order("desc")
          .take(1)

        const detailingScore = conditionAssessments.length > 0 ? conditionAssessments[0].overallScore : 75

        return {
          id: vehicle._id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          vin: vehicle.vin,
          licensePlate: vehicle.licensePlate,
          lastDetailingDate,
          detailingScore,
          nextServiceDue: lastDetailingDate
            ? new Date(new Date(lastDetailingDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : null,
        }
      }),
    )

    return vehiclesWithData
  },
})
