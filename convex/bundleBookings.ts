import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError, type Id } from "./_generated/dataModel"

// Helper function to add minutes to a time string (HH:MM)
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}

async function checkTimeSlotAvailability(
  ctx: any,
  businessId: Id<"businessProfiles">,
  date: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const existingBookings = await ctx.db
    .query("appointments")
    .withIndex("by_businessId_date", (q) => q.eq("businessId", businessId).eq("date", date))
    .collect()

  for (const booking of existingBookings) {
    if (
      (startTime >= booking.startTime && startTime < booking.endTime) ||
      (endTime > booking.startTime && endTime <= booking.endTime) ||
      (startTime <= booking.startTime && endTime >= booking.endTime)
    ) {
      return false // Time slot is not available
    }
  }

  return true // Time slot is available
}

export const rescheduleBundleBooking = mutation({
  args: {
    bookingId: v.string(),
    newDate: v.string(),
    newTime: v.string(),
    reason: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, { bookingId, newDate, newTime, reason, userId }) => {
    // Get the existing booking
    const booking = await ctx.db.get(bookingId as Id<"appointments">)
    if (!booking) {
      throw new ConvexError("Booking not found")
    }

    // Verify ownership
    if (booking.customerId !== userId) {
      throw new ConvexError("Unauthorized to reschedule this booking")
    }

    // Check if booking can be rescheduled (not too close to appointment time)
    const appointmentTime = new Date(`${booking.date}T${booking.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilAppointment < 24) {
      throw new ConvexError("Cannot reschedule within 24 hours of appointment")
    }

    // Check availability for new slot
    const newEndTime = addMinutesToTime(newTime, Number.parseInt(booking.serviceType.split("-")[1]) || 60)
    const isAvailable = await checkTimeSlotAvailability(ctx, booking.businessId!, newDate, newTime, newEndTime)

    if (!isAvailable) {
      throw new ConvexError("Selected time slot is not available")
    }

    // Update the booking with reschedule history
    const rescheduleRecord = {
      originalDate: booking.date,
      originalStartTime: booking.startTime,
      originalEndTime: booking.endTime,
      newDate,
      newStartTime: newTime,
      newEndTime: newEndTime,
      reason: reason || "Customer requested reschedule",
      rescheduledBy: userId,
      rescheduledAt: new Date().toISOString(),
    }

    await ctx.db.patch(bookingId as Id<"appointments">, {
      date: newDate,
      startTime: newTime,
      endTime: newEndTime,
      updatedAt: new Date().toISOString(),
      rescheduleHistory: [...(booking.rescheduleHistory || []), rescheduleRecord],
    })

    // Get updated booking details for email
    const updatedBooking = await ctx.db.get(bookingId as Id<"appointments">)
    const bundle = await ctx.db.get(booking.bundleId as Id<"serviceBundles">)
    const business = await ctx.db.get(booking.businessId as Id<"businessProfiles">)

    return {
      success: true,
      booking: {
        customerEmail: updatedBooking?.customerEmail || "",
        customerName: updatedBooking?.customerName || "",
        bundleName: bundle?.name || "",
        businessName: business?.name || "",
        totalPrice: updatedBooking?.price || 0,
      },
    }
  },
})
