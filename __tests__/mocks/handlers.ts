import { http, HttpResponse } from "msw"

export const handlers = [
  // Mock Convex API endpoints
  http.post("https://test.convex.cloud/api/mutation", async ({ request }) => {
    const body = await request.json()

    // Mock different mutations based on the function name
    if (body.path === "vehicles:addVehicle") {
      return HttpResponse.json({
        success: true,
        data: "vehicle_123",
      })
    }

    if (body.path === "users:upsertUser") {
      return HttpResponse.json({
        success: true,
        data: "user_123",
      })
    }

    return HttpResponse.json({
      success: true,
      data: null,
    })
  }),

  http.post("https://test.convex.cloud/api/query", async ({ request }) => {
    const body = await request.json()

    // Mock different queries based on the function name
    if (body.path === "vehicles:getVehicleData") {
      return HttpResponse.json({
        success: true,
        data: {
          make: "Toyota",
          model: "Camry",
          year: 2022,
          lastDetailing: "2025-04-15",
          detailingScore: 85,
          recommendations: [{ id: 1, title: "Wax exterior", priority: "high", dueDate: "2025-05-30" }],
          history: [{ id: 1, date: "2025-04-15", service: "Full Detailing", notes: "Complete detailing" }],
        },
      })
    }

    return HttpResponse.json({
      success: true,
      data: null,
    })
  }),

  http.post("https://test.convex.cloud/api/action", async ({ request }) => {
    const body = await request.json()

    // Mock different actions based on the function name
    if (body.path === "agent:sendMessage") {
      return HttpResponse.json({
        success: true,
        data: {
          text: "This is a mock response from the AI assistant.",
          messageId: "msg_123",
        },
      })
    }

    return HttpResponse.json({
      success: true,
      data: null,
    })
  }),

  // Mock file upload
  http.post("/api/upload", () => {
    return HttpResponse.json({
      url: "https://test.storage.com/file123.jpg",
      storageId: "storage_123",
    })
  }),
]
