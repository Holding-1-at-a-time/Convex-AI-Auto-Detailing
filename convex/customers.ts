import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

// Add a new customer
export const addCustomer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()

    if (existingUser) {
      throw new Error("A user with this email already exists")
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      address: args.address,
      role: "customer",
      createdAt: new Date().toISOString(),
      preferences: {
        notes: args.notes,
      },
    })

    // Initialize loyalty program
    await ctx.db.insert("customerLoyalty", {
      customerId: userId,
      points: 0,
      tier: "bronze",
      pointsHistory: [],
      createdAt: new Date().toISOString(),
    })

    return userId
  },
})

// Update a customer
export const updateCustomer = mutation({
  args: {
    customerId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { customerId, ...updates } = args

    // Check if user exists
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), customerId))
      .first()

    if (!user) {
      throw new Error("Customer not found")
    }

    // If email is being updated, check for duplicates
    if (updates.email && updates.email !== user.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email))
        .first()

      if (existingUser) {
        throw new Error("A user with this email already exists")
      }
    }

    // Prepare updates
    const userUpdates: any = {
      ...updates,
    }

    // Handle notes separately (stored in preferences)
    if (updates.notes !== undefined) {
      userUpdates.preferences = {
        ...(user.preferences || {}),
        notes: updates.notes,
      }
      delete userUpdates.notes
    }

    // Add lastUpdated timestamp
    userUpdates.lastUpdated = new Date().toISOString()

    // Update the user
    await ctx.db.patch(user._id, userUpdates)

    return user._id
  },
})

// Get all customers
export const getAllCustomers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "customer"))

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase()
      query = query.filter((q) =>
        q.or(
          q.contains(q.lower(q.field("name")), searchLower),
          q.contains(q.lower(q.field("email")), searchLower),
          q.contains(q.lower(q.field("phone") || ""), searchLower),
        ),
      )
    }

    // Apply pagination
    const limit = args.limit || 50
    const offset = args.offset || 0

    // Get total count (for pagination)
    const allCustomers = await query.collect()
    const totalCount = allCustomers.length

    // Apply limit and offset
    const customers = await query.order("desc").take(offset + limit)

    // Return paginated results
    return {
      customers: customers.slice(offset, offset + limit),
      totalCount,
      hasMore: totalCount > offset + limit,
    }
  },
})

// Get a specific customer
export const getCustomer = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the customer
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

    // Get customer's appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(10)

    // Get customer's loyalty info
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    // Get customer's feedback
    const feedback = await ctx.db
      .query("customerFeedback")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(5)

    return {
      ...customer,
      vehicles,
      recentAppointments: appointments,
      loyalty,
      recentFeedback: feedback,
    }
  },
})

// Add loyalty points
export const addLoyaltyPoints = mutation({
  args: {
    customerId: v.string(),
    points: v.number(),
    reason: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    // Check if customer exists
    const customer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.customerId))
      .first()

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Get customer's loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    if (!loyalty) {
      // Create loyalty record if it doesn't exist
      const loyaltyId = await ctx.db.insert("customerLoyalty", {
        customerId: args.customerId,
        points: args.points,
        tier: "bronze",
        pointsHistory: [
          {
            date: new Date().toISOString(),
            amount: args.points,
            reason: args.reason,
            appointmentId: args.appointmentId,
          },
        ],
        createdAt: new Date().toISOString(),
      })

      return {
        loyaltyId,
        newPoints: args.points,
        tier: "bronze",
      }
    }

    // Update existing loyalty record
    const newPoints = loyalty.points + args.points

    // Determine tier based on points
    let newTier = loyalty.tier
    if (newPoints >= 1000) {
      newTier = "platinum"
    } else if (newPoints >= 500) {
      newTier = "gold"
    } else if (newPoints >= 200) {
      newTier = "silver"
    } else {
      newTier = "bronze"
    }

    // Add to points history
    const pointsHistory = [
      ...loyalty.pointsHistory,
      {
        date: new Date().toISOString(),
        amount: args.points,
        reason: args.reason,
        appointmentId: args.appointmentId,
      },
    ]

    // Update loyalty record
    await ctx.db.patch(loyalty._id, {
      points: newPoints,
      tier: newTier,
      pointsHistory,
      updatedAt: new Date().toISOString(),
    })

    return {
      loyaltyId: loyalty._id,
      newPoints,
      tier: newTier,
    }
  },
})

// Redeem loyalty reward
export const redeemLoyaltyReward = mutation({
  args: {
    customerId: v.string(),
    rewardName: v.string(),
    pointsCost: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if customer exists
    const customer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.customerId))
      .first()

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Get customer's loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    if (!loyalty) {
      throw new Error("Customer loyalty record not found")
    }

    // Check if customer has enough points
    if (loyalty.points < args.pointsCost) {
      throw new Error("Insufficient loyalty points")
    }

    // Generate reward ID
    const rewardId = `reward-${Date.now()}`

    // Add to rewards
    const rewards = [
      ...(loyalty.rewards || []),
      {
        id: rewardId,
        name: args.rewardName,
        cost: args.pointsCost,
        redeemed: false,
        redeemedDate: null,
      },
    ]

    // Update points history
    const pointsHistory = [
      ...loyalty.pointsHistory,
      {
        date: new Date().toISOString(),
        amount: -args.pointsCost,
        reason: `Redeemed reward: ${args.rewardName}`,
        appointmentId: null,
      },
    ]

    // Update loyalty record
    await ctx.db.patch(loyalty._id, {
      points: loyalty.points - args.pointsCost,
      pointsHistory,
      rewards,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      rewardId,
      remainingPoints: loyalty.points - args.pointsCost,
    }
  },
})

// Mark loyalty reward as used
export const markRewardAsUsed = mutation({
  args: {
    customerId: v.string(),
    rewardId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get customer's loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    if (!loyalty) {
      throw new Error("Customer loyalty record not found")
    }

    // Find the reward
    const rewards = loyalty.rewards || []
    const rewardIndex = rewards.findIndex((r) => r.id === args.rewardId)

    if (rewardIndex === -1) {
      throw new Error("Reward not found")
    }

    // Check if already redeemed
    if (rewards[rewardIndex].redeemed) {
      throw new Error("Reward has already been redeemed")
    }

    // Update the reward
    rewards[rewardIndex] = {
      ...rewards[rewardIndex],
      redeemed: true,
      redeemedDate: new Date().toISOString(),
    }

    // Update loyalty record
    await ctx.db.patch(loyalty._id, {
      rewards,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
    }
  },
})

// Submit customer feedback
export const submitFeedback = mutation({
  args: {
    customerId: v.string(),
    appointmentId: v.id("appointments"),
    serviceRating: v.number(),
    staffRating: v.optional(v.number()),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if customer exists
    const customer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.customerId))
      .first()

    if (!customer) {
      throw new Error("Customer not found")
    }

    // Check if appointment exists
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if feedback already exists for this appointment
    const existingFeedback = await ctx.db
      .query("customerFeedback")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .first()

    if (existingFeedback) {
      throw new Error("Feedback has already been submitted for this appointment")
    }

    // Create feedback
    const feedbackId = await ctx.db.insert("customerFeedback", {
      customerId: args.customerId,
      appointmentId: args.appointmentId,
      serviceRating: args.serviceRating,
      staffRating: args.staffRating,
      comments: args.comments,
      followupStatus: "pending",
      createdAt: new Date().toISOString(),
    })

    // Award loyalty points for providing feedback
    await ctx.db
      .insert("customerLoyalty", {
        customerId: args.customerId,
        points: 10,
        tier: "bronze",
        pointsHistory: [
          {
            date: new Date().toISOString(),
            amount: 10,
            reason: "Provided feedback",
            appointmentId: args.appointmentId,
          },
        ],
        createdAt: new Date().toISOString(),
      })
      .catch(() => {
        // If loyalty record already exists, add points
        ctx.runMutation(internal.customers.addLoyaltyPoints, {
          customerId: args.customerId,
          points: 10,
          reason: "Provided feedback",
          appointmentId: args.appointmentId,
        })
      })

    return feedbackId
  },
})

// Get customer feedback
export const getCustomerFeedback = query({
  args: {
    customerId: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("customerFeedback")

    // Filter by customer if provided
    if (args.customerId) {
      query = query.withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
    }

    // Filter by appointment if provided
    if (args.appointmentId) {
      query = query.withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
    }

    // Apply date range filter if provided
    if (args.startDate && args.endDate) {
      query = query.filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.startDate + "T00:00:00Z"),
          q.lte(q.field("createdAt"), args.endDate + "T23:59:59Z"),
        ),
      )
    }

    // Order by date (newest first)
    query = query.order("desc")

    // Apply limit if provided
    const feedback = await query.take(args.limit || 100)

    // Fetch additional information for each feedback
    const feedbackWithDetails = await Promise.all(
      feedback.map(async (fb) => {
        let customerName = "Unknown Customer"
        let appointmentDetails = null

        // Get customer info
        const customer = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), fb.customerId))
          .first()

        if (customer) {
          customerName = customer.name
        }

        // Get appointment info
        const appointment = await ctx.db.get(fb.appointmentId)
        if (appointment) {
          appointmentDetails = {
            date: appointment.date,
            serviceType: appointment.serviceType,
            staffId: appointment.staffId,
          }

          // Get staff name if available
          if (appointment.staffId) {
            const staff = await ctx.db
              .query("staff")
              .filter((q) => q.eq(q.field("userId"), appointment.staffId))
              .first()

            if (staff) {
              appointmentDetails.staffName = staff.name
            }
          }
        }

        return {
          ...fb,
          customerName,
          appointmentDetails,
        }
      }),
    )

    return feedbackWithDetails
  },
})

// Respond to customer feedback
export const respondToFeedback = mutation({
  args: {
    feedbackId: v.id("customerFeedback"),
    response: v.string(),
    followupStatus: v.string(), // "contacted", "resolved"
  },
  handler: async (ctx, args) => {
    // Check if feedback exists
    const feedback = await ctx.db.get(args.feedbackId)
    if (!feedback) {
      throw new Error("Feedback not found")
    }

    // Update feedback
    await ctx.db.patch(args.feedbackId, {
      staffResponse: args.response,
      followupStatus: args.followupStatus,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
    }
  },
})

// Get customer loyalty status
export const getCustomerLoyalty = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get customer's loyalty record
    const loyalty = await ctx.db
      .query("customerLoyalty")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .first()

    if (!loyalty) {
      return {
        customerId: args.customerId,
        points: 0,
        tier: "bronze",
        pointsHistory: [],
        rewards: [],
      }
    }

    return loyalty
  },
})

// Get available loyalty rewards
export const getAvailableLoyaltyRewards = query({
  args: {
    tier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Define available rewards
    const rewards = [
      {
        id: "free-wash",
        name: "Free Basic Wash",
        description: "Redeem for a complimentary basic wash service",
        pointsCost: 100,
        tier: "bronze",
      },
      {
        id: "discount-10",
        name: "10% Off Any Service",
        description: "Get 10% off any detailing service",
        pointsCost: 150,
        tier: "bronze",
      },
      {
        id: "free-interior",
        name: "Free Interior Cleaning",
        description: "Redeem for a complimentary interior cleaning service",
        pointsCost: 250,
        tier: "silver",
      },
      {
        id: "discount-20",
        name: "20% Off Premium Service",
        description: "Get 20% off any premium detailing service",
        pointsCost: 350,
        tier: "silver",
      },
      {
        id: "free-detail",
        name: "Free Full Detail",
        description: "Redeem for a complimentary full detailing service",
        pointsCost: 500,
        tier: "gold",
      },
      {
        id: "priority-booking",
        name: "Priority Booking for 3 Months",
        description: "Get priority booking status for 3 months",
        pointsCost: 400,
        tier: "gold",
      },
      {
        id: "free-ceramic",
        name: "Free Ceramic Coating",
        description: "Redeem for a complimentary ceramic coating application",
        pointsCost: 1000,
        tier: "platinum",
      },
      {
        id: "vip-status",
        name: "VIP Status for 6 Months",
        description: "Enjoy VIP status with exclusive perks for 6 months",
        pointsCost: 800,
        tier: "platinum",
      },
    ]

    // Filter by tier if provided
    if (args.tier) {
      const tierLevels = {
        bronze: 0,
        silver: 1,
        gold: 2,
        platinum: 3,
      }

      const userTierLevel = tierLevels[args.tier] || 0

      return rewards.filter((reward) => {
        const rewardTierLevel = tierLevels[reward.tier] || 0
        return rewardTierLevel <= userTierLevel
      })
    }

    return rewards
  },
})

// Get customer spending history
export const getCustomerSpendingHistory = query({
  args: {
    customerId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Set default date range if not provided (last 12 months)
    const endDate = args.endDate || new Date().toISOString().split("T")[0]
    const startDate =
      args.startDate ||
      (() => {
        const date = new Date()
        date.setFullYear(date.getFullYear() - 1)
        return date.toISOString().split("T")[0]
      })()

    // Get all completed appointments for this customer in the date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .filter((q) =>
        q.and(q.gte(q.field("date"), startDate), q.lte(q.field("date"), endDate), q.eq(q.field("status"), "completed")),
      )
      .collect()

    // Group by month
    const spendingByMonth: Record<string, number> = {}
    const servicesByMonth: Record<string, Record<string, number>> = {}

    for (const appointment of appointments) {
      const month = appointment.date.substring(0, 7) // YYYY-MM

      // Add to monthly spending
      spendingByMonth[month] = (spendingByMonth[month] || 0) + (appointment.price || 0)

      // Add to services by month
      if (!servicesByMonth[month]) {
        servicesByMonth[month] = {}
      }

      servicesByMonth[month][appointment.serviceType] =
        (servicesByMonth[month][appointment.serviceType] || 0) + (appointment.price || 0)
    }

    // Format data for chart
    const months = Object.keys(spendingByMonth).sort()
    const chartData = months.map((month) => ({
      month,
      spending: spendingByMonth[month],
      services: servicesByMonth[month],
    }))

    // Calculate totals
    const totalSpending = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0)
    const serviceCount = appointments.length
    const averageSpending = serviceCount > 0 ? totalSpending / serviceCount : 0

    // Group by service type
    const spendingByService: Record<string, number> = {}
    for (const appointment of appointments) {
      spendingByService[appointment.serviceType] =
        (spendingByService[appointment.serviceType] || 0) + (appointment.price || 0)
    }

    // Format service breakdown
    const serviceBreakdown = Object.entries(spendingByService).map(([service, amount]) => ({
      service,
      amount,
      percentage: (amount / totalSpending) * 100,
    }))

    // Sort by amount (highest first)
    serviceBreakdown.sort((a, b) => b.amount - a.amount)

    return {
      customerId: args.customerId,
      startDate,
      endDate,
      totalSpending,
      serviceCount,
      averageSpending,
      serviceBreakdown,
      monthlyData: chartData,
    }
  },
})

// Get customer retention report
export const getCustomerRetentionReport = query({
  args: {
    period: v.string(), // "month", "quarter", "year"
    count: v.optional(v.number()), // Number of periods to include
  },
  handler: async (ctx, args) => {
    const count = args.count || 12 // Default to 12 periods
    const today = new Date()

    // Generate period boundaries
    const periods = []
    for (let i = 0; i < count; i++) {
      const endDate = new Date(today)

      if (args.period === "month") {
        endDate.setMonth(today.getMonth() - i)
      } else if (args.period === "quarter") {
        endDate.setMonth(today.getMonth() - i * 3)
      } else if (args.period === "year") {
        endDate.setFullYear(today.getFullYear() - i)
      }

      const startDate = new Date(endDate)
      if (args.period === "month") {
        startDate.setMonth(endDate.getMonth() - 1)
      } else if (args.period === "quarter") {
        startDate.setMonth(endDate.getMonth() - 3)
      } else if (args.period === "year") {
        startDate.setFullYear(endDate.getFullYear() - 1)
      }

      periods.push({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        label:
          args.period === "month"
            ? endDate.toLocaleString("default", { month: "short", year: "numeric" })
            : args.period === "quarter"
              ? `Q${Math.floor(endDate.getMonth() / 3) + 1} ${endDate.getFullYear()}`
              : endDate.getFullYear().toString(),
      })
    }

    // Reverse to get chronological order
    periods.reverse()

    // Get data for each period
    const periodData = await Promise.all(
      periods.map(async (period) => {
        // Get all appointments in this period
        const appointments = await ctx.db
          .query("appointments")
          .filter((q) =>
            q.and(
              q.gte(q.field("date"), period.startDate),
              q.lte(q.field("date"), period.endDate),
              q.neq(q.field("status"), "cancelled"),
            ),
          )
          .collect()

        // Count unique customers
        const uniqueCustomers = new Set(appointments.map((a) => a.customerId)).size

        // Count new vs returning customers
        const customerAppointmentCounts: Record<string, number> = {}

        for (const appointment of appointments) {
          customerAppointmentCounts[appointment.customerId] =
            (customerAppointmentCounts[appointment.customerId] || 0) + 1
        }

        const newCustomers = Object.keys(customerAppointmentCounts).filter(
          (customerId) => customerAppointmentCounts[customerId] === 1,
        ).length

        const returningCustomers = uniqueCustomers - newCustomers

        return {
          ...period,
          totalAppointments: appointments.length,
          uniqueCustomers,
          newCustomers,
          returningCustomers,
          retentionRate: uniqueCustomers > 0 ? (returningCustomers / uniqueCustomers) * 100 : 0,
        }
      }),
    )

    return {
      period: args.period,
      data: periodData,
      generatedAt: new Date().toISOString(),
    }
  },
})
