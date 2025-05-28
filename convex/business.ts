import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import * as internal from "./internal"

// Record daily business metrics
export const recordDailyMetrics = mutation({
  args: {
    date: v.string(), // YYYY-MM-DD
    revenue: v.number(),
    expenses: v.optional(v.number()),
    appointmentsCount: v.number(),
    servicesCount: v.number(),
    newCustomersCount: v.optional(v.number()),
    returningCustomersCount: v.optional(v.number()),
    productsSold: v.optional(v.number()),
    productRevenue: v.optional(v.number()),
    staffHours: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if metrics for this date already exist
    const existingMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.eq(q.field("period"), "day"))
      .first()

    // Calculate profit if both revenue and expenses are provided
    const profit = args.expenses !== undefined ? args.revenue - args.expenses : undefined

    // Calculate average service value
    const averageServiceValue = args.servicesCount > 0 ? args.revenue / args.servicesCount : undefined

    if (existingMetrics) {
      // Update existing metrics
      await ctx.db.patch(existingMetrics._id, {
        revenue: args.revenue,
        expenses: args.expenses,
        profit,
        appointmentsCount: args.appointmentsCount,
        servicesCount: args.servicesCount,
        newCustomersCount: args.newCustomersCount,
        returningCustomersCount: args.returningCustomersCount,
        averageServiceValue,
        productsSold: args.productsSold,
        productRevenue: args.productRevenue,
        staffHours: args.staffHours,
        updatedAt: new Date().toISOString(),
      })

      return existingMetrics._id
    } else {
      // Create new metrics
      const metricsId = await ctx.db.insert("businessMetrics", {
        date: args.date,
        period: "day",
        revenue: args.revenue,
        expenses: args.expenses,
        profit,
        appointmentsCount: args.appointmentsCount,
        servicesCount: args.servicesCount,
        newCustomersCount: args.newCustomersCount,
        returningCustomersCount: args.returningCustomersCount,
        averageServiceValue,
        productsSold: args.productsSold,
        productRevenue: args.productRevenue,
        staffHours: args.staffHours,
        createdAt: new Date().toISOString(),
      })

      return metricsId
    }
  },
})

// Generate monthly metrics from daily data
export const generateMonthlyMetrics = action({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, args) => {
    // Format month as YYYY-MM
    const monthStr = `${args.year}-${String(args.month).padStart(2, "0")}`

    // Get all daily metrics for the month
    const dailyMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_period", (q) => q.eq("period", "day"))
      .filter((q) => q.startsWith(q.field("date"), monthStr))
      .collect()

    if (dailyMetrics.length === 0) {
      throw new Error(`No daily metrics found for ${monthStr}`)
    }

    // Aggregate metrics
    let totalRevenue = 0
    let totalExpenses = 0
    let totalAppointments = 0
    let totalServices = 0
    let totalNewCustomers = 0
    let totalReturningCustomers = 0
    let totalProductsSold = 0
    let totalProductRevenue = 0
    let totalStaffHours = 0

    for (const metrics of dailyMetrics) {
      totalRevenue += metrics.revenue
      totalExpenses += metrics.expenses || 0
      totalAppointments += metrics.appointmentsCount
      totalServices += metrics.servicesCount
      totalNewCustomers += metrics.newCustomersCount || 0
      totalReturningCustomers += metrics.returningCustomersCount || 0
      totalProductsSold += metrics.productsSold || 0
      totalProductRevenue += metrics.productRevenue || 0
      totalStaffHours += metrics.staffHours || 0
    }

    // Calculate derived metrics
    const profit = totalRevenue - totalExpenses
    const averageServiceValue = totalServices > 0 ? totalRevenue / totalServices : 0

    // Check if monthly metrics already exist
    const existingMonthlyMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_date", (q) => q.eq("date", monthStr))
      .filter((q) => q.eq(q.field("period"), "month"))
      .first()

    if (existingMonthlyMetrics) {
      // Update existing monthly metrics
      await ctx.runMutation(async (ctx) => {
        await ctx.db.patch(existingMonthlyMetrics._id, {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit,
          appointmentsCount: totalAppointments,
          servicesCount: totalServices,
          newCustomersCount: totalNewCustomers,
          returningCustomersCount: totalReturningCustomers,
          averageServiceValue,
          productsSold: totalProductsSold,
          productRevenue: totalProductRevenue,
          staffHours: totalStaffHours,
          updatedAt: new Date().toISOString(),
        })
      })

      return {
        success: true,
        metricsId: existingMonthlyMetrics._id,
        message: `Updated monthly metrics for ${monthStr}`,
      }
    } else {
      // Create new monthly metrics
      const metricsId = await ctx.runMutation(async (ctx) => {
        return await ctx.db.insert("businessMetrics", {
          date: monthStr,
          period: "month",
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit,
          appointmentsCount: totalAppointments,
          servicesCount: totalServices,
          newCustomersCount: totalNewCustomers,
          returningCustomersCount: totalReturningCustomers,
          averageServiceValue,
          productsSold: totalProductsSold,
          productRevenue: totalProductRevenue,
          staffHours: totalStaffHours,
          createdAt: new Date().toISOString(),
        })
      })

      return {
        success: true,
        metricsId,
        message: `Generated monthly metrics for ${monthStr}`,
      }
    }
  },
})

// Get business metrics
export const getBusinessMetrics = query({
  args: {
    period: v.string(), // "day", "month", "quarter", "year"
    startDate: v.string(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If endDate is not provided, use startDate (single period)
    const endDate = args.endDate || args.startDate

    // Get metrics for the specified period and date range
    const metrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), endDate)))
      .collect()

    // Sort by date
    metrics.sort((a, b) => {
      if (a.date < b.date) return -1
      if (a.date > b.date) return 1
      return 0
    })

    return metrics
  },
})

// Get business dashboard data
export const getBusinessDashboard = query({
  args: {},
  handler: async (ctx, args) => {
    // Get current date
    const today = new Date()
    const currentMonth = today.toISOString().substring(0, 7) // YYYY-MM

    // Calculate previous month
    const prevMonth = new Date(today)
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const previousMonth = prevMonth.toISOString().substring(0, 7) // YYYY-MM

    // Get current month metrics
    const currentMonthMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_date", (q) => q.eq("date", currentMonth))
      .filter((q) => q.eq(q.field("period"), "month"))
      .first()

    // Get previous month metrics
    const previousMonthMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_date", (q) => q.eq("date", previousMonth))
      .filter((q) => q.eq(q.field("period"), "month"))
      .first()

    // Get recent daily metrics (last 30 days)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

    const dailyMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_period", (q) => q.eq("period", "day"))
      .filter((q) => q.gte(q.field("date"), thirtyDaysAgoStr))
      .collect()

    // Sort daily metrics by date
    dailyMetrics.sort((a, b) => {
      if (a.date < b.date) return -1
      if (a.date > b.date) return 1
      return 0
    })

    // Get upcoming appointments
    const upcomingAppointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(q.gte(q.field("date"), today.toISOString().split("T")[0]), q.neq(q.field("status"), "cancelled")),
      )
      .take(5)

    // Get low stock products
    const lowStockProducts = await ctx.db
      .query("products")
      .filter((q) =>
        q.and(q.lte(q.field("stockQuantity"), q.field("reorderThreshold")), q.gt(q.field("stockQuantity"), 0)),
      )
      .take(5)

    // Calculate month-over-month changes
    const changes = {
      revenue: calculatePercentChange(previousMonthMetrics?.revenue, currentMonthMetrics?.revenue),
      appointments: calculatePercentChange(
        previousMonthMetrics?.appointmentsCount,
        currentMonthMetrics?.appointmentsCount,
      ),
      newCustomers: calculatePercentChange(
        previousMonthMetrics?.newCustomersCount,
        currentMonthMetrics?.newCustomersCount,
      ),
      averageServiceValue: calculatePercentChange(
        previousMonthMetrics?.averageServiceValue,
        currentMonthMetrics?.averageServiceValue,
      ),
    }

    return {
      currentMonth: currentMonthMetrics || null,
      previousMonth: previousMonthMetrics || null,
      changes,
      dailyMetrics,
      upcomingAppointments,
      lowStockProducts,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Helper function to calculate percent change
function calculatePercentChange(previous: number | undefined, current: number | undefined): number | null {
  if (previous === undefined || current === undefined) {
    return null
  }

  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

// Get revenue report
export const getRevenueReport = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    groupBy: v.string(), // "day", "month"
  },
  handler: async (ctx, args) => {
    // Get metrics for the specified date range
    const metrics = await ctx.db
      .query("businessMetrics")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
          q.eq(q.field("period"), args.groupBy),
        ),
      )
      .collect()

    // Sort by date
    metrics.sort((a, b) => {
      if (a.date < b.date) return -1
      if (a.date > b.date) return 1
      return 0
    })

    // Calculate totals
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0)
    const totalExpenses = metrics.reduce((sum, m) => sum + (m.expenses || 0), 0)
    const totalProfit = totalRevenue - totalExpenses
    const totalServices = metrics.reduce((sum, m) => sum + m.servicesCount, 0)
    const totalProductRevenue = metrics.reduce((sum, m) => sum + (m.productRevenue || 0), 0)

    // Format data for chart
    const chartData = metrics.map((m) => ({
      date: m.date,
      revenue: m.revenue,
      expenses: m.expenses || 0,
      profit: m.profit !== undefined ? m.profit : m.revenue - (m.expenses || 0),
      services: m.servicesCount,
      productRevenue: m.productRevenue || 0,
    }))

    return {
      startDate: args.startDate,
      endDate: args.endDate,
      groupBy: args.groupBy,
      totalRevenue,
      totalExpenses,
      totalProfit,
      totalServices,
      totalProductRevenue,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      averageServiceValue: totalServices > 0 ? totalRevenue / totalServices : 0,
      productRevenuePercentage: totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0,
      chartData,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get customer report
export const getCustomerReport = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get metrics for the specified date range
    const metrics = await ctx.db
      .query("businessMetrics")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
          q.eq(q.field("period"), "day"),
        ),
      )
      .collect()

    // Calculate totals
    const totalNewCustomers = metrics.reduce((sum, m) => sum + (m.newCustomersCount || 0), 0)
    const totalReturningCustomers = metrics.reduce((sum, m) => sum + (m.returningCustomersCount || 0), 0)
    const totalCustomers = totalNewCustomers + totalReturningCustomers

    // Get appointments in date range
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect()

    // Count unique customers
    const uniqueCustomers = new Set(appointments.map((a) => a.customerId)).size

    // Group appointments by customer
    const appointmentsByCustomer: Record<string, number> = {}
    for (const appointment of appointments) {
      appointmentsByCustomer[appointment.customerId] = (appointmentsByCustomer[appointment.customerId] || 0) + 1
    }

    // Calculate repeat visit rate
    const customersWithMultipleVisits = Object.values(appointmentsByCustomer).filter((count) => count > 1).length
    const repeatVisitRate = uniqueCustomers > 0 ? (customersWithMultipleVisits / uniqueCustomers) * 100 : 0

    // Calculate average appointments per customer
    const averageAppointmentsPerCustomer = uniqueCustomers > 0 ? appointments.length / uniqueCustomers : 0

    // Get customer feedback in date range
    const feedback = await ctx.db
      .query("customerFeedback")
      .filter((q) => q.gte(q.field("createdAt"), args.startDate + "T00:00:00Z"))
      .filter((q) => q.lte(q.field("createdAt"), args.endDate + "T23:59:59Z"))
      .collect()

    // Calculate average ratings
    const averageServiceRating =
      feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.serviceRating, 0) / feedback.length : 0

    const averageStaffRating =
      feedback.filter((f) => f.staffRating !== undefined).length > 0
        ? feedback.reduce((sum, f) => sum + (f.staffRating || 0), 0) /
          feedback.filter((f) => f.staffRating !== undefined).length
        : 0

    return {
      startDate: args.startDate,
      endDate: args.endDate,
      totalCustomers,
      totalNewCustomers,
      totalReturningCustomers,
      uniqueCustomers,
      repeatVisitRate,
      averageAppointmentsPerCustomer,
      customerRetentionRate: totalCustomers > 0 ? (totalReturningCustomers / totalCustomers) * 100 : 0,
      averageServiceRating,
      averageStaffRating,
      feedbackCount: feedback.length,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Create a promotion
export const createPromotion = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    type: v.string(), // "percentage", "fixed", "free_service", "bundle"
    value: v.number(), // Percentage or fixed amount
    minPurchase: v.optional(v.number()),
    applicableServices: v.optional(v.array(v.string())),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if promotion with this code already exists
    const existingPromotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (existingPromotion) {
      throw new Error("A promotion with this code already exists")
    }

    // Create the promotion
    const promotionId = await ctx.db.insert("promotions", {
      code: args.code,
      description: args.description,
      type: args.type,
      value: args.value,
      minPurchase: args.minPurchase,
      applicableServices: args.applicableServices,
      startDate: args.startDate,
      endDate: args.endDate,
      usageLimit: args.usageLimit,
      usageCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    })

    return promotionId
  },
})

// Get active promotions
export const getActivePromotions = query({
  args: {},
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0]

    const promotions = await ctx.db
      .query("promotions")
      .withIndex("by_active", (q) => q.eq("active", true))
      .filter((q) =>
        q.and(
          q.lte(q.field("startDate"), today),
          q.or(q.eq(q.field("endDate"), null), q.gte(q.field("endDate"), today)),
        ),
      )
      .collect()

    return promotions
  },
})

// Validate a promotion code
export const validatePromotionCode = query({
  args: {
    code: v.string(),
    serviceType: v.optional(v.string()),
    purchaseAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the promotion
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (!promotion) {
      return {
        valid: false,
        message: "Invalid promotion code",
      }
    }

    // Check if promotion is active
    if (!promotion.active) {
      return {
        valid: false,
        message: "This promotion is no longer active",
      }
    }

    // Check dates
    const today = new Date().toISOString().split("T")[0]
    if (promotion.startDate > today) {
      return {
        valid: false,
        message: `This promotion starts on ${promotion.startDate}`,
      }
    }

    if (promotion.endDate && promotion.endDate < today) {
      return {
        valid: false,
        message: "This promotion has expired",
      }
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return {
        valid: false,
        message: "This promotion has reached its usage limit",
      }
    }

    // Check minimum purchase
    if (promotion.minPurchase && args.purchaseAmount && args.purchaseAmount < promotion.minPurchase) {
      return {
        valid: false,
        message: `Minimum purchase amount of $${promotion.minPurchase} required`,
      }
    }

    // Check applicable services
    if (promotion.applicableServices && promotion.applicableServices.length > 0 && args.serviceType) {
      if (!promotion.applicableServices.includes(args.serviceType)) {
        return {
          valid: false,
          message: "This promotion is not applicable to the selected service",
        }
      }
    }

    // Calculate discount
    let discountAmount = 0
    let discountDescription = ""

    if (args.purchaseAmount) {
      if (promotion.type === "percentage") {
        discountAmount = args.purchaseAmount * (promotion.value / 100)
        discountDescription = `${promotion.value}% off`
      } else if (promotion.type === "fixed") {
        discountAmount = Math.min(promotion.value, args.purchaseAmount)
        discountDescription = `$${promotion.value} off`
      }
    }

    return {
      valid: true,
      promotion,
      discountAmount,
      discountDescription,
    }
  },
})

// Apply a promotion code
export const applyPromotionCode = mutation({
  args: {
    code: v.string(),
    appointmentId: v.optional(v.id("appointments")),
    serviceType: v.optional(v.string()),
    purchaseAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the promotion
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (!promotion) {
      throw new Error("Invalid promotion code")
    }

    // Validate the promotion (reuse validation logic)
    const validation = await ctx.runQuery(internal.business.validatePromotionCode, {
      code: args.code,
      serviceType: args.serviceType,
      purchaseAmount: args.purchaseAmount,
    })

    if (!validation.valid) {
      throw new Error(validation.message)
    }

    // Increment usage count
    await ctx.db.patch(promotion._id, {
      usageCount: promotion.usageCount + 1,
      updatedAt: new Date().toISOString(),
    })

    // If appointment is provided, apply discount to appointment
    if (args.appointmentId) {
      const appointment = await ctx.db.get(args.appointmentId)
      if (!appointment) {
        throw new Error("Appointment not found")
      }

      // Calculate discounted price
      let discountedPrice = args.purchaseAmount

      if (promotion.type === "percentage") {
        discountedPrice = args.purchaseAmount * (1 - promotion.value / 100)
      } else if (promotion.type === "fixed") {
        discountedPrice = Math.max(0, args.purchaseAmount - promotion.value)
      }

      // Update appointment with discounted price
      await ctx.db.patch(args.appointmentId, {
        price: discountedPrice,
        notes: appointment.notes
          ? `${appointment.notes}\nPromotion applied: ${promotion.code} (${promotion.description})`
          : `Promotion applied: ${promotion.code} (${promotion.description})`,
        updatedAt: new Date().toISOString(),
      })
    }

    return {
      success: true,
      promotionId: promotion._id,
      originalAmount: args.purchaseAmount,
      discountAmount: validation.discountAmount,
      finalAmount: args.purchaseAmount - (validation.discountAmount || 0),
    }
  },
})
