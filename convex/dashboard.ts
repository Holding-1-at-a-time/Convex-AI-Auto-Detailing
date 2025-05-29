import { v } from "convex/values"
import { query } from "./_generated/server"
import { internal } from "./_generated/api"
import { verifyUserRole } from "./utils/auth"

// Get dashboard overview data
export const getDashboardOverview = query({
  args: {},
  handler: async (ctx, args) => {
    // Get current date
    const today = new Date()
    const currentDate = today.toISOString().split("T")[0]

    // Calculate date ranges
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split("T")[0]

    const lastWeekStart = new Date(today)
    lastWeekStart.setDate(today.getDate() - 7)
    const lastWeekStartDate = lastWeekStart.toISOString().split("T")[0]

    const lastMonthStart = new Date(today)
    lastMonthStart.setMonth(today.getMonth() - 1)
    const lastMonthStartDate = lastMonthStart.toISOString().split("T")[0]

    // Get today's appointments
    const todayAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", currentDate))
      .collect()

    // Get upcoming appointments (next 7 days)
    const nextWeekEnd = new Date(today)
    nextWeekEnd.setDate(today.getDate() + 7)
    const nextWeekEndDate = nextWeekEnd.toISOString().split("T")[0]

    const upcomingAppointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.gt(q.field("date"), currentDate),
          q.lte(q.field("date"), nextWeekEndDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect()

    // Get recent appointments (last 7 days)
    const recentAppointments = await ctx.db
      .query("appointments")
      .filter((q) => q.and(q.gte(q.field("date"), lastWeekStartDate), q.lt(q.field("date"), currentDate)))
      .collect()

    // Get low stock products
    const lowStockProducts = await ctx.db
      .query("products")
      .filter((q) =>
        q.and(q.lte(q.field("stockQuantity"), q.field("reorderThreshold")), q.gt(q.field("stockQuantity"), 0)),
      )
      .take(5)

    // Get out of stock products
    const outOfStockProducts = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("stockQuantity"), 0))
      .take(5)

    // Get recent customer feedback
    const recentFeedback = await ctx.db.query("customerFeedback").order("desc").take(5)

    // Get recent feedback with details
    const feedbackWithDetails = await Promise.all(
      recentFeedback.map(async (feedback) => {
        let customerName = "Unknown Customer"
        let appointmentDetails = null

        // Get customer info
        const customer = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), feedback.customerId))
          .first()

        if (customer) {
          customerName = customer.name
        }

        // Get appointment info
        const appointment = await ctx.db.get(feedback.appointmentId)
        if (appointment) {
          appointmentDetails = {
            date: appointment.date,
            serviceType: appointment.serviceType,
          }
        }

        return {
          ...feedback,
          customerName,
          appointmentDetails,
        }
      }),
    )

    // Get business metrics for last month
    const lastMonthMetrics = await ctx.db
      .query("businessMetrics")
      .withIndex("by_period", (q) => q.eq("period", "day"))
      .filter((q) => q.gte(q.field("date"), lastMonthStartDate))
      .collect()

    // Calculate totals
    const totalRevenue = lastMonthMetrics.reduce((sum, m) => sum + m.revenue, 0)
    const totalAppointments = lastMonthMetrics.reduce((sum, m) => sum + m.appointmentsCount, 0)
    const totalServices = lastMonthMetrics.reduce((sum, m) => sum + m.servicesCount, 0)
    const totalNewCustomers = lastMonthMetrics.reduce((sum, m) => sum + (m.newCustomersCount || 0), 0)

    // Calculate averages
    const avgDailyRevenue = lastMonthMetrics.length > 0 ? totalRevenue / lastMonthMetrics.length : 0
    const avgDailyAppointments = lastMonthMetrics.length > 0 ? totalAppointments / lastMonthMetrics.length : 0

    // Format data for charts
    const revenueByDay = lastMonthMetrics
      .map((m) => ({
        date: m.date,
        revenue: m.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const appointmentsByDay = lastMonthMetrics
      .map((m) => ({
        date: m.date,
        appointments: m.appointmentsCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      todayAppointments: {
        total: todayAppointments.length,
        completed: todayAppointments.filter((a) => a.status === "completed").length,
        pending: todayAppointments.filter((a) => a.status === "scheduled" || a.status === "confirmed").length,
        cancelled: todayAppointments.filter((a) => a.status === "cancelled").length,
      },
      upcomingAppointments: {
        total: upcomingAppointments.length,
        byDay: Object.entries(
          upcomingAppointments.reduce(
            (acc, appointment) => {
              acc[appointment.date] = (acc[appointment.date] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
        ).map(([date, count]) => ({ date, count })),
      },
      recentAppointments: {
        total: recentAppointments.length,
        completed: recentAppointments.filter((a) => a.status === "completed").length,
        cancelled: recentAppointments.filter((a) => a.status === "cancelled").length,
      },
      inventory: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      feedback: feedbackWithDetails,
      monthlyMetrics: {
        totalRevenue,
        totalAppointments,
        totalServices,
        totalNewCustomers,
        avgDailyRevenue,
        avgDailyAppointments,
        revenueByDay,
        appointmentsByDay,
      },
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get staff dashboard data
export const getStaffDashboard = query({
  args: {
    staffId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current date
    const today = new Date()
    const currentDate = today.toISOString().split("T")[0]

    // Get staff info
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // Get today's appointments for this staff
    const todayAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", currentDate))
      .filter((q) => q.eq(q.field("staffId"), args.staffId))
      .collect()

    // Get upcoming appointments (next 7 days)
    const nextWeekEnd = new Date(today)
    nextWeekEnd.setDate(today.getDate() + 7)
    const nextWeekEndDate = nextWeekEnd.toISOString().split("T")[0]

    const upcomingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) =>
        q.and(
          q.gt(q.field("date"), currentDate),
          q.lte(q.field("date"), nextWeekEndDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect()

    // Get appointments with details
    const appointmentsWithDetails = await Promise.all(
      [...todayAppointments, ...upcomingAppointments].map(async (appointment) => {
        let customerName = "Unknown Customer"
        let vehicleInfo = null

        // Get customer info
        const customer = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), appointment.customerId))
          .first()

        if (customer) {
          customerName = customer.name
        }

        // Get vehicle info if available
        if (appointment.vehicleId) {
          const vehicle = await ctx.db.get(appointment.vehicleId)
          if (vehicle) {
            vehicleInfo = {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              color: vehicle.color,
            }
          }
        }

        return {
          ...appointment,
          customerName,
          vehicleInfo,
        }
      }),
    )

    // Get recent feedback for this staff
    const recentFeedback = await ctx.db
      .query("customerFeedback")
      .filter((q) => q.neq(q.field("staffRating"), null))
      .order("desc")
      .take(10)

    // Filter feedback for appointments assigned to this staff
    const staffFeedback = await Promise.all(
      recentFeedback.map(async (feedback) => {
        const appointment = await ctx.db.get(feedback.appointmentId)
        if (appointment && appointment.staffId === args.staffId) {
          // Get customer name
          let customerName = "Unknown Customer"
          const customer = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("_id"), feedback.customerId))
            .first()

          if (customer) {
            customerName = customer.name
          }

          return {
            ...feedback,
            customerName,
            appointmentDetails: {
              date: appointment.date,
              serviceType: appointment.serviceType,
            },
          }
        }
        return null
      }),
    )

    // Filter out null values
    const filteredFeedback = staffFeedback.filter(Boolean)

    // Get performance metrics
    const currentMonth = today.toISOString().substring(0, 7) // YYYY-MM
    const performance = await ctx.db
      .query("staffPerformance")
      .withIndex("by_staffId_period", (q) => q.eq("staffId", args.staffId).eq("period", currentMonth))
      .first()

    return {
      staff,
      todayAppointments: appointmentsWithDetails.filter((a) => a.date === currentDate),
      upcomingAppointments: appointmentsWithDetails.filter((a) => a.date !== currentDate),
      feedback: filteredFeedback,
      performance: performance || {
        servicesCompleted: 0,
        revenue: 0,
        customerRating: 0,
        efficiency: 0,
        upsellRate: 0,
      },
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get customer dashboard data
export const getCustomerDashboard = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get customer info
    const customer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.customerId))
      .first()

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Get customer's vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.customerId))
      .collect()

    // Get upcoming appointments
    const today = new Date()
    const currentDate = today.toISOString().split("T")[0]

    const upcomingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), currentDate),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
        ),
      )
      .collect()

    // Get past appointments
    const pastAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.or(q.lt(q.field("date"), currentDate), q.eq(q.field("status"), "completed")))
      .order("desc")
      .take(10)

    // Get appointments with details
    const appointmentsWithDetails = await Promise.all(
      [...upcomingAppointments, ...pastAppointments].map(async (appointment) => {
        let vehicleInfo = null
        let staffName = null

        // Get vehicle info if available
        if (appointment.vehicleId) {
          const vehicle = await ctx.db.get(appointment.vehicleId)
          if (vehicle) {
            vehicleInfo = {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
            }
          }
        }

        // Get staff info if assigned
        if (appointment.staffId) {
          const staff = await ctx.db
            .query("staff")
            .filter((q) => q.eq(q.field("userId"), appointment.staffId))
            .first()

          if (staff) {
            staffName = staff.name
          }
        }

        return {
          ...appointment,
          vehicleInfo,
          staffName,
        }
      }),
    )

    // Get loyalty info
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    // Get available rewards based on loyalty tier
    const availableRewards = await ctx.runQuery(internal.customers.getAvailableLoyaltyRewards, {
      tier: loyalty ? loyalty.tier : "bronze",
    })

    // Calculate spending history
    const completedAppointments = appointmentsWithDetails.filter((a) => a.status === "completed")
    const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.price || 0), 0)

    // Group spending by service type
    const spendingByService: Record<string, number> = {}
    for (const appointment of completedAppointments) {
      spendingByService[appointment.serviceType] =
        (spendingByService[appointment.serviceType] || 0) + (appointment.price || 0)
    }

    // Format service breakdown
    const serviceBreakdown = Object.entries(spendingByService).map(([service, amount]) => ({
      service,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))

    // Sort by amount (highest first)
    serviceBreakdown.sort((a, b) => b.amount - a.amount)

    return {
      customer,
      vehicles,
      upcomingAppointments: appointmentsWithDetails.filter(
        (a) => a.date >= currentDate && a.status !== "cancelled" && a.status !== "completed",
      ),
      pastAppointments: appointmentsWithDetails.filter((a) => a.date < currentDate || a.status === "completed"),
      loyalty: loyalty || {
        points: 0,
        tier: "bronze",
        pointsHistory: [],
      },
      availableRewards: availableRewards.filter((reward) => loyalty && reward.pointsCost <= loyalty.points),
      spending: {
        totalSpent,
        serviceCount: completedAppointments.length,
        averagePerService: completedAppointments.length > 0 ? totalSpent / completedAppointments.length : 0,
        serviceBreakdown,
      },
      generatedAt: new Date().toISOString(),
    }
  },
})

// Get business dashboard stats
export const getBusinessStats = query({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user is authorized to view this business's stats
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own business stats")
    }

    // Get all appointments for this business
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .collect()

    // Calculate total revenue
    const totalRevenue = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0)

    // Get unique customers
    const customerIds = new Set(appointments.map((appointment) => appointment.customerId))

    // Get upcoming appointments (future dates)
    const now = new Date()
    const upcomingAppointments = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date)
      return appointmentDate >= now
    })

    return {
      totalAppointments: appointments.length,
      totalRevenue,
      totalCustomers: customerIds.size,
      upcomingAppointments: upcomingAppointments.length,
    }
  },
})

// Get customer dashboard stats
export const getCustomerStats = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["customer", "admin"])

    // Ensure user is authorized to view these stats
    if (user.role !== "admin" && args.customerId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own stats")
    }

    // Get all appointments for this customer
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .collect()

    // Calculate total spent
    const totalSpent = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0)

    // Get upcoming appointments (future dates)
    const now = new Date()
    const upcomingAppointments = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date)
      return appointmentDate >= now
    })

    // Get completed appointments (past dates)
    const completedAppointments = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date)
      return appointmentDate < now
    })

    // Get vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.customerId))
      .collect()

    return {
      totalAppointments: appointments.length,
      totalSpent,
      upcomingAppointments: upcomingAppointments.length,
      completedAppointments: completedAppointments.length,
      vehicleCount: vehicles.length,
    }
  },
})
