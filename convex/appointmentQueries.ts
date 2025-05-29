import { v } from "convex/values"
import { query } from "./_generated/server"

// Get appointment by ID with full details
export const getAppointmentById = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    if (!appointment) {
      return null
    }

    // Get additional details
    let businessInfo = null
    let vehicleInfo = null

    // Get business information if available
    if (appointment.businessId) {
      const business = await ctx.db.get(appointment.businessId)
      if (business) {
        businessInfo = {
          businessName: business.name,
          businessDescription: business.description,
          businessAddress: business.address
            ? `${business.address}, ${business.city}, ${business.state} ${business.zip}`
            : null,
          businessPhone: business.phone,
          businessEmail: business.email,
        }
      }
    }

    // Get vehicle information if available
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

    return {
      ...appointment,
      ...businessInfo,
      vehicleInfo,
    }
  },
})
