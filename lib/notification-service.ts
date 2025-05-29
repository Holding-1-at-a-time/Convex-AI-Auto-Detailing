import type { EmailProvider, SMSProvider, NotificationData } from "./notification-providers/types"
import { ResendEmailProvider } from "./notification-providers/resend-provider"
import { SMTPEmailProvider } from "./notification-providers/smtp-provider"
import { TwilioSMSProvider } from "./notification-providers/twilio-provider"
import { notificationTemplates } from "./notification-templates"
import { renderTemplate } from "./template-renderer"

export class NotificationService {
  private emailProvider: EmailProvider
  private smsProvider: SMSProvider

  constructor() {
    // Initialize email provider based on available configuration
    if (process.env.RESEND_API_KEY) {
      this.emailProvider = new ResendEmailProvider(process.env.RESEND_API_KEY)
    } else if (process.env.SMTP_HOST) {
      this.emailProvider = new SMTPEmailProvider({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      })
    } else {
      throw new Error("No email provider configured")
    }

    // Initialize SMS provider
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.smsProvider = new TwilioSMSProvider(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        process.env.TWILIO_PHONE_NUMBER!,
      )
    } else {
      throw new Error("Twilio SMS provider not configured")
    }
  }

  async sendNotification(
    type: keyof typeof notificationTemplates,
    data: NotificationData,
    preferences: {
      email?: boolean
      sms?: boolean
      emailAddress?: string
      phoneNumber?: string
    },
  ) {
    const template = notificationTemplates[type]
    if (!template) {
      throw new Error(`Unknown notification template: ${type}`)
    }

    const results = {
      email: null as any,
      sms: null as any,
    }

    // Send email notification
    if (preferences.email && preferences.emailAddress) {
      try {
        const subject = renderTemplate(template.subject, data)
        const html = renderTemplate(template.html, data)

        results.email = await this.emailProvider.sendEmail({
          to: preferences.emailAddress,
          subject,
          html,
          from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        })
      } catch (error) {
        console.error("Email notification error:", error)
        results.email = { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      }
    }

    // Send SMS notification
    if (preferences.sms && preferences.phoneNumber) {
      try {
        const message = renderTemplate(template.sms, data)

        results.sms = await this.smsProvider.sendSMS({
          to: preferences.phoneNumber,
          message,
        })
      } catch (error) {
        console.error("SMS notification error:", error)
        results.sms = { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      }
    }

    return results
  }
}

// Singleton instance
export const notificationService = new NotificationService()
