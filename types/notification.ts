export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  reminderTiming: {
    days: number[]
    hours: number[]
  }
  quietHours: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
}

export interface NotificationTemplate {
  type:
    | "booking_confirmation"
    | "booking_reminder"
    | "booking_cancelled"
    | "booking_rescheduled"
    | "service_complete"
    | "payment_reminder"
  subject: string
  emailTemplate: string
  smsTemplate: string
}

export interface NotificationData {
  customerName: string
  businessName: string
  serviceType: string
  date: string
  startTime: string
  endTime: string
  price: number
  appointmentId: string
  vehicleInfo?: string
  bundleName?: string
  confirmationUrl?: string
  rescheduleUrl?: string
  cancelUrl?: string
  reason?: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
}

export interface NotificationLog {
  _id: string
  type: string
  recipient: string
  method: "email" | "sms"
  status: "queued" | "sent" | "failed" | "delivered"
  appointmentId?: string
  businessId?: string
  customerId?: string
  subject?: string
  body: string
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
}
