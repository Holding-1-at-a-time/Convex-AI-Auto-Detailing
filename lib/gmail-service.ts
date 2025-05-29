import { google } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
)

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
})

const gmail = google.gmail({ version: "v1", auth: oauth2Client })

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const sendGmailEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const { to, subject, html, text } = options

    const message = [
      `To: ${to}`,
      `From: ${process.env.GMAIL_USER_EMAIL}`,
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

export const validateGmailConnection = async (): Promise<boolean> => {
  try {
    await gmail.users.getProfile({ userId: "me" })
    return true
  } catch (error) {
    console.error("Gmail connection validation failed:", error)
    return false
  }
}
