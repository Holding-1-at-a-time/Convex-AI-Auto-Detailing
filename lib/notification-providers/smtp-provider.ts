import nodemailer from "nodemailer"
import type { EmailProvider, EmailParams, EmailResult } from "./types"

export class SMTPEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor(config: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }) {
    this.transporter = nodemailer.createTransporter(config)
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from || "noreply@yourdomain.com",
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error("SMTP email error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
