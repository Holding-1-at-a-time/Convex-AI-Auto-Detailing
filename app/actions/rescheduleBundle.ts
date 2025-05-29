"use server"

import { auth } from "@clerk/nextjs/server"
import { api } from "@/convex/_generated/api"
import { ConvexError } from "convex/values"
import { sendBookingConfirmation } from "@/lib/email-service"

export async function rescheduleBundle(prevState: any, formData: FormData) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Authentication required" }
    }

    const bookingId = formData.get("bookingId") as string
    const newDate = formData.get("newDate") as string
    const newTime = formData.get("newTime") as string
    const reason = formData.get("reason") as string

    if (!bookingId || !newDate || !newTime) {
      return { success: false, error: "Missing required fields" }
    }

    // Validate new date is in the future
    const selectedDateTime = new Date(`${newDate}T${newTime}`)
    if (selectedDateTime <= new Date()) {
      return { success: false, error: "Please select a future date and time" }
    }

    const result = await api.bundleBookings.rescheduleBundleBooking({
      bookingId,
      newDate,
      newTime,
      reason,
      userId,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Send confirmation email for rescheduled booking
    if (result.booking) {
      const emailData = {
        customerEmail: result.booking.customerEmail,
        customerName: result.booking.customerName,
        bundleName: result.booking.bundleName,
        bookingDate: newDate,
        bookingTime: newTime,
        businessName: result.booking.businessName,
        totalPrice: result.booking.totalPrice,
        bookingId: bookingId,
      }

      await sendBookingConfirmation(emailData)
    }

    return { success: true, message: "Booking rescheduled successfully" }
  } catch (error) {
    console.error("Reschedule error:", error)
    if (error instanceof ConvexError) {
      return { success: false, error: error.data }
    }
    return { success: false, error: "Failed to reschedule booking" }
  }
}
