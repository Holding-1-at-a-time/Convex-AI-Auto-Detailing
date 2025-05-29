import { act, waitFor } from "@testing-library/react"
import { useAppointmentForm } from "@/hooks/use-appointment-form"
import {
  renderHookWithProviders,
  setupMocks,
  mockConvexMutations,
  mockConvexQueries,
  createMockAppointment,
  mockToast,
} from "./test-utils"

// Mock dependencies
jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "user_123" },
    isLoaded: true,
    isSignedIn: true,
  }),
}))

jest.mock("convex/react", () => ({
  useQuery: jest.fn((query) => {
    if (query === "api.appointments.getAppointmentDetails") {
      return mockConvexQueries[query]()
    }
    return null
  }),
  useMutation: jest.fn((mutation) => mockConvexMutations[mutation]),
}))

jest.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
}))

describe("useAppointmentForm", () => {
  beforeEach(() => {
    setupMocks()
    mockToast.mockClear()
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should initialize with empty form data", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      expect(result.current.formData).toEqual({
        businessId: "",
        serviceId: "",
        vehicleId: "",
        date: "",
        startTime: "",
        endTime: "",
        notes: "",
        staffId: "",
      })
      expect(result.current.errors).toEqual({})
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isDirty).toBe(false)
      expect(result.current.formProgress).toBe(0)
      expect(result.current.isFormValid).toBe(false)
    })

    it("should load existing appointment data in edit mode", async () => {
      const mockAppointment = createMockAppointment()
      mockConvexQueries["api.appointments.getAppointmentDetails"].mockReturnValue(mockAppointment)

      const { result } = renderHookWithProviders(() => useAppointmentForm({ appointmentId: "appointment_123" }))

      await waitFor(() => {
        expect(result.current.formData.businessId).toBe(mockAppointment.businessId)
        expect(result.current.formData.serviceId).toBe(mockAppointment.serviceId)
        expect(result.current.formData.date).toBe(mockAppointment.date)
        expect(result.current.isEditMode).toBe(true)
      })
    })
  })

  describe("Form Field Management", () => {
    it("should update form field values", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
      })

      expect(result.current.formData.businessId).toBe("business_123")
      expect(result.current.isDirty).toBe(true)
    })

    it("should clear end time when start time changes", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("endTime", "12:00")
        result.current.handleFieldChange("startTime", "10:00")
      })

      expect(result.current.formData.startTime).toBe("10:00")
      expect(result.current.formData.endTime).toBe("")
    })

    it("should validate fields on blur", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldBlur("businessId")
      })

      expect(result.current.errors.businessId).toBe("Business selection is required")
    })

    it("should calculate form progress correctly", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("serviceId", "service_123")
      })

      expect(result.current.formProgress).toBe(40) // 2 out of 5 required fields
    })
  })

  describe("Form Validation", () => {
    it("should validate required fields", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        const isValid = result.current.validateForm()
        expect(isValid).toBe(false)
      })

      expect(result.current.errors.businessId).toBe("Business selection is required")
      expect(result.current.errors.serviceId).toBe("Service selection is required")
      expect(result.current.errors.date).toBe("Invalid date format")
    })

    it("should validate date format", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("date", "invalid-date")
        result.current.handleFieldBlur("date")
      })

      expect(result.current.errors.date).toBe("Invalid date format")
    })

    it("should validate time format", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("startTime", "25:00")
        result.current.handleFieldBlur("startTime")
      })

      expect(result.current.errors.startTime).toBe("Invalid time format")
    })

    it("should validate notes length", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())
      const longNotes = "a".repeat(501)

      act(() => {
        result.current.handleFieldChange("notes", longNotes)
        result.current.handleFieldBlur("notes")
      })

      expect(result.current.errors.notes).toBe("Notes must be less than 500 characters")
    })
  })

  describe("Availability Checking", () => {
    it("should check time slot availability", async () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("date", "2024-01-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "11:00")
      })

      await act(async () => {
        const isAvailable = await result.current.checkTimeSlotAvailability()
        expect(isAvailable).toBe(true)
      })

      expect(mockConvexMutations["api.appointments.checkAvailability"]).toHaveBeenCalledWith({
        businessId: "business_123",
        date: "2024-01-15",
        startTime: "10:00",
        endTime: "11:00",
        excludeAppointmentId: undefined,
      })
    })

    it("should handle unavailable time slots", async () => {
      mockConvexMutations["api.appointments.checkAvailability"].mockResolvedValue(false)
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("date", "2024-01-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "11:00")
      })

      await act(async () => {
        const isAvailable = await result.current.checkTimeSlotAvailability()
        expect(isAvailable).toBe(false)
      })

      expect(result.current.errors.startTime).toBe("This time slot is not available")
    })
  })

  describe("Form Submission", () => {
    const validFormData = {
      businessId: "business_123",
      serviceId: "service_123",
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "11:00",
      notes: "Test notes",
      vehicleId: "vehicle_123",
      staffId: "staff_123",
    }

    it("should create new appointment successfully", async () => {
      const onSuccess = jest.fn()
      const { result } = renderHookWithProviders(() => useAppointmentForm({ onSuccess }))

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockConvexMutations["api.validatedAppointments.createValidatedAppointment"]).toHaveBeenCalledWith({
        ...validFormData,
        customerId: "user_123",
      })
      expect(onSuccess).toHaveBeenCalledWith("appointment_123")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Booked",
        description: "Your appointment has been successfully booked!",
      })
    })

    it("should update existing appointment successfully", async () => {
      const onSuccess = jest.fn()
      const { result } = renderHookWithProviders(() =>
        useAppointmentForm({
          appointmentId: "appointment_123",
          onSuccess,
        }),
      )

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockConvexMutations["api.validatedAppointments.updateValidatedAppointment"]).toHaveBeenCalledWith({
        appointmentId: "appointment_123",
        ...validFormData,
        customerId: "user_123",
      })
      expect(onSuccess).toHaveBeenCalledWith("appointment_123")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Updated",
        description: "Your appointment has been successfully updated.",
      })
    })

    it("should handle validation errors during submission", async () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })
      expect(mockConvexMutations["api.validatedAppointments.createValidatedAppointment"]).not.toHaveBeenCalled()
    })

    it("should handle submission errors", async () => {
      const onError = jest.fn()
      const error = new Error("Submission failed")
      mockConvexMutations["api.validatedAppointments.createValidatedAppointment"].mockRejectedValue(error)

      const { result } = renderHookWithProviders(() => useAppointmentForm({ onError }))

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onError).toHaveBeenCalledWith(error)
      expect(mockToast).toHaveBeenCalledWith({
        title: "Submission Failed",
        description: "Submission failed",
        variant: "destructive",
      })
    })

    it("should prevent submission if time slot is unavailable", async () => {
      mockConvexMutations["api.appointments.checkAvailability"].mockResolvedValue(false)
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Time Slot Unavailable",
        description: "The selected time slot is no longer available. Please choose another time.",
        variant: "destructive",
      })
      expect(mockConvexMutations["api.validatedAppointments.createValidatedAppointment"]).not.toHaveBeenCalled()
    })
  })

  describe("Form Reset", () => {
    it("should reset form to initial state", () => {
      const { result } = renderHookWithProviders(() => useAppointmentForm())

      // Make changes to form
      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("notes", "Some notes")
      })

      expect(result.current.isDirty).toBe(true)

      // Reset form
      act(() => {
        result.current.resetForm()
      })

      expect(result.current.formData.businessId).toBe("")
      expect(result.current.formData.notes).toBe("")
      expect(result.current.isDirty).toBe(false)
      expect(result.current.errors).toEqual({})
    })
  })

  describe("Loading States", () => {
    it("should show submitting state during form submission", async () => {
      let resolveSubmission: (value: any) => void
      const submissionPromise = new Promise((resolve) => {
        resolveSubmission = resolve
      })

      mockConvexMutations["api.validatedAppointments.createValidatedAppointment"].mockReturnValue(submissionPromise)

      const { result } = renderHookWithProviders(() => useAppointmentForm())

      // Set valid form data
      act(() => {
        Object.entries({
          businessId: "business_123",
          serviceId: "service_123",
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
        }).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      // Start submission
      act(() => {
        result.current.handleSubmit()
      })

      expect(result.current.isSubmitting).toBe(true)

      // Resolve submission
      act(() => {
        resolveSubmission("appointment_123")
      })

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      })
    })
  })
})
