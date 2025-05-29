"use server"

import { api } from "@/convex/_generated/api"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { auth } from "@clerk/nextjs/server"
import type { Id } from "@/convex/_generated/dataModel"

export type BookBundleState = {
  success?: boolean
  error?: string
  appointmentId?: string
  bundleId?: string
}

export async function bookBundle(prevState: BookBundleState | null, formData: FormData): Promise<BookBundleState> {
  try {
    // Get authenticated user
    const { userId } = auth()
    if (!userId) {
      return { error: "You must be signed in to book a bundle" }
    }

    // Extract form data
    const bundleId = formData.get("bundleId") as string
    const date = formData.get("date") as string
    const time = formData.get("time") as string
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const vehicleId = formData.get("vehicleId") as string
    const notes = formData.get("notes") as string

    // Validate required fields
    if (!bundleId || !date || !time || !name || !email) {
      return { error: "Please fill in all required fields" }
    }

    // Validate date is not in the past
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      return { error: "Please select a future date" }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: "Please enter a valid email address" }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^[\d\s\-+$$$$]+$/
      if (!phoneRegex.test(phone) || phone.replace(/\D/g, "").length < 10) {
        return { error: "Please enter a valid phone number" }
      }
    }

    // Check availability one more time
    const availability = await fetchQuery(api.bundleBookings.getBundleAvailability, {
      bundleId: bundleId as Id<"serviceBundles">,
      date,
    })

    const isSlotAvailable = availability.availableSlots.some((slot) => slot.startTime === time && slot.available)

    if (!isSlotAvailable) {
      return { error: "This time slot is no longer available. Please select another time." }
    }

    // Create the booking
    const result = await fetchMutation(api.bundleBookings.createBundleBooking, {
      bundleId: bundleId as Id<"serviceBundles">,
      customerId: userId,
      date,
      startTime: time,
      customerInfo: {
        name,
        email,
        phone: phone || undefined,
      },
      vehicleId: vehicleId ? (vehicleId as Id<"vehicles">) : undefined,
      notes: notes || undefined,
    })

    if (result.success) {
      return {
        success: true,
        appointmentId: result.appointmentId,
        bundleId: result.bundleId,
      }
    } else {
      return { error: "Failed to create booking. Please try again." }
    }
  } catch (error) {
    console.error("Bundle booking error:", error)

    // Handle specific error messages
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return { error: "This bundle has expired and is no longer available." }
      }
      if (error.message.includes("sold out")) {
        return { error: "This bundle is sold out." }
      }
      if (error.message.includes("not yet available")) {
        return { error: "This bundle is not yet available for booking." }
      }
      if (error.message.includes("not available")) {
        return { error: "This time slot is not available. Please select another time." }
      }

      return { error: error.message }
    }

    return { error: "An unexpected error occurred. Please try again." }
  }
}
