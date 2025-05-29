import { ConvexTestingHelper } from "convex/testing"
import { api } from "@/convex/_generated/api"
import schema from "@/convex/schema"

describe("Dashboard Convex Functions", () => {
  let t: ConvexTestingHelper<typeof schema>

  beforeEach(async () => {
    t = new ConvexTestingHelper(schema)
    await t.run(async (ctx) => {
      // Seed test data
      const businessProfileId = await ctx.db.insert("businessProfiles", {
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

      // Create test appointments
      await ctx.db.insert("appointments", {
        customerId: "customer_1",
        businessId: businessProfileId,
        date: "2024-01-15",
        startTime: "10:00",
        endTime: "11:00",
        serviceType: "Basic Wash",
        status: "completed",
        price: 50,
        createdAt: new Date().toISOString(),
        reminderSent: false,
        followupSent: false,
      })

      await ctx.db.insert("appointments", {
        customerId: "customer_2",
        businessId: businessProfileId,
        date: "2024-01-16",
        startTime: "14:00",
        endTime: "15:30",
        serviceType: "Premium Detail",
        status: "scheduled",
        price: 150,
        createdAt: new Date().toISOString(),
        reminderSent: false,
        followupSent: false,
      })
    })
  })

  it("calculates business stats correctly", async () => {
    const businessProfile = await t.run(async (ctx) => {
      return await ctx.db.query("businessProfiles").first()
    })

    const stats = await t.query(api.dashboard.getBusinessStats, {
      businessId: businessProfile!._id,
    })

    expect(stats).toMatchObject({
      totalAppointments: 2,
      totalRevenue: 200,
      totalCustomers: 2,
      upcomingAppointments: 1,
    })
  })

  it("calculates customer stats correctly", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("vehicles", {
        userId: "customer_1",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        createdAt: new Date().toISOString(),
      })
    })

    const stats = await t.query(api.dashboard.getCustomerStats, {
      customerId: "customer_1",
    })

    expect(stats).toMatchObject({
      totalAppointments: 1,
      totalSpent: 50,
      upcomingAppointments: 0,
      completedAppointments: 1,
      vehicleCount: 1,
    })
  })
})
