import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

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
    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user owns this business or is admin
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only set availability for your own business")
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(args.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD")
    }

    // Validate time formats
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    for (const slot of args.slots) {
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        throw new Error("Invalid time format. Use HH:MM (24-hour format)")
      }

      if (slot.startTime >= slot.endTime) {
        throw new Error("Start time must be before end time")
      }
    }

    // Check for overlapping slots
    for (let i = 0; i < args.slots.length; i++) {
      for (let j = i + 1; j < args.slots.length; j++) {
        const slotA = args.slots[i]
        const slotB = args.slots[j]

        if (
          (slotA.startTime >= slotB.startTime && slotA.startTime < slotB.endTime) ||
          (slotA.endTime > slotB.startTime && slotA.endTime <= slotB.endTime) ||
          (slotA.startTime <= slotB.startTime && slotA.endTime >= slotB.endTime)
        ) {
          throw new Error("Time slots cannot overlap")
        }
      }
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

// Set business hours
export const setBusinessHours = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    businessHours: v.object({
      monday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      tuesday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      wednesday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      thursday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      friday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      saturday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
      sunday: v.optional(
        v.object({
          open: v.string(),
          close: v.string(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user owns this business or is admin
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only set hours for your own business")
    }

    // Validate time formats
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    for (const day of days) {
      const hours = args.businessHours[day]
      if (hours) {
        if (!timeRegex.test(hours.open) || !timeRegex.test(hours.close)) {
          throw new Error(`Invalid time format for ${day}. Use HH:MM (24-hour format)`)
        }

        if (hours.open >= hours.close) {
          throw new Error(`For ${day}, opening time must be before closing time`)
        }
      }
    }

    // Update business hours
    await ctx.db.patch(args.businessId, {
      businessHours: args.businessHours,
      updatedAt: new Date().toISOString(),
    })

    return args.businessId
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
      businessHours: business.businessHours,
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
    const dayOfWeek = new Date(args.date).toLocaleDateString("en-US", { weekday: "lowercase" })
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

// Set special day (holiday, event, etc.)
export const setSpecialDay = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    isOpen: v.boolean(),
    reason: v.string(), // e.g., "Holiday", "Special Event", "Maintenance"
    customHours: v.optional(
      v.object({
        open: v.string(),
        close: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized (business owner or admin)
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Check if business exists
    const business = await ctx.db.get(args.businessId)
    if (!business) {
      throw new Error("Business profile not found")
    }

    // Verify user owns this business or is admin
    if (user.role !== "admin" && business.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only set special days for your own business")
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(args.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD")
    }

    // If open with custom hours, validate time formats
    if (args.isOpen && args.customHours) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
      if (!timeRegex.test(args.customHours.open) || !timeRegex.test(args.customHours.close)) {
        throw new Error("Invalid time format. Use HH:MM (24-hour format)")
      }

      if (args.customHours.open >= args.customHours.close) {
        throw new Error("Opening time must be before closing time")
      }
    }

    // Check if there's an existing special day record
    const existingSpecialDay = await ctx.db
      .query("businessSpecialDays")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (existingSpecialDay) {
      // Update existing record
      await ctx.db.patch(existingSpecialDay._id, {
        isOpen: args.isOpen,
        reason: args.reason,
        customHours: args.customHours,
        updatedAt: new Date().toISOString(),
      })

      return existingSpecialDay._id
    } else {
      // Create new record
      const specialDayId = await ctx.db.insert("businessSpecialDays", {
        businessId: args.businessId,
        date: args.date,
        isOpen: args.isOpen,
        reason: args.reason,
        customHours: args.customHours,
        createdAt: new Date().toISOString(),
      })

      return specialDayId
    }
  },
})

// Get special days for a business
export const getBusinessSpecialDays = query({
  args: {
    businessId: v.id("businessProfiles"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("businessSpecialDays")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    if (args.startDate && args.endDate) {
      query = query.filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
    } else if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("date"), args.startDate))
    } else if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("date"), args.endDate))
    }

    const specialDays = await query.collect()

    return specialDays
  },
})
