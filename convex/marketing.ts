import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"

// Create a marketing campaign
export const createMarketingCampaign = mutation({
  args: {
    name: v.string(),
    type: v.string(), // "email", "social", "local", "referral", "promotion"
    startDate: v.string(),
    endDate: v.optional(v.string()),
    budget: v.optional(v.number()),
    target: v.optional(v.any()), // Target audience
    content: v.optional(v.any()), // Campaign content
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if campaign with this name already exists
    const existingCampaign = await ctx.db
      .query("marketingCampaigns")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existingCampaign) {
      throw new Error("A campaign with this name already exists")
    }

    // Create the campaign
    const campaignId = await ctx.db.insert("marketingCampaigns", {
      name: args.name,
      type: args.type,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "planned",
      budget: args.budget,
      target: args.target,
      content: args.content,
      notes: args.notes,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
      createdAt: new Date().toISOString(),
    })

    return campaignId
  },
})

// Update a marketing campaign
export const updateMarketingCampaign = mutation({
  args: {
    campaignId: v.id("marketingCampaigns"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    budget: v.optional(v.number()),
    target: v.optional(v.any()),
    content: v.optional(v.any()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { campaignId, ...updates } = args

    // Check if campaign exists
    const campaign = await ctx.db.get(campaignId)
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== campaign.name) {
      const existingCampaign = await ctx.db
        .query("marketingCampaigns")
        .filter((q) => q.eq(q.field("name"), updates.name))
        .first()

      if (existingCampaign) {
        throw new Error("A campaign with this name already exists")
      }
    }

    // Add updatedAt timestamp
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update the campaign
    await ctx.db.patch(campaignId, updatedFields)

    return campaignId
  },
})

// Update campaign metrics
export const updateCampaignMetrics = mutation({
  args: {
    campaignId: v.id("marketingCampaigns"),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
    revenue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { campaignId, ...metrics } = args

    // Check if campaign exists
    const campaign = await ctx.db.get(campaignId)
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // Update metrics
    const currentMetrics = campaign.metrics || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }

    const updatedMetrics = {
      impressions: metrics.impressions !== undefined ? metrics.impressions : currentMetrics.impressions,
      clicks: metrics.clicks !== undefined ? metrics.clicks : currentMetrics.clicks,
      conversions: metrics.conversions !== undefined ? metrics.conversions : currentMetrics.conversions,
      revenue: metrics.revenue !== undefined ? metrics.revenue : currentMetrics.revenue,
    }

    // Update the campaign
    await ctx.db.patch(campaignId, {
      metrics: updatedMetrics,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      metrics: updatedMetrics,
    }
  },
})

// Get all marketing campaigns
export const getAllMarketingCampaigns = query({
  args: {
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("marketingCampaigns")

    // Filter by status if provided
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status))
    }

    // Filter by type if provided
    if (args.type) {
      query = query.withIndex("by_type", (q) => q.eq("type", args.type))
    }

    // Get all campaigns
    const campaigns = await query.collect()

    // Sort by start date (newest first)
    campaigns.sort((a, b) => {
      if (a.startDate > b.startDate) return -1
      if (a.startDate < b.startDate) return 1
      return 0
    })

    return campaigns
  },
})

// Get a specific marketing campaign
export const getMarketingCampaign = query({
  args: {
    campaignId: v.id("marketingCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId)
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    return campaign
  },
})

// Generate marketing campaign report
export const generateCampaignReport = query({
  args: {
    campaignId: v.optional(v.id("marketingCampaigns")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If campaign ID is provided, get that specific campaign
    if (args.campaignId) {
      const campaign = await ctx.db.get(args.campaignId)
      if (!campaign) {
        throw new Error("Campaign not found")
      }

      // Calculate ROI
      const roi =
        campaign.budget && campaign.budget > 0 && campaign.metrics?.revenue
          ? ((campaign.metrics.revenue - campaign.budget) / campaign.budget) * 100
          : null

      // Calculate conversion rate
      const conversionRate =
        campaign.metrics?.clicks && campaign.metrics.clicks > 0 && campaign.metrics?.conversions
          ? (campaign.metrics.conversions / campaign.metrics.clicks) * 100
          : null

      // Calculate cost per acquisition
      const cpa =
        campaign.budget && campaign.budget > 0 && campaign.metrics?.conversions && campaign.metrics.conversions > 0
          ? campaign.budget / campaign.metrics.conversions
          : null

      return {
        campaign,
        metrics: campaign.metrics || {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        },
        analysis: {
          roi,
          conversionRate,
          cpa,
          clickThroughRate:
            campaign.metrics?.impressions && campaign.metrics.impressions > 0 && campaign.metrics?.clicks
              ? (campaign.metrics.clicks / campaign.metrics.impressions) * 100
              : null,
        },
        generatedAt: new Date().toISOString(),
      }
    }

    // Otherwise, get all campaigns in the date range
    const startDate = args.startDate || "2000-01-01"
    const endDate = args.endDate || "2100-12-31"

    const campaigns = await ctx.db
      .query("marketingCampaigns")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), startDate),
          q.or(q.eq(q.field("endDate"), null), q.lte(q.field("endDate"), endDate)),
        ),
      )
      .collect()

    // Calculate totals
    let totalImpressions = 0
    let totalClicks = 0
    let totalConversions = 0
    let totalRevenue = 0
    let totalBudget = 0

    for (const campaign of campaigns) {
      totalImpressions += campaign.metrics?.impressions || 0
      totalClicks += campaign.metrics?.clicks || 0
      totalConversions += campaign.metrics?.conversions || 0
      totalRevenue += campaign.metrics?.revenue || 0
      totalBudget += campaign.budget || 0
    }

    // Calculate overall metrics
    const overallROI = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget) * 100 : null
    const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : null
    const overallCPA = totalBudget > 0 && totalConversions > 0 ? totalBudget / totalConversions : null
    const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null

    // Group by type
    const campaignsByType: Record<string, any> = {}
    for (const campaign of campaigns) {
      if (!campaignsByType[campaign.type]) {
        campaignsByType[campaign.type] = {
          count: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          budget: 0,
        }
      }

      campaignsByType[campaign.type].count++
      campaignsByType[campaign.type].impressions += campaign.metrics?.impressions || 0
      campaignsByType[campaign.type].clicks += campaign.metrics?.clicks || 0
      campaignsByType[campaign.type].conversions += campaign.metrics?.conversions || 0
      campaignsByType[campaign.type].revenue += campaign.metrics?.revenue || 0
      campaignsByType[campaign.type].budget += campaign.budget || 0
    }

    // Format type breakdown
    const typeBreakdown = Object.entries(campaignsByType).map(([type, data]) => ({
      type,
      count: data.count,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions,
      revenue: data.revenue,
      budget: data.budget,
      roi: data.budget > 0 ? ((data.revenue - data.budget) / data.budget) * 100 : null,
    }))

    return {
      startDate,
      endDate,
      campaigns: campaigns.map((campaign) => ({
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        metrics: campaign.metrics,
        budget: campaign.budget,
      })),
      totals: {
        campaignCount: campaigns.length,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: totalRevenue,
        budget: totalBudget,
      },
      analysis: {
        roi: overallROI,
        conversionRate: overallConversionRate,
        cpa: overallCPA,
        clickThroughRate: overallCTR,
      },
      typeBreakdown,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Generate customer segments for targeted marketing
export const generateCustomerSegments = action({
  args: {
    minTransactions: v.optional(v.number()),
    minSpending: v.optional(v.number()),
    inactiveThreshold: v.optional(v.number()), // Days since last appointment
  },
  handler: async (ctx, args) => {
    const minTransactions = args.minTransactions || 2
    const minSpending = args.minSpending || 100
    const inactiveThreshold = args.inactiveThreshold || 90 // 3 months

    // Get all customers
    const customers = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "customer"))
        .collect()
    })

    // Get all completed appointments
    const appointments = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("appointments")
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect()
    })

    // Calculate today's date for inactive threshold
    const today = new Date()
    const inactiveDate = new Date(today)
    inactiveDate.setDate(today.getDate() - inactiveThreshold)
    const inactiveDateStr = inactiveDate.toISOString().split("T")[0]

    // Process customer data
    const customerData = customers.map((customer) => {
      // Get customer's appointments
      const customerAppointments = appointments.filter((a) => a.customerId === customer._id)

      // Calculate total spending
      const totalSpending = customerAppointments.reduce((sum, a) => sum + (a.price || 0), 0)

      // Get last appointment date
      const sortedAppointments = [...customerAppointments].sort((a, b) => {
        if (a.date > b.date) return -1
        if (a.date < b.date) return 1
        return 0
      })

      const lastAppointmentDate = sortedAppointments.length > 0 ? sortedAppointments[0].date : null

      // Get service preferences
      const serviceCount: Record<string, number> = {}
      for (const appointment of customerAppointments) {
        serviceCount[appointment.serviceType] = (serviceCount[appointment.serviceType] || 0) + 1
      }

      // Find preferred service (most used)
      let preferredService = null
      let maxCount = 0
      for (const [service, count] of Object.entries(serviceCount)) {
        if (count > maxCount) {
          preferredService = service
          maxCount = count
        }
      }

      return {
        customerId: customer._id,
        name: customer.name,
        email: customer.email,
        appointmentCount: customerAppointments.length,
        totalSpending,
        lastAppointmentDate,
        preferredService,
        isActive: lastAppointmentDate && lastAppointmentDate >= inactiveDateStr,
      }
    })

    // Create segments
    const segments = {
      highValue: customerData.filter(
        (c) => c.totalSpending >= minSpending * 2 && c.appointmentCount >= minTransactions,
      ),
      loyal: customerData.filter((c) => c.appointmentCount >= minTransactions * 2),
      regular: customerData.filter((c) => c.appointmentCount >= minTransactions && c.totalSpending >= minSpending),
      new: customerData.filter((c) => c.appointmentCount < minTransactions && c.isActive),
      inactive: customerData.filter((c) => !c.isActive && c.appointmentCount > 0),
      oneTime: customerData.filter((c) => c.appointmentCount === 1 && c.isActive),
      neverPurchased: customerData.filter((c) => c.appointmentCount === 0),
    }

    // Create service preference segments
    const servicePreferences: Record<string, any[]> = {}

    for (const customer of customerData) {
      if (customer.preferredService) {
        if (!servicePreferences[customer.preferredService]) {
          servicePreferences[customer.preferredService] = []
        }

        servicePreferences[customer.preferredService].push(customer)
      }
    }

    return {
      segments,
      servicePreferences,
      totalCustomers: customers.length,
      segmentCounts: {
        highValue: segments.highValue.length,
        loyal: segments.loyal.length,
        regular: segments.regular.length,
        new: segments.new.length,
        inactive: segments.inactive.length,
        oneTime: segments.oneTime.length,
        neverPurchased: segments.neverPurchased.length,
      },
      generatedAt: new Date().toISOString(),
    }
  },
})
