import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Add a new staff member
export const addStaffMember = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(),
    specialties: v.array(v.string()),
    hireDate: v.string(),
    certifications: v.optional(v.array(v.string())),
    schedule: v.optional(v.any()),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if staff with this email already exists
    const existingStaff = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()

    if (existingStaff) {
      throw new Error("A staff member with this email already exists")
    }

    // Create the staff record
    const staffId = await ctx.db.insert("staff", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role,
      specialties: args.specialties,
      hireDate: args.hireDate,
      status: "active",
      certifications: args.certifications || [],
      schedule: args.schedule || {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: { start: "10:00", end: "15:00" },
        sunday: null,
      },
      hourlyRate: args.hourlyRate,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    })

    return staffId
  },
})

// Update a staff member
export const updateStaffMember = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    schedule: v.optional(v.any()),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { staffId, ...updates } = args

    // Check if staff exists
    const staff = await ctx.db.get(staffId)
    if (!staff) {
      throw new Error("Staff member not found")
    }

    // If email is being updated, check for duplicates
    if (updates.email && updates.email !== staff.email) {
      const existingStaff = await ctx.db
        .query("staff")
        .withIndex("by_email", (q) => q.eq("email", updates.email))
        .first()

      if (existingStaff) {
        throw new Error("A staff member with this email already exists")
      }
    }

    // Add updatedAt timestamp
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update the staff record
    await ctx.db.patch(staffId, updatedFields)

    return staffId
  },
})

// Get all staff members
export const getAllStaff = query({
  args: {
    status: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("staff")

    // Filter by status if provided
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status))
    }

    // Filter by role if provided
    if (args.role) {
      query = query.withIndex("by_role", (q) => q.eq("role", args.role))
    }

    const staff = await query.collect()
    return staff
  },
})

// Get a specific staff member
export const getStaffMember = query({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId)
    if (!staff) {
      throw new Error("Staff member not found")
    }

    return staff
  },
})

// Set staff availability for a specific date
export const setStaffAvailability = mutation({
  args: {
    staffId: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if staff exists
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // Check if there's an existing availability record for this date
    const existingAvailability = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staffId_date", (q) => q.eq("staffId", args.staffId).eq("date", args.date))
      .first()

    if (existingAvailability) {
      // Update existing record
      await ctx.db.patch(existingAvailability._id, {
        startTime: args.startTime,
        endTime: args.endTime,
        isAvailable: args.isAvailable,
        reason: args.reason,
        updatedAt: new Date().toISOString(),
      })

      return existingAvailability._id
    } else {
      // Create new record
      const availabilityId = await ctx.db.insert("staffAvailability", {
        staffId: args.staffId,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        isAvailable: args.isAvailable,
        reason: args.reason,
        createdAt: new Date().toISOString(),
      })

      return availabilityId
    }
  },
})

// Get staff availability for a date range
export const getStaffAvailability = query({
  args: {
    staffId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all availability records in the date range
    const availabilityRecords = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
      .collect()

    // Get staff's default schedule
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    const defaultSchedule = staff.schedule || {}

    // Generate dates in the range
    const dates = []
    const start = new Date(args.startDate)
    const end = new Date(args.endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split("T")[0]
      const dayOfWeek = date.toLocaleLowerCase().split(",")[0] // monday, tuesday, etc.

      // Check if there's a specific availability record for this date
      const availabilityRecord = availabilityRecords.find((record) => record.date === dateStr)

      if (availabilityRecord) {
        dates.push({
          date: dateStr,
          startTime: availabilityRecord.startTime,
          endTime: availabilityRecord.endTime,
          isAvailable: availabilityRecord.isAvailable,
          reason: availabilityRecord.reason,
          isCustom: true,
        })
      } else {
        // Use default schedule for this day
        const defaultForDay = defaultSchedule[dayOfWeek]

        if (defaultForDay) {
          dates.push({
            date: dateStr,
            startTime: defaultForDay.start,
            endTime: defaultForDay.end,
            isAvailable: true,
            isCustom: false,
          })
        } else {
          // Day off in default schedule
          dates.push({
            date: dateStr,
            isAvailable: false,
            isCustom: false,
          })
        }
      }
    }

    return {
      staffId: args.staffId,
      name: staff.name,
      dates,
    }
  },
})

// Record staff performance
export const recordStaffPerformance = mutation({
  args: {
    staffId: v.string(),
    period: v.string(), // "2025-04" (YYYY-MM)
    servicesCompleted: v.number(),
    revenue: v.number(),
    customerRating: v.optional(v.number()),
    efficiency: v.optional(v.number()),
    upsellRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if staff exists
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // Check if there's an existing performance record for this period
    const existingRecord = await ctx.db
      .query("staffPerformance")
      .withIndex("by_staffId_period", (q) => q.eq("staffId", args.staffId).eq("period", args.period))
      .first()

    if (existingRecord) {
      // Update existing record
      await ctx.db.patch(existingRecord._id, {
        servicesCompleted: args.servicesCompleted,
        revenue: args.revenue,
        customerRating: args.customerRating,
        efficiency: args.efficiency,
        upsellRate: args.upsellRate,
        notes: args.notes,
        updatedAt: new Date().toISOString(),
      })

      return existingRecord._id
    } else {
      // Create new record
      const performanceId = await ctx.db.insert("staffPerformance", {
        staffId: args.staffId,
        period: args.period,
        servicesCompleted: args.servicesCompleted,
        revenue: args.revenue,
        customerRating: args.customerRating,
        efficiency: args.efficiency,
        upsellRate: args.upsellRate,
        notes: args.notes,
        createdAt: new Date().toISOString(),
      })

      return performanceId
    }
  },
})

// Get staff performance
export const getStaffPerformance = query({
  args: {
    staffId: v.string(),
    period: v.optional(v.string()),
    startPeriod: v.optional(v.string()),
    endPeriod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if staff exists
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // If specific period is requested
    if (args.period) {
      const performance = await ctx.db
        .query("staffPerformance")
        .withIndex("by_staffId_period", (q) => q.eq("staffId", args.staffId).eq("period", args.period))
        .first()

      return performance || null
    }

    // If period range is requested
    if (args.startPeriod && args.endPeriod) {
      const performances = await ctx.db
        .query("staffPerformance")
        .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
        .filter((q) => q.and(q.gte(q.field("period"), args.startPeriod), q.lte(q.field("period"), args.endPeriod)))
        .collect()

      return performances
    }

    // Default: get all performance records
    const performances = await ctx.db
      .query("staffPerformance")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .collect()

    return performances
  },
})

// Assign staff to appointment
export const assignStaffToAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    staffId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if appointment exists
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Check if staff exists
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // Check for scheduling conflicts
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), appointment.date),
          q.neq(q.field("_id"), args.appointmentId),
          q.neq(q.field("status"), "cancelled"),
          q.or(
            q.and(q.gte(q.field("startTime"), appointment.startTime), q.lt(q.field("startTime"), appointment.endTime)),
            q.and(q.gt(q.field("endTime"), appointment.startTime), q.lte(q.field("endTime"), appointment.endTime)),
            q.and(q.lte(q.field("startTime"), appointment.startTime), q.gte(q.field("endTime"), appointment.endTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      throw new Error("Staff member has a scheduling conflict")
    }

    // Check staff availability
    const availability = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staffId_date", (q) => q.eq("staffId", args.staffId).eq("date", appointment.date))
      .first()

    if (availability) {
      if (!availability.isAvailable) {
        throw new Error("Staff member is not available on this date")
      }

      if (appointment.startTime < availability.startTime || appointment.endTime > availability.endTime) {
        throw new Error("Appointment time is outside of staff member's available hours")
      }
    }

    // Update the appointment
    await ctx.db.patch(args.appointmentId, {
      staffId: args.staffId,
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Get staff schedule
export const getStaffSchedule = query({
  args: {
    staffId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if staff exists
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), args.staffId))
      .first()

    if (!staff) {
      throw new Error("Staff member not found")
    }

    // Get all appointments in the date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect()

    // Get availability records
    const availabilityRecords = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .filter((q) => q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate)))
      .collect()

    // Format appointments with customer and service info
    const formattedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
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

    return {
      staffId: args.staffId,
      name: staff.name,
      role: staff.role,
      appointments: formattedAppointments,
      availability: availabilityRecords,
    }
  },
})
