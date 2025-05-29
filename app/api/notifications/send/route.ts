import { type NextRequest, NextResponse } from "next/server"
import { notificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { type, data, preferences } = await request.json()

    if (!type || !data || !preferences) {
      return NextResponse.json({ error: "Missing required fields: type, data, preferences" }, { status: 400 })
    }

    const result = await notificationService.sendNotification(type, data, preferences)

    return NextResponse.json({
      success: true,
      email: result.email,
      sms: result.sms,
    })
  } catch (error) {
    console.error("Notification API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
