import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

// Get customer profile by user ID
export const getCustomerProfileByUserId = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // First check in customerProfiles table
    const customerProfile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (customerProfile) {
      return customerProfile
    }

    // If not found, check in users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first()

    if (user) {
      return {
        userId: user.clerkId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        notificationPreferences: {
          email: true,
          sms: !!user.phone,
          push: false,
        },
      }
    }

    return null
  },
})

// Get customer vehicles
export const getCustomerVehicles = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    return vehicles
  },
})

// Get customer appointments
export const getCustomerAppointments = internalQuery({
  args: {
    userId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.userId))
      .order("desc")

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    const appointments = await query.take(args.limit || 10)

    // Fetch vehicle info for each appointment
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (appointment) => {
        let vehicleInfo = null
        let serviceInfo = null
        let businessInfo = null

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
            }
          }
        }

        if (appointment.businessId) {
          const business = await ctx.db.get(appointment.businessId)
          if (business) {
            businessInfo = {
              name: business.businessName,
              address: business.address,
              city: business.city,
              state: business.state,
            }
          }
        }

        return {
          ...appointment,
          vehicleInfo,
          serviceInfo,
          businessInfo,
        }
      }),
    )

    return appointmentsWithDetails
  },
})
