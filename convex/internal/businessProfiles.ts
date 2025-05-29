import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

// Get business profile by user ID
export const getBusinessProfileByUserId = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("businessProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    return profile
  },
})

// Get business services
export const getBusinessServices = internalQuery({
  args: {
    businessId: v.id("businessProfiles"),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      return []
    }

    // Get service IDs from business profile
    const serviceIds = business.servicesOffered || []

    // Get service details
    const services = await Promise.all(
      serviceIds.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId)
        return service
      }),
    )

    // Filter out any null values (in case a service was deleted)
    return services.filter(Boolean)
  },
})

// Get business availability
export const getBusinessAvailability = internalQuery({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get business profile
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      return null
    }

    // Check if there's a specific availability record for this date
    const availabilityRecord = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (availabilityRecord) {
      return {
        businessId: args.businessId,
        date: args.date,
        slots: availabilityRecord.slots,
        isSpecialDay: false,
      }
    }

    // Check if this is a special day
    const specialDay = await ctx.db
      .query("businessSpecialDays")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (specialDay) {
      if (!specialDay.isOpen) {
        return {
          businessId: args.businessId,
          date: args.date,
          slots: [],
          isSpecialDay: true,
          specialDayInfo: specialDay,
        }
      }

      if (specialDay.customHours) {
        return {
          businessId: args.businessId,
          date: args.date,
          slots: [
            {
              startTime: specialDay.customHours.open,
              endTime: specialDay.customHours.close,
              available: true,
            },
          ],
          isSpecialDay: true,
          specialDayInfo: specialDay,
        }
      }
    }

    // If no specific record, use the business hours for the day of the week
    const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })
    const businessHours = business.businessHours?.[dayOfWeek]

    if (!businessHours) {
      return {
        businessId: args.businessId,
        date: args.date,
        slots: [],
        isClosed: true,
      }
    }

    return {
      businessId: args.businessId,
      date: args.date,
      slots: [
        {
          startTime: businessHours.open,
          endTime: businessHours.close,
          available: true,
        },
      ],
      isClosed: false,
    }
  },
})
