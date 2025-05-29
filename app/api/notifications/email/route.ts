import { type NextRequest, NextResponse } from "next/server"
import { sendGmailEmail, validateGmailConnection } from "@/lib/gmail-service"
import { NOTIFICATION_TEMPLATES, renderTemplate } from "@/lib/notification-templates"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to, type, data } = await request.json()

    // Validate Gmail connection
    const isConnected = await validateGmailConnection()
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

    // Send email
    const success = await sendGmailEmail({
      to,
      subject,
      html,
    })

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

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isConnected = await validateGmailConnection()
    return NextResponse.json({ connected: isConnected })
  } catch (error) {
    console.error("Gmail connection check error:", error)
    return NextResponse.json({ connected: false })
  }
}
