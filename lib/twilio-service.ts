import twilio from "twilio"

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export interface SmsOptions {
  to: string
  body: string
}

export const sendSms = async (options: SmsOptions): Promise<boolean> => {
  try {
    const { to, body } = options

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(to.replace(/[^0-9+]/g, ""))) {
      throw new Error("Invalid phone number format")
    }

    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to.startsWith("+") ? to : `+1${to}`,
    })

    return true
  } catch (error) {
    console.error("Error sending SMS:", error)
    return false
  }
}

export const validateTwilioConnection = async (): Promise<boolean> => {
  try {
    await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
    return true
  } catch (error) {
    console.error("Twilio connection validation failed:", error)
    return false
  }
}
