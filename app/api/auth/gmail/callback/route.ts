import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { exchangeCodeForTokens, getGmailProfile } from "@/lib/gmail-oauth"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This is the businessId
    const error = searchParams.get("error")

    if (error) {
      console.error("Gmail OAuth error:", error)
      return NextResponse.redirect(new URL(`/business/dashboard?error=gmail_auth_failed`, request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL(`/business/dashboard?error=missing_parameters`, request.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to get tokens from Google")
    }

    // Get Gmail profile to get the email address
    const profile = await getGmailProfile({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      email: "", // Will be filled by the function
    })

    if (!profile?.email) {
      throw new Error("Failed to get Gmail profile")
    }

    // Update business profile with Gmail credentials
    await convex.mutation(api.businessProfiles.updateGmailCredentials, {
      businessId: state as any, // businessId from state parameter
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      email: profile.email,
    })

    return NextResponse.redirect(new URL(`/business/dashboard?success=gmail_connected`, request.url))
  } catch (error) {
    console.error("Gmail OAuth callback error:", error)
    return NextResponse.redirect(new URL(`/business/dashboard?error=gmail_connection_failed`, request.url))
  }
}
