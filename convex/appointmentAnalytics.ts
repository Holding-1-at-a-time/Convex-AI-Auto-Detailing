import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * APPOINTMENT ANALYTICS AND REPORTING
 * Business intelligence functions for appointment data
 */

// Get appointment statistics for a business
export const getAppointmentStatistics = query({
  args: {
    businessId: v.id("businessProfiles"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Set default date range (last 30 days)
    const endDate = args.endDate || new Date().toISOString().split("T")[0]
    const startDate =
      args.startDate ||
      (() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date.toISOString().split("T")[0]
      })()

    // Get all appointments in date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) => q.and(q.gte(q.field("date"), startDate), q.lte(q.field("date"), endDate)))
      .collect()

    // Calculate statistics
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter((a) => a.status === "completed").length
    const cancelledAppointments = appointments.filter((a) => a.status === "cancelled").length
    const scheduledAppointments = appointments.filter((a) => a.status === "scheduled").length

    const totalRevenue = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.price || 0), 0)

    const averageAppointmentValue = completedAppointments > 0 ? totalRevenue / completedAppointments : 0

    // Service popularity
    const serviceStats = {}
    appointments.forEach((appointment) => {
      if (!serviceStats[appointment.serviceType]) {
        serviceStats[appointment.serviceType] = {
          count: 0,
          revenue: 0,
          completionRate: 0,
        }
      }
      serviceStats[appointment.serviceType].count++
      if (appointment.status === "completed") {
        serviceStats[appointment.serviceType].revenue += appointment.price || 0
      }
    })

    // Calculate completion rates
    Object.keys(serviceStats).forEach((service) => {
      const serviceAppointments = appointments.filter((a) => a.serviceType === service)
      const completedService = serviceAppointments.filter((a) => a.status === "completed").length
      serviceStats[service].completionRate =
        serviceAppointments.length > 0 ? (completedService / serviceAppointments.length) * 100 : 0
    })

    // Daily appointment trends
    const dailyTrends = {}
    appointments.forEach((appointment) => {
      if (!dailyTrends[appointment.date]) {
        dailyTrends[appointment.date] = {
          total: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
        }
      }
      dailyTrends[appointment.date].total++
      if (appointment.status === "completed") {
        dailyTrends[appointment.date].completed++
        dailyTrends[appointment.date].revenue += appointment.price || 0
      } else if (appointment.status === "cancelled") {
        dailyTrends[appointment.date].cancelled++
      }
    })

    // Peak hours analysis
    const hourlyDistribution = {}
    appointments.forEach((appointment) => {
      const hour = appointment.startTime.split(":")[0]
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
    })

    return {
      period: { startDate, endDate },
      overview: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        scheduledAppointments,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
        cancellationRate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0,
      },
      revenue: {
        totalRevenue,
        averageAppointmentValue,
        projectedMonthlyRevenue:
          totalRevenue *
          (30 / Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))),
      },
      services: serviceStats,
      trends: {
        daily: Object.entries(dailyTrends).map(([date, stats]) => ({ date, ...stats })),
        hourly: Object.entries(hourlyDistribution).map(([hour, count]) => ({ hour: Number.parseInt(hour), count })),
      },
    }
  },
})

// Get customer analytics
export const getCustomerAnalytics = query({
  args: {
    businessId: v.id("businessProfiles"),
    period: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("quarter"), v.literal("year"))),
  },
  handler: async (ctx, args) => {
    const period = args.period || "month"

    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "week":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "month":
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Get appointments in period
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) => q.and(q.gte(q.field("date"), startDateStr), q.lte(q.field("date"), endDateStr)))
      .collect()

    // Analyze customer behavior
    const customerStats = {}
    appointments.forEach((appointment) => {
      if (!customerStats[appointment.customerId]) {
        customerStats[appointment.customerId] = {
          totalAppointments: 0,
          completedAppointments: 0,
          totalSpent: 0,
          services: new Set(),
          firstVisit: appointment.date,
          lastVisit: appointment.date,
        }
      }

      const customer = customerStats[appointment.customerId]
      customer.totalAppointments++
      customer.services.add(appointment.serviceType)

      if (appointment.status === "completed") {
        customer.completedAppointments++
        customer.totalSpent += appointment.price || 0
      }

      if (appointment.date < customer.firstVisit) {
        customer.firstVisit = appointment.date
      }
      if (appointment.date > customer.lastVisit) {
        customer.lastVisit = appointment.date
      }
    })

    // Calculate metrics
    const uniqueCustomers = Object.keys(customerStats).length
    const returningCustomers = Object.values(customerStats).filter(
      (customer: any) => customer.totalAppointments > 1,
    ).length

    const averageAppointmentsPerCustomer = uniqueCustomers > 0 ? appointments.length / uniqueCustomers : 0

    const customerRetentionRate = uniqueCustomers > 0 ? (returningCustomers / uniqueCustomers) * 100 : 0

    // Top customers by revenue
    const topCustomers = Object.entries(customerStats)
      .map(([customerId, stats]: [string, any]) => ({
        customerId,
        ...stats,
        serviceCount: stats.services.size,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return {
      period: { startDate: startDateStr, endDate: endDateStr, period },
      overview: {
        uniqueCustomers,
        returningCustomers,
        newCustomers: uniqueCustomers - returningCustomers,
        customerRetentionRate,
        averageAppointmentsPerCustomer,
      },
      topCustomers,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get revenue forecasting
export const getRevenueForecast = query({
  args: {
    businessId: v.id("businessProfiles"),
    forecastPeriod: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("quarter"))),
  },
  handler: async (ctx, args) => {
    const forecastPeriod = args.forecastPeriod || "month"

    // Get historical data (last 3 months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 3)

    const historicalAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate.toISOString().split("T")[0]),
          q.lte(q.field("date"), endDate.toISOString().split("T")[0]),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .collect()

    // Calculate weekly averages
    const weeklyRevenue = {}
    historicalAppointments.forEach((appointment) => {
      const appointmentDate = new Date(appointment.date)
      const weekStart = new Date(appointmentDate)
      weekStart.setDate(appointmentDate.getDate() - appointmentDate.getDay())
      const weekKey = weekStart.toISOString().split("T")[0]

      weeklyRevenue[weekKey] = (weeklyRevenue[weekKey] || 0) + (appointment.price || 0)
    })

    const weeklyAverages = Object.values(weeklyRevenue)
    const averageWeeklyRevenue =
      weeklyAverages.length > 0
        ? weeklyAverages.reduce((sum: number, revenue: number) => sum + revenue, 0) / weeklyAverages.length
        : 0

    // Generate forecast
    let forecastRevenue = 0
    switch (forecastPeriod) {
      case "week":
        forecastRevenue = averageWeeklyRevenue
        break
      case "month":
        forecastRevenue = averageWeeklyRevenue * 4.33 // Average weeks per month
        break
      case "quarter":
        forecastRevenue = averageWeeklyRevenue * 13 // Average weeks per quarter
        break
    }

    // Calculate confidence interval (simple approach)
    const revenueVariance =
      weeklyAverages.length > 1
        ? weeklyAverages.reduce(
            (sum: number, revenue: number) => sum + Math.pow(revenue - averageWeeklyRevenue, 2),
            0,
          ) /
          (weeklyAverages.length - 1)
        : 0

    const standardDeviation = Math.sqrt(revenueVariance)
    const confidenceInterval = {
      lower: Math.max(0, forecastRevenue - 1.96 * standardDeviation),
      upper: forecastRevenue + 1.96 * standardDeviation,
    }

    return {
      forecastPeriod,
      historical: {
        averageWeeklyRevenue,
        totalWeeks: weeklyAverages.length,
        standardDeviation,
      },
      forecast: {
        expectedRevenue: forecastRevenue,
        confidenceInterval,
        accuracy: weeklyAverages.length >= 8 ? "high" : weeklyAverages.length >= 4 ? "medium" : "low",
      },
      generatedAt: new Date().toISOString(),
    }
  },
})
