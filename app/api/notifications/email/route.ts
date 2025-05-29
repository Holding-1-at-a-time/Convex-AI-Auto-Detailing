import { type NextRequest, NextResponse } from "next/server"
import { sendGmailEmail, validateGmailConnection } from "@/lib/gmail-service"
import { NOTIFICATION_TEMPLATES, renderTemplate } from "@/lib/notification-templates"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to, type, data, businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 })
    }

    // Get business Gmail credentials
    const business = await convex.query(api.businessProfiles.getBusinessProfile, {
      businessId,
    })

    if (!business || !business.gmailEnabled || !business.gmailAccessToken || !business.gmailRefreshToken) {
      return NextResponse.json(
        {
          error: "Gmail not connected for this business",
        },
        { status: 400 },
      )
    }

    const credentials = {
      accessToken: business.gmailAccessToken,
      refreshToken: business.gmailRefreshToken,
      email: business.gmailEmail || business.email || "",
    }

    // Validate Gmail connection
    const isConnected = await validateGmailConnection(credentials)
    if (!isConnected) {
      return NextResponse.json({ error: "Gmail service unavailable" }, { status: 503 })
    }

    // Get template
    const template = NOTIFICATION_TEMPLATES[type]
    if (!template) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Render email content
    const subject = renderTemplate(template.subject, data)
    const html = renderTemplate(template.emailTemplate, data)

    // Send email from business Gmail account
    const success = await sendGmailEmail(
      {
        to,
        subject,
        html,
        fromName: business.businessName,
      },
      credentials,
    )

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("Email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
