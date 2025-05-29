import { ConvexTestingHelper } from "convex/testing"
import { api } from "@/convex/_generated/api"
import schema from "@/convex/schema"

describe("Appointments Convex Functions", () => {
  let t: ConvexTestingHelper<typeof schema>

  beforeEach(async () => {
    t = new ConvexTestingHelper(schema)
    await t.run(async (ctx) => {
      // Seed test data
      await ctx.db.insert("users", {
        clerkId: "user_123",
        name: "John Doe",
        email: "john@example.com",
        role: "customer",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      })

      await ctx.db.insert("businessProfiles", {
        userId: "business_123",
        businessName: "Test Auto Detailing",
        businessType: "mobile",
        city: "Test City",
        state: "TS",
        zipCode: "12345",
        phone: "555-0123",
        email: "business@test.com",
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
  })

  it("creates an appointment successfully", async () => {
    const appointmentId = await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
      price: 50,
    })

    expect(appointmentId).toBeDefined()

    const appointment = await t.run(async (ctx) => {
      return await ctx.db.get(appointmentId)
    })

    expect(appointment).toMatchObject({
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
      status: "scheduled",
      price: 50,
    })
  })

  it("prevents double booking", async () => {
    // Create first appointment
    await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      staffId: "staff_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
    })

    // Try to create conflicting appointment
    await expect(
      t.mutation(api.appointments.createAppointment, {
        customerId: "user_456",
        staffId: "staff_123",
        date: "2024-01-15",
        startTime: "10:30",
        endTime: "11:30",
        serviceType: "Premium Detail",
      }),
    ).rejects.toThrow("The selected staff member is not available at this time")
  })

  it("updates an appointment", async () => {
    const appointmentId = await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
    })

    await t.mutation(api.appointments.updateAppointment, {
      appointmentId,
      price: 75,
      notes: "Updated price",
    })

    const updatedAppointment = await t.run(async (ctx) => {
      return await ctx.db.get(appointmentId)
    })

    expect(updatedAppointment?.price).toBe(75)
    expect(updatedAppointment?.notes).toBe("Updated price")
    expect(updatedAppointment?.updatedAt).toBeDefined()
  })

  it("cancels an appointment", async () => {
    const appointmentId = await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
    })

    const result = await t.mutation(api.appointments.cancelAppointment, {
      appointmentId,
      reason: "Customer request",
    })

    expect(result.success).toBe(true)

    const cancelledAppointment = await t.run(async (ctx) => {
      return await ctx.db.get(appointmentId)
    })

    expect(cancelledAppointment?.status).toBe("cancelled")
    expect(cancelledAppointment?.notes).toContain("Cancellation reason: Customer request")
  })

  it("gets appointments by date", async () => {
    await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
    })

    await t.mutation(api.appointments.createAppointment, {
      customerId: "user_456",
      date: "2024-01-15",
      startTime: "14:00",
      endTime: "15:00",
      serviceType: "Premium Detail",
    })

    const appointments = await t.query(api.appointments.getAppointmentsByDate, {
      date: "2024-01-15",
    })

    expect(appointments).toHaveLength(2)
    expect(appointments[0].date).toBe("2024-01-15")
    expect(appointments[1].date).toBe("2024-01-15")
  })

  it("gets customer appointments", async () => {
    await t.mutation(api.appointments.createAppointment, {
      customerId: "user_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      serviceType: "Basic Wash",
    })

    const appointments = await t.query(api.appointments.getCustomerAppointments, {
      customerId: "user_123",
      limit: 10,
    })

    expect(appointments).toHaveLength(1)
    expect(appointments[0].customerId).toBe("user_123")
  })
})
