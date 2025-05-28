import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Set business availability for a specific date
export const setBusinessAvailability = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    slots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        available: v.boolean(),
        reason: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Check if there's an existing availability record for this date
    const existingAvailability = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (existingAvailability) {
      // Update existing record
      await ctx.db.patch(existingAvailability._id, {
        slots: args.slots,
        updatedAt: new Date().toISOString(),
      })

      return existingAvailability._id
    } else {
      // Create new record
      const availabilityId = await ctx.db.insert("businessAvailability", {
        businessId: args.businessId,
        date: args.date,
        slots: args.slots,
        createdAt: new Date().toISOString(),
      })

      return availabilityId
    }
  },
})

// Get business availability for a date range
export const getBusinessAvailability = query({
  args: {
    businessId: v.id("businessProfiles"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get business profile
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Get all availability records in the date range
    const availabilityRecords = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
      .collect()

    return {
      businessId: args.businessId,
      businessName: business.businessName,
      availabilityRecords,
    }
  },
})

// Check if a business is available at a specific time
export const checkBusinessAvailability = query({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    // Get business profile
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Check if there's a specific availability record for this date
    const availabilityRecord = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (availabilityRecord) {
      // Check if there's an available slot that covers the requested time
      const availableSlot = availabilityRecord.slots.find(
        (slot) => slot.available && slot.startTime <= args.startTime && slot.endTime >= args.endTime,
      )

      return {
        available: !!availableSlot,
        reason: availableSlot ? undefined : "No available slot for the requested time",
      }
    }

    // If no specific record, check the business hours for the day of the week
    const dayOfWeek = new Date(args.date).toLocaleLowerCase().split(",")[0] // monday, tuesday, etc.
    const businessHours = business.businessHours?.[dayOfWeek]

    if (!businessHours) {
      return {
        available: false,
        reason: "Business is closed on this day",
      }
    }

    // Check if the requested time is within business hours
    const isWithinBusinessHours = businessHours.open <= args.startTime && businessHours.close >= args.endTime

    return {
      available: isWithinBusinessHours,
      reason: isWithinBusinessHours ? undefined : "Requested time is outside business hours",
    }
  },
})
