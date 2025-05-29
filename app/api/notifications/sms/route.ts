import { type NextRequest, NextResponse } from "next/server"
import { sendSms, validateTwilioConnection } from "@/lib/twilio-service"
import { NOTIFICATION_TEMPLATES, renderTemplate } from "@/lib/notification-templates"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to, type, data } = await request.json()

    // Validate Twilio connection
    const isConnected = await validateTwilioConnection()
    if (!isConnected) {
      return NextResponse.json({ error: "SMS service unavailable" }, { status: 503 })
    }

    // Get template
    const template = NOTIFICATION_TEMPLATES[type]
    if (!template) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Render SMS content
    const body = renderTemplate(template.smsTemplate, data)

    // Send SMS
    const success = await sendSms({
      to,
      body,
    })

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 })
    }
  } catch (error) {
    console.error("SMS API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isConnected = await validateTwilioConnection()
    return NextResponse.json({ connected: isConnected })
  } catch (error) {
    console.error("Twilio connection check error:", error)
    return NextResponse.json({ connected: false })
  }
}
