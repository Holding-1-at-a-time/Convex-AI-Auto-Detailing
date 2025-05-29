export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  quietHoursStart?: string // "22:00"
  quietHoursEnd?: string // "08:00"
  timezone?: string
  reminderTiming: {
    appointment: number // hours before appointment
    followUp: number // hours after appointment
  }
  notificationTypes: {
    confirmations: boolean
    reminders: boolean
    cancellations: boolean
    rescheduling: boolean
    marketing: boolean
    feedback: boolean
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
  businessPhone: string
  businessEmail: string
  businessAddress?: string
  serviceType: string
  appointmentDate: string
  appointmentTime: string
  duration?: string
  price?: string
  vehicleInfo?: string
  location?: string
  cancellationReason?: string
  refundAmount?: string
  rescheduleReason?: string
  originalDate?: string
  originalTime?: string
  rescheduleLink?: string
  cancelLink?: string
  rebookLink?: string
  feedbackLink?: string
}

export interface NotificationRequest {
  type:
    | "appointment_confirmation"
    | "appointment_reminder"
    | "appointment_cancelled"
    | "appointment_rescheduled"
    | "feedback_request"
  recipient: {
    email?: string
    phone?: string
    name: string
    preferences?: NotificationPreferences
  }
  data: NotificationData
  businessId: string
  appointmentId?: string
  scheduledFor?: string // ISO date string for scheduled notifications
  priority?: "low" | "medium" | "high" | "urgent"
}

export interface NotificationLog {
  id: string
  type: string
  recipient: string
  channel: "email" | "sms" | "push"
  status: "pending" | "sent" | "delivered" | "failed" | "bounced"
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  businessId: string
  appointmentId?: string
}

export interface NotificationStats {
  total: number
  sent: number
  delivered: number
  failed: number
  deliveryRate: number
  byType: Record<string, number>
  byChannel: Record<string, number>
}
