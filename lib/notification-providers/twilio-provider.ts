import type { SMSProvider, SMSParams, SMSResult } from "./types"

export class TwilioSMSProvider implements SMSProvider {
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.fromNumber = fromNumber
  }

  async sendSMS(params: SMSParams): Promise<SMSResult> {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: params.from || this.fromNumber,
          To: params.to,
          Body: params.message,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Twilio API error: ${error}`)
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.sid,
      }
    } catch (error) {
      console.error("Twilio SMS error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
