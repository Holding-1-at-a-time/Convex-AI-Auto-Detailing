import twilio from "twilio"

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export interface SMSOptions {
  to: string
  message: string
  from?: string
}

export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
    const { to, message, from } = options

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(to.replace(/[^0-9+]/g, ""))) {
      console.error("Invalid phone number format:", to)
      return false
    }

    // Format phone number to E.164 format
    let formattedTo = to.replace(/[^0-9+]/g, "")
    if (!formattedTo.startsWith("+")) {
      // Assume US number if no country code
      formattedTo = "+1" + formattedTo
    }

    const result = await client.messages.create({
      body: message,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    })

    console.log("SMS sent successfully:", result.sid)
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

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "")

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // Format as +X (XXX) XXX-XXXX for international numbers
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // Return original if can't format
  return phone
}

export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "")
  return cleaned.length >= 10 && cleaned.length <= 15
}
