import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create a service package
export const createServicePackage = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(), // "basic", "standard", "premium", "custom"
    services: v.array(v.string()),
    price: v.number(),
    duration: v.number(), // In minutes
    popularityRank: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if service package with this name already exists
    const existingPackage = await ctx.db
      .query("servicePackages")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existingPackage) {
      throw new Error("A service package with this name already exists")
    }

    // Create the service package
    const packageId = await ctx.db.insert("servicePackages", {
      name: args.name,
      description: args.description,
      category: args.category,
      services: args.services,
      price: args.price,
      duration: args.duration,
      active: true,
      popularityRank: args.popularityRank,
      createdAt: new Date().toISOString(),
    })

    return packageId
  },
})

// Update a service package
export const updateServicePackage = mutation({
  args: {
    packageId: v.id("servicePackages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
    price: v.optional(v.number()),
    duration: v.optional(v.number()),
    active: v.optional(v.boolean()),
    popularityRank: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { packageId, ...updates } = args

    // Check if service package exists
    const servicePackage = await ctx.db.get(packageId)
    if (!servicePackage) {
      throw new Error("Service package not found")
    }

    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== servicePackage.name) {
      const existingPackage = await ctx.db
        .query("servicePackages")
        .filter((q) => q.eq(q.field("name"), updates.name))
        .first()

      if (existingPackage) {
        throw new Error("A service package with this name already exists")
      }
    }

    // Add updatedAt timestamp
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update the service package
    await ctx.db.patch(packageId, updatedFields)

    return packageId
  },
})

// Get all service packages
export const getAllServicePackages = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("servicePackages")

    // Filter by active status if requested
    if (args.activeOnly) {
      query = query.withIndex("by_active", (q) => q.eq("active", true))
    }

    // Filter by category if provided
    if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category))
    }

    // Get all packages
    const packages = await query.collect()

    // Sort by popularity rank if available, otherwise by name
    packages.sort((a, b) => {
      if (a.popularityRank !== undefined && b.popularityRank !== undefined) {
        return a.popularityRank - b.popularityRank
      }
      return a.name.localeCompare(b.name)
    })

    return packages
  },
})

// Get a specific service package
export const getServicePackage = query({
  args: {
    packageId: v.id("servicePackages"),
  },
  handler: async (ctx, args) => {
    const servicePackage = await ctx.db.get(args.packageId)
    if (!servicePackage) {
      throw new Error("Service package not found")
    }

    return servicePackage
  },
})

// Get service package usage statistics
export const getServicePackageUsage = query({
  args: {
    packageId: v.optional(v.id("servicePackages")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Set default date range if not provided (last 6 months)
    const endDate = args.endDate || new Date().toISOString().split("T")[0]
    const startDate =
      args.startDate ||
      (() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 6)
        return date.toISOString().split("T")[0]
      })()

    // Get all service packages
    const servicePackages = args.packageId
      ? [await ctx.db.get(args.packageId)].filter(Boolean)
      : await ctx.db.query("servicePackages").collect()

    // Get all appointments in the date range
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect()

    // Count usage for each package
    const packageUsage = servicePackages.map((pkg) => {
      const packageAppointments = appointments.filter((a) => a.serviceType === pkg.name)
      const totalRevenue = packageAppointments.reduce((sum, a) => sum + (a.price || 0), 0)
      const uniqueCustomers = new Set(packageAppointments.map((a) => a.customerId)).size

      // Group by month for trend data
      const usageByMonth: Record<string, number> = {}
      for (const appointment of packageAppointments) {
        const month = appointment.date.substring(0, 7) // YYYY-MM
        usageByMonth[month] = (usageByMonth[month] || 0) + 1
      }

      // Format trend data
      const trendData = Object.entries(usageByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        packageId: pkg._id,
        name: pkg.name,
        category: pkg.category,
        bookingCount: packageAppointments.length,
        revenue: totalRevenue,
        uniqueCustomers,
        averagePrice: packageAppointments.length > 0 ? totalRevenue / packageAppointments.length : 0,
        trendData,
      }
    })

    // Sort by booking count (highest first)
    packageUsage.sort((a, b) => b.bookingCount - a.bookingCount)

    return {
      startDate,
      endDate,
      packageUsage,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Calculate service package price for a vehicle
export const calculatePackagePrice = query({
  args: {
    packageId: v.id("servicePackages"),
    vehicleType: v.string(), // "sedan", "suv", "truck", "van", "luxury", "exotic"
    addOns: v.optional(v.array(v.string())),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the service package
    const servicePackage = await ctx.db.get(args.packageId)
    if (!servicePackage) {
      throw new Error("Service package not found")
    }

    // Base price from package
    const basePrice = servicePackage.price

    // Apply vehicle type adjustments
    const vehicleMultipliers = {
      sedan: 1.0,
      suv: 1.2,
      truck: 1.3,
      van: 1.3,
      luxury: 1.5,
      exotic: 2.0,
    }

    const vehicleMultiplier = vehicleMultipliers[args.vehicleType] || 1.0
    const vehicleAdjustedPrice = basePrice * vehicleMultiplier

    // Calculate add-on prices
    let addOnTotal = 0
    const addOnPrices: Record<string, number> = {}

    if (args.addOns && args.addOns.length > 0) {
      // Define add-on pricing
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

      for (const addOn of args.addOns) {
        const addOnLower = addOn.toLowerCase()
        if (addOnPricing[addOnLower]) {
          addOnPrices[addOn] = addOnPricing[addOnLower]
          addOnTotal += addOnPricing[addOnLower]
        }
      }
    }

    // Calculate subtotal
    const subtotal = vehicleAdjustedPrice + addOnTotal

    // Apply promotion if provided
    let discount = 0
    let promoDetails = null

    if (args.promoCode) {
      // Get the promotion
      const promotion = await ctx.db
        .query("promotions")
        .withIndex("by_code", (q) => q.eq("code", args.promoCode))
        .first()

      if (promotion && promotion.active) {
        // Check if promotion is applicable to this service
        const isApplicable =
          !promotion.applicableServices ||
          promotion.applicableServices.length === 0 ||
          promotion.applicableServices.includes(servicePackage.name)

        if (isApplicable) {
          // Check minimum purchase
          if (!promotion.minPurchase || subtotal >= promotion.minPurchase) {
            // Calculate discount
            if (promotion.type === "percentage") {
              discount = subtotal * (promotion.value / 100)
              promoDetails = {
                code: promotion.code,
                description: promotion.description,
                discountType: "percentage",
                value: promotion.value,
              }
            } else if (promotion.type === "fixed") {
              discount = Math.min(promotion.value, subtotal)
              promoDetails = {
                code: promotion.code,
                description: promotion.description,
                discountType: "fixed",
                value: promotion.value,
              }
            }
          }
        }
      }
    }

    // Calculate final price
    const finalPrice = Math.max(0, subtotal - discount)

    // Calculate estimated duration
    const baseDuration = servicePackage.duration

    // Add time for add-ons
    let additionalTime = 0
    if (args.addOns && args.addOns.length > 0) {
      const addOnDurations = {
        "engine detailing": 30,
        "headlight restoration": 30,
        "paint correction": 120,
        "ceramic coating": 180,
        "leather treatment": 30,
        "odor removal": 30,
        "pet hair removal": 30,
        "stain removal": 30,
      }

      for (const addOn of args.addOns) {
        const addOnLower = addOn.toLowerCase()
        if (addOnDurations[addOnLower]) {
          additionalTime += addOnDurations[addOnLower]
        }
      }
    }

    // Adjust duration for vehicle type
    const vehicleDurationMultiplier = {
      sedan: 1.0,
      suv: 1.2,
      truck: 1.3,
      van: 1.3,
      luxury: 1.2,
      exotic: 1.5,
    }

    const totalDuration = Math.round(
      baseDuration * (vehicleDurationMultiplier[args.vehicleType] || 1.0) + additionalTime,
    )

    return {
      packageName: servicePackage.name,
      vehicleType: args.vehicleType,
      basePrice,
      vehicleAdjustment: vehicleAdjustedPrice - basePrice,
      addOns: addOnPrices,
      addOnTotal,
      subtotal,
      discount,
      promoDetails,
      finalPrice,
      estimatedDuration: totalDuration, // in minutes
    }
  },
})
