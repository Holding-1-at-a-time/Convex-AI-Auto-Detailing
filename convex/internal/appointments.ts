import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

// Get appointment with detailed information
export const getAppointmentWithDetails = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      return null
    }

    // Get customer info
    const customer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", appointment.customerId))
      .first()

    // Get vehicle info if available
    let vehicleInfo = null
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
    let staffInfo = null
    if (appointment.staffId) {
      const staff = await ctx.db
        .query("staff")
        .withIndex("by_userId", (q) => q.eq("userId", appointment.staffId))
        .first()

      if (staff) {
        staffInfo = {
          name: staff.name,
          role: staff.role,
        }
      }
    }

    // Get service info
    let serviceInfo = null
    if (appointment.serviceType) {
      const service = await ctx.db
        .query("servicePackages")
        .filter((q) => q.eq(q.field("name"), appointment.serviceType))
        .first()

      if (service) {
        serviceInfo = {
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: service.price,
        }
      }
    }

    // Get business info
    let businessInfo = null
    if (appointment.businessId) {
      const business = await ctx.db.get(appointment.businessId)
      if (business) {
        businessInfo = {
          id: business._id,
          name: business.businessName,
          phone: business.phone,
          email: business.email,
        }
      }
    }

    return {
      ...appointment,
      customer: customer
        ? {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          }
        : null,
      vehicleInfo,
      staffInfo,
      serviceInfo,
      businessInfo,
    }
  },
})

// Check for appointment conflicts
export const checkAppointmentConflicts = internalQuery({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    staffId: v.optional(v.string()),
    excludeAppointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
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

    // Exclude the current appointment if updating
    if (args.excludeAppointmentId) {
      query = query.filter((q) => q.neq(q.field("_id"), args.excludeAppointmentId))
    }

    // Filter by staff if specified
    if (args.staffId) {
      query = query.filter((q) => q.eq(q.field("staffId"), args.staffId))
    }

    const conflicts = await query.collect()

    return conflicts
  },
})
