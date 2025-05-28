import { v } from "convex/values"
import { internalQuery } from "../_generated/server"

export const getAppointmentWithDetails = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId)
    return appointment
  },
})
