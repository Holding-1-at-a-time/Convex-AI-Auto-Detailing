import { createGmailClient, refreshAccessToken } from "./gmail-oauth"

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  fromEmail?: string
  fromName?: string
}

export interface GmailCredentials {
  accessToken: string
  refreshToken: string
  email: string
}

export const sendGmailEmail = async (options: EmailOptions, credentials: GmailCredentials): Promise<boolean> => {
  try {
    const { to, subject, html, text, fromName } = options
    const { accessToken, refreshToken, email: fromEmail } = credentials

    // Create Gmail client with tenant's credentials
    let gmail = createGmailClient(accessToken, refreshToken)

    try {
      // Test if current access token is valid
      await gmail.users.getProfile({ userId: "me" })
    } catch (error) {
      // Access token expired, refresh it
      console.log("Access token expired, refreshing...")
      const newCredentials = await refreshAccessToken(refreshToken)

      if (newCredentials.access_token) {
        gmail = createGmailClient(newCredentials.access_token, refreshToken)
      } else {
        throw new Error("Failed to refresh access token")
      }
    }

    const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail

    const message = [
      `To: ${to}`,
      `From: ${fromHeader}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html || text || "",
    ].join("\n")

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    })

    return true
  } catch (error) {
    console.error("Error sending Gmail email:", error)
    return false
  }
}

export const validateGmailConnection = async (credentials: GmailCredentials): Promise<boolean> => {
  try {
    const { accessToken, refreshToken } = credentials
    const gmail = createGmailClient(accessToken, refreshToken)

    await gmail.users.getProfile({ userId: "me" })
    return true
  } catch (error) {
    console.error("Gmail connection validation failed:", error)
    return false
  }
}

export const getGmailProfile = async (
  credentials: GmailCredentials,
): Promise<{ email: string; name?: string } | null> => {
  try {
    const { accessToken, refreshToken } = credentials
    const gmail = createGmailClient(accessToken, refreshToken)

    const profile = await gmail.users.getProfile({ userId: "me" })
    return {
      email: profile.data.emailAddress || "",
      name: profile.data.emailAddress?.split("@")[0],
    }
  } catch (error) {
    console.error("Error getting Gmail profile:", error)
    return null
  }
}
