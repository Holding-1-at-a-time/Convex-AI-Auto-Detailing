import type { EmailProvider, EmailParams, EmailResult } from "./types"

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string
  private baseUrl = "https://api.resend.com"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: params.from || "noreply@yourdomain.com",
          to: [params.to],
          subject: params.subject,
          html: params.html,
          reply_to: params.replyTo,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Resend API error: ${error}`)
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.id,
      }
    } catch (error) {
      console.error("Resend email error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
