import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * APPOINTMENT VALIDATION FUNCTIONS
 * Comprehensive validation for appointment booking
 */

// Validate appointment time slot
export const validateAppointmentSlot = query({
  args: {
    businessId: v.id("businessProfiles"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    excludeAppointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const validationResults = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    }

    // 1. Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(args.date)) {
      validationResults.isValid = false
      validationResults.errors.push("Invalid date format. Use YYYY-MM-DD")
      return validationResults
    }

    // 2. Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(args.startTime) || !timeRegex.test(args.endTime)) {
      validationResults.isValid = false
      validationResults.errors.push("Invalid time format. Use HH:MM (24-hour format)")
      return validationResults
    }

    // 3. Check if start time is before end time
    if (args.startTime >= args.endTime) {
      validationResults.isValid = false
      validationResults.errors.push("Start time must be before end time")
      return validationResults
    }

    // 4. Check if date is in the future
    const appointmentDate = new Date(args.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (appointmentDate < today) {
      validationResults.isValid = false
      validationResults.errors.push("Cannot book appointments in the past")
      return validationResults
    }

    // 5. Check business availability
    const businessAvailability = await ctx.db
      .query("businessAvailability")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .first()

    if (businessAvailability) {
      const availableSlot = businessAvailability.slots.find(
        (slot) => slot.available && slot.startTime <= args.startTime && slot.endTime >= args.endTime,
      )

      if (!availableSlot) {
        validationResults.isValid = false
        validationResults.errors.push("Selected time slot is not available")
        return validationResults
      }
    }

    // 6. Check for appointment conflicts
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          args.excludeAppointmentId
            ? q.neq(q.field("_id"), args.excludeAppointmentId)
            : q.eq(q.field("_id"), q.field("_id")),
          q.or(
            q.and(q.gte(q.field("startTime"), args.startTime), q.lt(q.field("startTime"), args.endTime)),
            q.and(q.gt(q.field("endTime"), args.startTime), q.lte(q.field("endTime"), args.endTime)),
            q.and(q.lte(q.field("startTime"), args.startTime), q.gte(q.field("endTime"), args.endTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      validationResults.isValid = false
      validationResults.errors.push("Time slot conflicts with existing appointment")
      return validationResults
    }

    // 7. Validate service exists
    const service = await ctx.db
      .query("servicePackages")
      .filter((q) => q.eq(q.field("name"), args.serviceType))
      .first()

    if (!service) {
      validationResults.isValid = false
      validationResults.errors.push("Selected service does not exist")
      return validationResults
    }

    // 8. Check if appointment duration matches service duration
    const appointmentDuration = calculateDurationInMinutes(args.startTime, args.endTime)
    if (service.duration && Math.abs(appointmentDuration - service.duration) > 15) {
      validationResults.warnings.push(
        `Appointment duration (${appointmentDuration}min) differs from service duration (${service.duration}min)`,
      )
    }

    return validationResults
  },
})

// Validate business hours update
export const validateBusinessHoursUpdate = query({
  args: {
    businessId: v.id("businessProfiles"),
    businessHours: v.object({
      monday: v.optional(v.object({ open: v.string(), close: v.string() })),
      tuesday: v.optional(v.object({ open: v.string(), close: v.string() })),
      wednesday: v.optional(v.object({ open: v.string(), close: v.string() })),
      thursday: v.optional(v.object({ open: v.string(), close: v.string() })),
      friday: v.optional(v.object({ open: v.string(), close: v.string() })),
      saturday: v.optional(v.object({ open: v.string(), close: v.string() })),
      sunday: v.optional(v.object({ open: v.string(), close: v.string() })),
    }),
  },
  handler: async (ctx, args) => {
    const validationResults = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      affectedAppointments: [] as any[],
    }

    // Validate time formats
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    for (const day of days) {
      const hours = args.businessHours[day]
      if (hours) {
        if (!timeRegex.test(hours.open) || !timeRegex.test(hours.close)) {
          validationResults.isValid = false
          validationResults.errors.push(`Invalid time format for ${day}. Use HH:MM (24-hour format)`)
        }

        if (hours.open >= hours.close) {
          validationResults.isValid = false
          validationResults.errors.push(`For ${day}, opening time must be before closing time`)
        }
      }
    }

    // Check for affected appointments
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const futureDateStr = futureDate.toISOString().split("T")[0]

    const futureAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), futureDateStr),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
        ),
      )
      .collect()

    for (const appointment of futureAppointments) {
      const appointmentDate = new Date(appointment.date)
      const dayOfWeek = appointmentDate.toLocaleDateString("en-US", { weekday: "lowercase" })
      const newHours = args.businessHours[dayOfWeek]

      if (newHours) {
        if (appointment.startTime < newHours.open || appointment.endTime > newHours.close) {
          validationResults.affectedAppointments.push({
            appointmentId: appointment._id,
            date: appointment.date,
            time: `${appointment.startTime} - ${appointment.endTime}`,
            service: appointment.serviceType,
          })
        }
      } else {
        // Day is being closed
        validationResults.affectedAppointments.push({
          appointmentId: appointment._id,
          date: appointment.date,
          time: `${appointment.startTime} - ${appointment.endTime}`,
          service: appointment.serviceType,
        })
      }
    }

    if (validationResults.affectedAppointments.length > 0) {
      validationResults.warnings.push(
        `${validationResults.affectedAppointments.length} future appointments will be affected by this change`,
      )
    }

    return validationResults
  },
})

// Helper function to calculate duration in minutes
function calculateDurationInMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return endMinutes - startMinutes
}

// Batch validate multiple appointments
export const batchValidateAppointments = query({
  args: {
    appointments: v.array(
      v.object({
        businessId: v.id("businessProfiles"),
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        serviceType: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const results = []

    for (const appointment of args.appointments) {
      const validation = await ctx.db
        .query("appointments")
        .withIndex("by_date", (q) => q.eq("date", appointment.date))
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "cancelled"),
            q.or(
              q.and(
                q.gte(q.field("startTime"), appointment.startTime),
                q.lt(q.field("startTime"), appointment.endTime),
              ),
              q.and(q.gt(q.field("endTime"), appointment.startTime), q.lte(q.field("endTime"), appointment.endTime)),
              q.and(q.lte(q.field("startTime"), appointment.startTime), q.gte(q.field("endTime"), appointment.endTime)),
            ),
          ),
        )
        .collect()

      results.push({
        appointment,
        isValid: validation.length === 0,
        conflicts: validation.length,
      })
    }

    return results
  },
})
