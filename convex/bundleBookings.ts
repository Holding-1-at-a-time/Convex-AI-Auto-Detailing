import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create a bundle booking
export const createBundleBooking = mutation({
  args: {
    bundleId: v.id("serviceBundles"),
    customerId: v.string(),
    date: v.string(),
    startTime: v.string(),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    vehicleId: v.optional(v.id("vehicles")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the bundle
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Validate bundle is active and available
    const now = new Date().toISOString()

    if (!bundle.isActive) {
      throw new Error("This bundle is no longer active")
    }

    if (bundle.validFrom && bundle.validFrom > now) {
      throw new Error("This bundle is not yet available")
    }

    if (bundle.validUntil && bundle.validUntil < now) {
      throw new Error("This bundle has expired")
    }

    if (bundle.maxRedemptions && bundle.currentRedemptions >= bundle.maxRedemptions) {
      throw new Error("This bundle is sold out")
    }

    // Check availability for all services in the bundle
    const services = await Promise.all(
      bundle.serviceIds.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId)
        if (!service) {
          throw new Error(`Service ${serviceId} not found`)
        }
        return service
      }),
    )

    // Calculate end time based on total duration
    const endTime = calculateEndTime(args.startTime, bundle.totalDuration)

    // Check for scheduling conflicts
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.or(
            q.and(q.gte(q.field("startTime"), args.startTime), q.lt(q.field("startTime"), endTime)),
            q.and(q.gt(q.field("endTime"), args.startTime), q.lte(q.field("endTime"), endTime)),
            q.and(q.lte(q.field("startTime"), args.startTime), q.gte(q.field("endTime"), endTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      throw new Error("This time slot is not available")
    }

    // Create appointment for the bundle
    const appointmentId = await ctx.db.insert("appointments", {
      customerId: args.customerId,
      businessId: bundle.businessId,
      vehicleId: args.vehicleId,
      bundleId: args.bundleId,
      date: args.date,
      startTime: args.startTime,
      endTime,
      serviceType: `Bundle: ${bundle.name}`,
      status: "scheduled",
      price: bundle.totalPrice,
      notes: args.notes,
      customerInfo: args.customerInfo,
      createdAt: new Date().toISOString(),
      reminderSent: false,
      followupSent: false,
    })

    // Increment bundle redemption count
    await ctx.db.patch(args.bundleId, {
      currentRedemptions: bundle.currentRedemptions + 1,
    })

    // Create individual service records for tracking
    for (const service of services) {
      await ctx.db.insert("bundleServiceRecords", {
        appointmentId,
        bundleId: args.bundleId,
        serviceId: service._id,
        serviceName: service.name,
        status: "pending",
        createdAt: new Date().toISOString(),
      })
    }

    return {
      success: true,
      appointmentId,
      bundleId: args.bundleId,
    }
  },
})

// Get available time slots for a bundle
export const getBundleAvailability = query({
  args: {
    bundleId: v.id("serviceBundles"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the bundle
    const bundle = await ctx.db.get(args.bundleId)
    if (!bundle) {
      throw new Error("Bundle not found")
    }

    // Business hours (9 AM to 5 PM by default)
    const businessHours = {
      start: "09:00",
      end: "17:00",
      interval: 30, // minutes
    }

    // Get all appointments for the date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect()

    // Get business availability settings
    const businessProfile = await ctx.db.get(bundle.businessId)
    if (businessProfile) {
      const availability = await ctx.db
        .query("businessAvailability")
        .withIndex("by_businessId", (q) => q.eq("businessId", bundle.businessId))
        .first()

      if (availability) {
        // Use business-specific hours if available
        const dayOfWeek = new Date(args.date).getDay()
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        const dayName = dayNames[dayOfWeek]
        const dayHours = availability[dayName]

        if (dayHours && dayHours.isOpen) {
          businessHours.start = dayHours.openTime
          businessHours.end = dayHours.closeTime
        }
      }
    }

    // Create time slots
    const timeSlots = []
    let currentTime = businessHours.start

    while (currentTime < businessHours.end) {
      const endTime = calculateEndTime(currentTime, bundle.totalDuration)

      // Check if this slot fits within business hours
      if (endTime <= businessHours.end) {
        // Check for conflicts
        const hasConflict = appointments.some(
          (appt) =>
            (appt.startTime >= currentTime && appt.startTime < endTime) ||
            (appt.endTime > currentTime && appt.endTime <= endTime) ||
            (appt.startTime <= currentTime && appt.endTime >= endTime),
        )

        if (!hasConflict) {
          timeSlots.push({
            startTime: currentTime,
            endTime,
            available: true,
          })
        }
      }

      // Move to next time slot
      currentTime = addMinutes(currentTime, businessHours.interval)
    }

    return {
      date: args.date,
      bundleId: args.bundleId,
      duration: bundle.totalDuration,
      availableSlots: timeSlots,
    }
  },
})

// Helper function to calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`
}

// Helper function to add minutes to a time string
function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}

// Cancel a bundle booking
export const cancelBundleBooking = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if it's a bundle booking
    if (!appointment.bundleId) {
      throw new Error("This is not a bundle booking")
    }

    // Update appointment status
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason ? `${appointment.notes || ""}\nCancellation reason: ${args.reason}` : appointment.notes,
      updatedAt: new Date().toISOString(),
    })

    // Decrement bundle redemption count
    const bundle = await ctx.db.get(appointment.bundleId)
    if (bundle) {
      await ctx.db.patch(appointment.bundleId, {
        currentRedemptions: Math.max(0, bundle.currentRedemptions - 1),
      })
    }

    // Update bundle service records
    const serviceRecords = await ctx.db
      .query("bundleServiceRecords")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .collect()

    for (const record of serviceRecords) {
      await ctx.db.patch(record._id, {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      })
    }

    return { success: true }
  },
})
