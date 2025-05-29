import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface BookingEmailData {
  customerEmail: string
  customerName: string
  bundleName: string
  bookingDate: string
  bookingTime: string
  businessName: string
  totalPrice: number
  bookingId: string
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: "bookings@autodetailing.com",
      to: data.customerEmail,
      subject: `Booking Confirmed: ${data.bundleName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Confirmation</h2>
          <p>Dear ${data.customerName},</p>
          <p>Your booking has been confirmed! Here are the details:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Service Bundle: ${data.bundleName}</h3>
            <p><strong>Date:</strong> ${data.bookingDate}</p>
            <p><strong>Time:</strong> ${data.bookingTime}</p>
            <p><strong>Business:</strong> ${data.businessName}</p>
            <p><strong>Total Price:</strong> $${data.totalPrice}</p>
            <p><strong>Booking ID:</strong> ${data.bookingId}</p>
          </div>
          
          <p>We look forward to serving you!</p>
          <p>If you need to reschedule or cancel, please contact us or use your customer dashboard.</p>
        </div>
      `,
    })

    if (error) {
      console.error("Email sending failed:", error)
      return { success: false, error }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error("Email service error:", error)
    return { success: false, error }
  }
}

export async function sendBookingReminder(data: BookingEmailData) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: "reminders@autodetailing.com",
      to: data.customerEmail,
      subject: `Reminder: Your appointment tomorrow - ${data.bundleName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Appointment Reminder</h2>
          <p>Dear ${data.customerName},</p>
          <p>This is a friendly reminder about your upcoming appointment:</p>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.bundleName}</h3>
            <p><strong>Date:</strong> ${data.bookingDate}</p>
            <p><strong>Time:</strong> ${data.bookingTime}</p>
            <p><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <p>Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.</p>
        </div>
      `,
    })

    return { success: true, data: emailData }
  } catch (error) {
    console.error("Reminder email error:", error)
    return { success: false, error }
  }
}

export async function sendCancellationConfirmation(data: BookingEmailData & { cancellationReason?: string }) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: "bookings@autodetailing.com",
      to: data.customerEmail,
      subject: `Booking Cancelled: ${data.bundleName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Booking Cancelled</h2>
          <p>Dear ${data.customerName},</p>
          <p>Your booking has been cancelled as requested:</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.bundleName}</h3>
            <p><strong>Original Date:</strong> ${data.bookingDate}</p>
            <p><strong>Original Time:</strong> ${data.bookingTime}</p>
            <p><strong>Booking ID:</strong> ${data.bookingId}</p>
            ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ""}
          </div>
          
          <p>If this was a mistake or you'd like to book again, please visit our website.</p>
        </div>
      `,
    })

    return { success: true, data: emailData }
  } catch (error) {
    console.error("Cancellation email error:", error)
    return { success: false, error }
  }
}
