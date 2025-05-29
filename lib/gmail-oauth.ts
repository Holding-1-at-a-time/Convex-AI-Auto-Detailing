import { google } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
)

export const getGmailAuthUrl = (businessId: string) => {
  const scopes = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: businessId, // Pass business ID to identify which business is authenticating
    prompt: "consent", // Force consent to get refresh token
  })
}

export const exchangeCodeForTokens = async (code: string) => {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error("Error exchanging code for tokens:", error)
    throw new Error("Failed to exchange authorization code")
  }
}

export const createGmailClient = (accessToken: string, refreshToken: string) => {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
  )

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.gmail({ version: "v1", auth: client })
}

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET)

    client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await client.refreshAccessToken()
    return credentials
  } catch (error) {
    console.error("Error refreshing access token:", error)
    throw new Error("Failed to refresh access token")
  }
}
