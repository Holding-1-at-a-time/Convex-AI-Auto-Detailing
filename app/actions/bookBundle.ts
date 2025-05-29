import { sendBookingConfirmation, type BookingEmailData } from "@/lib/email-service"
import { db } from "@/lib/db"
import { getBusinessById } from "@/lib/db/businesses"
import { getBundleById } from "@/lib/db/bundles"
import { getCustomerByEmail } from "@/lib/db/customers"
import { type NewBooking, bookings } from "@/lib/db/schema"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const bookingSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  date: z.string(),
  time: z.string(),
  bundleId: z.string(),
  businessId: z.string(),
})

export async function bookBundle(formData: FormData) {
  "use server"

  const values = Object.fromEntries(formData.entries())
  console.log(values)

  const { name, email, phone, date, time, bundleId, businessId } = bookingSchema.parse(values)

  const business = await getBusinessById(businessId)
  const bundle = await getBundleById(bundleId)

  if (!business || !bundle) {
    return {
      error: "Business or bundle not found",
    }
  }

  let customer = await getCustomerByEmail(email)

  if (!customer) {
    customer = await db
      .insert(customers)
      .values({
        name,
        email,
        phone,
      })
      .returning()
      .then((rows) => rows[0])
  }

  if (!customer) {
    return {
      error: "Failed to create customer",
    }
  }

  try {
    const booking: NewBooking = {
      customerId: customer.id,
      businessId: business.id,
      bundleId: bundle.id,
      date,
      time,
      total: bundle.discountedPrice,
    }

    const [newBooking] = await db.insert(bookings).values(booking).returning()

    revalidatePath("/")
    revalidatePath("/bookings")

    // Send confirmation email
    if (newBooking) {
      const emailData: BookingEmailData = {
        customerEmail: email,
        customerName: name,
        bundleName: bundle.name,
        bookingDate: date,
        bookingTime: time,
        businessName: business?.name || "Auto Detailing Service",
        totalPrice: bundle.discountedPrice,
        bookingId: newBooking.id,
      }

      await sendBookingConfirmation(emailData)
    }

    return {
      success: true,
      bookingId: newBooking.id,
    }
  } catch (e: any) {
    console.log(e)
    return {
      error: e.message,
    }
  }
}
