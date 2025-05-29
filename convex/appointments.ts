import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"

// Create a new appointment
export const createAppointment = mutation({
  args: {
    customerId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    staffId: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    serviceType: v.string(),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for scheduling conflicts
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) =>
        q.or(
          q.and(q.gte(q.field("startTime"), args.startTime), q.lt(q.field("startTime"), args.endTime)),
          q.and(q.gt(q.field("endTime"), args.startTime), q.lte(q.field("endTime"), args.endTime)),
          q.and(q.lte(q.field("startTime"), args.startTime), q.gte(q.field("endTime"), args.endTime)),
        ),
      )
      .collect()

    // If staffId is specified, check if that staff member has conflicts
    if (args.staffId && conflicts.some((c) => c.staffId === args.staffId)) {
      throw new Error("The selected staff member is not available at this time")
    }

    // Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      customerId: args.customerId,
      vehicleId: args.vehicleId,
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      serviceType: args.serviceType,
      status: "scheduled",
      price: args.price,
      notes: args.notes,
      createdAt: new Date().toISOString(),
      reminderSent: false,
      followupSent: false,
    })

    return appointmentId
  },
})

// Update an appointment
export const updateAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    vehicleId: v.optional(v.id("vehicles")),
    staffId: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    serviceType: v.optional(v.string()),
    status: v.optional(v.string()),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { appointmentId, ...updates } = args

    // Check if appointment exists
    const appointment = await ctx.db.get(appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // If changing date/time, check for conflicts
    if ((updates.date || updates.startTime || updates.endTime) && updates.staffId !== null) {
      const date = updates.date || appointment.date
      const startTime = updates.startTime || appointment.startTime
      const endTime = updates.endTime || appointment.endTime
      const staffId = updates.staffId || appointment.staffId

      if (staffId) {
        const conflicts = await ctx.db
          .query("appointments")
          .withIndex("by_date", (q) => q.eq("date", date))
          .filter((q) =>
            q.and(
              q.neq(q.field("_id"), appointmentId),
              q.eq(q.field("staffId"), staffId),
              q.or(
                q.and(q.gte(q.field("startTime"), startTime), q.lt(q.field("startTime"), endTime)),
                q.and(q.gt(q.field("endTime"), startTime), q.lte(q.field("endTime"), endTime)),
                q.and(q.lte(q.field("startTime"), startTime), q.gte(q.field("endTime"), endTime)),
              ),
            ),
          )
          .collect()

        if (conflicts.length > 0) {
          throw new Error("The selected staff member is not available at this time")
        }
      }
    }

    // Add updatedAt timestamp
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update the appointment
    await ctx.db.patch(appointmentId, updatedFields)

    return appointmentId
  },
})

// Cancel an appointment
export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if appointment exists
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Update the appointment status
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason ? `${appointment.notes || ""}\nCancellation reason: ${args.reason}` : appointment.notes,
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Get appointments for a specific date
export const getAppointmentsByDate = query({
  args: {
    date: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("appointments").withIndex("by_date", (q) => q.eq("date", args.date))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const appointments = await query.collect()

    // Fetch additional information for each appointment
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (appointment) => {
        let customerName = "Unknown Customer"
        let vehicleInfo = null
        let staffName = null

        // Get customer info
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), appointment.customerId))
          .first()

        if (user) {
          customerName = user.name
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
          customerName,
          vehicleInfo,
          staffName,
        }
      }),
    )

    return appointmentsWithDetails
  },
})

// Get appointments for a customer
export const getCustomerAppointments = query({
  args: {
    customerId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .order("desc")

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const appointments = await query.take(args.limit || 10)

    // Fetch vehicle info for each appointment
    const appointmentsWithVehicles = await Promise.all(
      appointments.map(async (appointment) => {
        let vehicleInfo = null

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

        return {
          ...appointment,
          vehicleInfo,
        }
      }),
    )

    return appointmentsWithVehicles
  },
})

// Get appointments for a staff member
export const getStaffAppointments = query({
  args: {
    staffId: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If endDate is not provided, use startDate (single day)
    const endDate = args.endDate || args.startDate

    // Get all appointments in the date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), endDate)))
      .collect()

    // Filter by status if provided
    const filteredAppointments = args.status ? appointments.filter((a) => a.status === args.status) : appointments

    // Fetch additional information for each appointment
    const appointmentsWithDetails = await Promise.all(
      filteredAppointments.map(async (appointment) => {
        let customerName = "Unknown Customer"
        let vehicleInfo = null

        // Get customer info
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), appointment.customerId))
          .first()

        if (user) {
          customerName = user.name
        }

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

        return {
          ...appointment,
          customerName,
          vehicleInfo,
        }
      }),
    )

    return appointmentsWithDetails
  },
})

// Check availability for scheduling
export const checkAvailability = action({
  args: {
    date: v.string(),
    serviceType: v.string(),
    duration: v.optional(v.number()), // in minutes
  },
  handler: async (ctx, args) => {
    // Get service duration if not provided
    let serviceDuration = args.duration || 60 // default 1 hour

    if (!args.duration) {
      // Try to get duration from service packages
      const servicePackage = await ctx.db
        .query("servicePackages")
        .filter((q) => q.eq(q.field("name"), args.serviceType))
        .first()

      if (servicePackage) {
        serviceDuration = servicePackage.duration
      }
    }

    // Get business hours (9 AM to 5 PM by default)
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

    // Get all staff members
    const staffMembers = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect()

    // Get staff availability for the date
    const staffAvailability = await ctx.db
      .query("staffAvailability")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect()

    // Create time slots
    const timeSlots = []
    let currentTime = businessHours.start

    while (currentTime < businessHours.end) {
      const endTime = addMinutes(currentTime, serviceDuration)

      // Check if this slot fits within business hours
      if (endTime <= businessHours.end) {
        const availableStaff = staffMembers.filter((staff) => {
          // Check if staff is available for this time slot
          const staffAvail = staffAvailability.find(
            (a) =>
              a.staffId === staff.userId &&
              a.date === args.date &&
              a.isAvailable &&
              a.startTime <= currentTime &&
              a.endTime >= endTime,
          )

          // If no specific availability record, assume available during business hours
          const hasAvailabilityRecord = staffAvailability.some(
            (a) => a.staffId === staff.userId && a.date === args.date,
          )

          if (!hasAvailabilityRecord) {
            // Check if staff has any conflicting appointments
            const hasConflict = appointments.some(
              (appt) =>
                appt.staffId === staff.userId &&
                ((appt.startTime >= currentTime && appt.startTime < endTime) ||
                  (appt.endTime > currentTime && appt.endTime <= endTime) ||
                  (appt.startTime <= currentTime && appt.endTime >= endTime)),
            )

            return !hasConflict
          }

          return !!staffAvail
        })

        if (availableStaff.length > 0) {
          timeSlots.push({
            startTime: currentTime,
            endTime,
            availableStaff: availableStaff.map((staff) => ({
              id: staff.userId,
              name: staff.name,
              role: staff.role,
            })),
          })
        }
      }

      // Move to next time slot
      currentTime = addMinutes(currentTime, businessHours.interval)
    }

    return {
      date: args.date,
      serviceType: args.serviceType,
      duration: serviceDuration,
      availableTimeSlots: timeSlots,
    }
  },
})

// Helper function to add minutes to a time string (HH:MM)
function addMinutes(timeStr, minutes) {
  const [hours, mins] = timeStr.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}

// Complete an appointment and create detailing record
export const completeAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    notes: v.optional(v.string()),
    productsUsed: v.optional(v.array(v.id("products"))),
    beforeImages: v.optional(v.array(v.string())),
    afterImages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if appointment exists
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Update appointment status
    await ctx.db.patch(args.appointmentId, {
      status: "completed",
      notes: args.notes || appointment.notes,
      updatedAt: new Date().toISOString(),
    })

    // Create detailing record if vehicle is associated
    if (appointment.vehicleId) {
      const detailingRecordId = await ctx.db.insert("detailingRecords", {
        vehicleId: appointment.vehicleId,
        userId: appointment.customerId,
        service: appointment.serviceType,
        date: appointment.date,
        price: appointment.price,
        staffId: appointment.staffId,
        notes: args.notes || appointment.notes,
        products: args.productsUsed,
        beforeImages: args.beforeImages,
        afterImages: args.afterImages,
        createdAt: new Date().toISOString(),
      })

      // Record product usage
      if (args.productsUsed && args.productsUsed.length > 0) {
        for (const productId of args.productsUsed) {
          await ctx.db.insert("productUsage", {
            vehicleId: appointment.vehicleId,
            productId,
            detailingRecordId,
            date: appointment.date,
            quantity: 1, // Default quantity
            createdAt: new Date().toISOString(),
          })

          // Update inventory
          await ctx.db.insert("inventoryTransactions", {
            productId,
            type: "use",
            quantity: -1,
            date: appointment.date,
            staffId: appointment.staffId,
            appointmentId: args.appointmentId,
            notes: `Used for ${appointment.serviceType}`,
            createdAt: new Date().toISOString(),
          })
        }
      }

      // Send follow-up request for feedback
      await ctx.db.patch(args.appointmentId, {
        followupSent: true,
      })

      return {
        success: true,
        appointmentId: args.appointmentId,
        detailingRecordId,
      }
    }

    return {
      success: true,
      appointmentId: args.appointmentId,
    }
  },
})

// Get upcoming appointments
export const getUpcomingAppointments = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7
    const today = new Date().toISOString().split("T")[0]

    // Calculate end date
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)
    const endDateStr = endDate.toISOString().split("T")[0]

    // Get appointments in date range
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), today),
          q.lte(q.field("date"), endDateStr),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
        ),
      )
      .collect()

    // Group by date
    const groupedAppointments = {}

    for (const appointment of appointments) {
      if (!groupedAppointments[appointment.date]) {
        groupedAppointments[appointment.date] = []
      }
      groupedAppointments[appointment.date].push(appointment)
    }

    // Sort each day's appointments by time
    for (const date in groupedAppointments) {
      groupedAppointments[date].sort((a, b) => {
        if (a.startTime < b.startTime) return -1
        if (a.startTime > b.startTime) return 1
        return 0
      })
    }

    return groupedAppointments
  },
})
