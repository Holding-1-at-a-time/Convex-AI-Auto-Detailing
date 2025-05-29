import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getGmailAuthUrl } from "@/lib/gmail-oauth"

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 })
    }

    // Generate OAuth URL with business ID as state
    const authUrl = getGmailAuthUrl(businessId)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Gmail connect error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
