import { ConvexTestingHelper } from "convex/testing"
import { api } from "@/convex/_generated/api"
import schema from "@/convex/schema"

const t = new ConvexTestingHelper(schema)

describe("Appointments Convex Functions", () => {
  beforeEach(async () => {
    await t.clearAll()
  })

  describe("createAppointment", () => {
    it("creates a new appointment successfully", async () => {
      const appointmentId = await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
        price: 150,
        notes: "Test appointment",
      })

      expect(appointmentId).toBeDefined()

      const appointment = await t.query(api.appointments.getAppointmentsByDate, {
        date: "2024-02-15",
      })

      expect(appointment).toHaveLength(1)
      expect(appointment[0].customerId).toBe("user_123")
      expect(appointment[0].serviceType).toBe("Premium Detail")
      expect(appointment[0].status).toBe("scheduled")
    })

    it("prevents double booking with time conflicts", async () => {
      // Create first appointment
      await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        staffId: "staff_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      // Try to create conflicting appointment
      await expect(
        t.mutation(api.appointments.createAppointment, {
          customerId: "user_456",
          staffId: "staff_123",
          date: "2024-02-15",
          startTime: "11:00",
          endTime: "13:00",
          serviceType: "Basic Wash",
        }),
      ).rejects.toThrow("The selected staff member is not available at this time")
    })

    it("allows non-conflicting appointments", async () => {
      // Create first appointment
      await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        staffId: "staff_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      // Create non-conflicting appointment
      const secondAppointment = await t.mutation(api.appointments.createAppointment, {
        customerId: "user_456",
        staffId: "staff_123",
        date: "2024-02-15",
        startTime: "13:00",
        endTime: "15:00",
        serviceType: "Basic Wash",
      })

      expect(secondAppointment).toBeDefined()

      const appointments = await t.query(api.appointments.getAppointmentsByDate, {
        date: "2024-02-15",
      })

      expect(appointments).toHaveLength(2)
    })
  })

  describe("updateAppointment", () => {
    it("updates appointment successfully", async () => {
      const appointmentId = await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      await t.mutation(api.appointments.updateAppointment, {
        appointmentId,
        status: "confirmed",
        notes: "Updated notes",
      })

      const appointments = await t.query(api.appointments.getAppointmentsByDate, {
        date: "2024-02-15",
      })

      expect(appointments[0].status).toBe("confirmed")
      expect(appointments[0].notes).toBe("Updated notes")
    })

    it("throws error for non-existent appointment", async () => {
      await expect(
        t.mutation(api.appointments.updateAppointment, {
          appointmentId: "non_existent_id" as any,
          status: "confirmed",
        }),
      ).rejects.toThrow("Appointment not found")
    })
  })

  describe("cancelAppointment", () => {
    it("cancels appointment successfully", async () => {
      const appointmentId = await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      const result = await t.mutation(api.appointments.cancelAppointment, {
        appointmentId,
        reason: "Customer requested cancellation",
      })

      expect(result.success).toBe(true)

      const appointments = await t.query(api.appointments.getAppointmentsByDate, {
        date: "2024-02-15",
      })

      expect(appointments[0].status).toBe("cancelled")
      expect(appointments[0].notes).toContain("Customer requested cancellation")
    })
  })

  describe("getCustomerAppointments", () => {
    it("returns customer appointments", async () => {
      await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      await t.mutation(api.appointments.createAppointment, {
        customerId: "user_456",
        date: "2024-02-15",
        startTime: "13:00",
        endTime: "15:00",
        serviceType: "Basic Wash",
      })

      const appointments = await t.query(api.appointments.getCustomerAppointments, {
        customerId: "user_123",
      })

      expect(appointments).toHaveLength(1)
      expect(appointments[0].customerId).toBe("user_123")
    })

    it("filters appointments by status", async () => {
      const appointmentId = await t.mutation(api.appointments.createAppointment, {
        customerId: "user_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        serviceType: "Premium Detail",
      })

      await t.mutation(api.appointments.updateAppointment, {
        appointmentId,
        status: "completed",
      })

      const completedAppointments = await t.query(api.appointments.getCustomerAppointments, {
        customerId: "user_123",
        status: "completed",
      })

      expect(completedAppointments).toHaveLength(1)
      expect(completedAppointments[0].status).toBe("completed")

      const scheduledAppointments = await t.query(api.appointments.getCustomerAppointments, {
        customerId: "user_123",
        status: "scheduled",
      })

      expect(scheduledAppointments).toHaveLength(0)
    })
  })
})
