export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<EmailResult>
}

export interface SMSProvider {
  sendSMS(params: SMSParams): Promise<SMSResult>
}

export interface EmailParams {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export interface SMSParams {
  to: string
  message: string
  from?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface NotificationTemplate {
  subject: string
  html: string
  sms: string
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
  reason?: string
  confirmationUrl?: string
  rescheduleUrl?: string
  cancelUrl?: string
}
