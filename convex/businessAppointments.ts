import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyUserRole } from "./utils/auth"

// Get appointments for a business
export const getBusinessAppointments = query({
  args: {
    businessId: v.id("businessProfiles"),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only view your own business appointments")
    }

    // Get all appointments for this business
    const query = ctx.db.query("appointments").withIndex("by_businessId", (q) => q.eq("businessId", args.businessId))

    const appointments = await query.collect()

    let filteredAppointments = appointments

    // Filter by status
    if (args.status) {
      filteredAppointments = filteredAppointments.filter((apt) => apt.status === args.status)
    }

    // Filter by date range
    if (args.startDate) {
      filteredAppointments = filteredAppointments.filter((apt) => apt.date >= args.startDate!)
    }
    if (args.endDate) {
      filteredAppointments = filteredAppointments.filter((apt) => apt.date <= args.endDate!)
    }

    // Get additional details for each appointment
    const appointmentsWithDetails = await Promise.all(
      filteredAppointments.map(async (appointment) => {
        // Get customer info
        const customer = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", appointment.customerId))
          .first()

        // Get service info
        const service = appointment.serviceId ? await ctx.db.get(appointment.serviceId) : null

        // Get vehicle info
        const vehicle = appointment.vehicleId ? await ctx.db.get(appointment.vehicleId) : null

        return {
          ...appointment,
          customerName: customer?.name || "Unknown Customer",
          customerEmail: customer?.email,
          serviceName: service?.name || appointment.serviceType,
          servicePrice: service?.price || appointment.price,
          vehicleInfo: vehicle
            ? {
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                color: vehicle.color,
              }
            : null,
        }
      }),
    )

    // Sort by date and time
    appointmentsWithDetails.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare === 0) {
        return a.startTime.localeCompare(b.startTime)
      }
      return dateCompare
    })

    // Apply limit
    const limit = args.limit || 100
    return appointmentsWithDetails.slice(0, limit)
  },
})

// Create appointment for business
export const createBusinessAppointment = mutation({
  args: {
    businessId: v.id("businessProfiles"),
    customerId: v.string(),
    serviceId: v.id("businessServices"),
    vehicleId: v.optional(v.id("vehicles")),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "admin"])

    // Get business profile to verify ownership
    const businessProfile = await ctx.db.get(args.businessId)
    if (!businessProfile) {
      throw new Error("Business profile not found")
    }

    // Ensure user owns this business (unless admin)
    if (user.role !== "admin" && businessProfile.userId !== user.clerkId) {
      throw new Error("Unauthorized: You can only create appointments for your own business")
    }

    // Get service details
    const service = await ctx.db.get(args.serviceId)
    if (!service) {
      throw new Error("Service not found")
    }

    // Check for scheduling conflicts
    const conflicts = await ctx.db
      .query("appointments")
      .withIndex("by_businessId_date", (q) => q.eq("businessId", args.businessId).eq("date", args.date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.or(
            q.and(q.gte(q.field("startTime"), args.startTime), q.lt(q.field("startTime"), args.endTime)),
            q.and(q.gt(q.field("endTime"), args.startTime), q.lte(q.field("endTime"), args.endTime)),
            q.and(q.lte(q.field("startTime"), args.startTime), q.gte(q.field("endTime"), args.endTime)),
          ),
        ),
      )
      .collect()

    if (conflicts.length > 0) {
      throw new Error("Time slot conflicts with existing appointment")
    }

    // Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      businessId: args.businessId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      vehicleId: args.vehicleId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      serviceType: service.name,
      price: service.price,
      status: "scheduled",
      notes: args.notes,
      createdAt: new Date().toISOString(),
      reminderSent: false,
      followupSent: false,
    })

    return appointmentId
  },
})

// Update appointment status
export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized
    const { user } = await verifyUserRole(ctx, ["business", "customer", "admin"])

    // Get appointment
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Verify authorization based on role
    if (user.role === "business") {
      const businessProfile = await ctx.db.get(appointment.businessId)
      if (!businessProfile || businessProfile.userId !== user.clerkId) {
        throw new Error("Unauthorized: You can only update your own business appointments")
      }
    } else if (user.role === "customer") {
      if (appointment.customerId !== user.clerkId) {
        throw new Error("Unauthorized: You can only update your own appointments")
      }
    }

    await ctx.db.patch(args.appointmentId, {
      status: args.status,
      notes: args.notes || appointment.notes,
      updatedAt: new Date().toISOString(),
    })

    return args.appointmentId
  },
})
