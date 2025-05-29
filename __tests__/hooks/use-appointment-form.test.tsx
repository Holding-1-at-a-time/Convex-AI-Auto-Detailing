import { renderHook, act } from "@testing-library/react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { useAppointmentForm } from "@/hooks/use-appointment-form"
import { toast } from "@/hooks/use-toast"
import { mockUser, mockAppointment } from "../utils/test-utils"

// Mock dependencies
jest.mock("@clerk/nextjs")
jest.mock("convex/react")
jest.mock("@/hooks/use-toast")

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockToast = toast as jest.MockedFunction<typeof toast>

describe("useAppointmentForm", () => {
  const mockCreateAppointment = jest.fn()
  const mockUpdateAppointment = jest.fn()
  const mockCheckAvailability = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    mockUseQuery.mockReturnValue(null)
    mockUseMutation.mockImplementation((mutation) => {
      if (mutation.toString().includes("createValidatedAppointment")) {
        return mockCreateAppointment
      }
      if (mutation.toString().includes("updateValidatedAppointment")) {
        return mockUpdateAppointment
      }
      if (mutation.toString().includes("checkAvailability")) {
        return mockCheckAvailability
      }
      return jest.fn()
    })

    mockCheckAvailability.mockResolvedValue(true)
    mockCreateAppointment.mockResolvedValue("appointment_123")
    mockUpdateAppointment.mockResolvedValue(undefined)
  })

  describe("Initial State", () => {
    it("should initialize with empty form data", () => {
      const { result } = renderHook(() => useAppointmentForm())

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

    it("should load existing appointment data when appointmentId is provided", () => {
      mockUseQuery.mockReturnValue(mockAppointment)

      const { result } = renderHook(() => useAppointmentForm({ appointmentId: "appointment_123" as any }))

      expect(result.current.formData).toEqual({
        businessId: mockAppointment.businessId,
        serviceId: mockAppointment.serviceType,
        vehicleId: mockAppointment.vehicleId,
        date: mockAppointment.date,
        startTime: mockAppointment.startTime,
        endTime: mockAppointment.endTime,
        notes: mockAppointment.notes,
        staffId: "",
      })
      expect(result.current.isEditMode).toBe(true)
    })
  })

  describe("Field Management", () => {
    it("should update field value and mark form as dirty", () => {
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
      })

      expect(result.current.formData.businessId).toBe("business_123")
      expect(result.current.isDirty).toBe(true)
      expect(result.current.formProgress).toBe(20) // 1 of 5 required fields
    })

    it("should clear end time when start time changes", () => {
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "12:00")
      })

      expect(result.current.formData.endTime).toBe("12:00")

      act(() => {
        result.current.handleFieldChange("startTime", "11:00")
      })

      expect(result.current.formData.endTime).toBe("")
    })

    it("should validate field on blur if touched", () => {
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldBlur("businessId")
      })

      expect(result.current.errors.businessId).toBe("Business selection is required")
    })

    it("should validate field on change if already touched", () => {
      const { result } = renderHook(() => useAppointmentForm())

      // Touch the field first
      act(() => {
        result.current.handleFieldBlur("businessId")
      })

      expect(result.current.errors.businessId).toBe("Business selection is required")

      // Now change the field - should clear error
      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
      })

      expect(result.current.errors.businessId).toBeUndefined()
    })
  })

  describe("Form Validation", () => {
    it("should validate required fields", () => {
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        const isValid = result.current.validateForm()
        expect(isValid).toBe(false)
      })

      expect(result.current.errors).toMatchObject({
        businessId: expect.stringContaining("required"),
        serviceId: expect.stringContaining("required"),
        date: expect.stringContaining("Invalid date format"),
        startTime: expect.stringContaining("Invalid time format"),
        endTime: expect.stringContaining("Invalid time format"),
      })
    })

    it("should validate date format", () => {
      const { result } = renderHook(() => useAppointmentForm())

      const validationResult = result.current.validateField("date", "invalid-date")
      expect(validationResult).toBe("Invalid date format")

      const validResult = result.current.validateField("date", "2024-02-15")
      expect(validResult).toBeUndefined()
    })

    it("should validate time format", () => {
      const { result } = renderHook(() => useAppointmentForm())

      const invalidResult = result.current.validateField("startTime", "25:00")
      expect(invalidResult).toBe("Invalid time format")

      const validResult = result.current.validateField("startTime", "10:30")
      expect(validResult).toBeUndefined()
    })

    it("should validate notes length", () => {
      const { result } = renderHook(() => useAppointmentForm())

      const longNotes = "a".repeat(501)
      const validationResult = result.current.validateField("notes", longNotes)
      expect(validationResult).toBe("Notes must be less than 500 characters")

      const validResult = result.current.validateField("notes", "Valid notes")
      expect(validResult).toBeUndefined()
    })
  })

  describe("Availability Checking", () => {
    it("should check time slot availability", async () => {
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("date", "2024-02-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "12:00")
      })

      await act(async () => {
        const isAvailable = await result.current.checkTimeSlotAvailability()
        expect(isAvailable).toBe(true)
      })

      expect(mockCheckAvailability).toHaveBeenCalledWith({
        businessId: "business_123",
        date: "2024-02-15",
        startTime: "10:00",
        endTime: "12:00",
        excludeAppointmentId: undefined,
      })
    })

    it("should handle unavailable time slot", async () => {
      mockCheckAvailability.mockResolvedValue(false)
      const { result } = renderHook(() => useAppointmentForm())

      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("date", "2024-02-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "12:00")
      })

      await act(async () => {
        const isAvailable = await result.current.checkTimeSlotAvailability()
        expect(isAvailable).toBe(false)
      })

      expect(result.current.errors.startTime).toBe("This time slot is not available")
    })

    it("should return false for incomplete data", async () => {
      const { result } = renderHook(() => useAppointmentForm())

      await act(async () => {
        const isAvailable = await result.current.checkTimeSlotAvailability()
        expect(isAvailable).toBe(false)
      })

      expect(mockCheckAvailability).not.toHaveBeenCalled()
    })
  })

  describe("Form Submission", () => {
    const validFormData = {
      businessId: "business_123",
      serviceId: "service_123",
      date: "2024-02-15",
      startTime: "10:00",
      endTime: "12:00",
    }

    beforeEach(() => {
      const { result } = renderHook(() => useAppointmentForm({ onSuccess: mockOnSuccess, onError: mockOnError }))

      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })
    })

    it("should create new appointment successfully", async () => {
      const { result } = renderHook(() => useAppointmentForm({ onSuccess: mockOnSuccess }))

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockCreateAppointment).toHaveBeenCalledWith({
        ...validFormData,
        customerId: mockUser.id,
        vehicleId: "",
        notes: "",
        staffId: "",
      })
      expect(mockOnSuccess).toHaveBeenCalledWith("appointment_123")
      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Booked",
        description: "Your appointment has been successfully booked!",
      })
    })

    it("should update existing appointment", async () => {
      const appointmentId = "appointment_123" as any
      const { result } = renderHook(() => useAppointmentForm({ appointmentId, onSuccess: mockOnSuccess }))

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockUpdateAppointment).toHaveBeenCalledWith({
        appointmentId,
        ...validFormData,
        customerId: mockUser.id,
        vehicleId: "",
        notes: "",
        staffId: "",
      })
      expect(mockOnSuccess).toHaveBeenCalledWith(appointmentId)
      expect(mockToast).toHaveBeenCalledWith({
        title: "Appointment Updated",
        description: "Your appointment has been successfully updated.",
      })
    })

    it("should handle validation errors during submission", async () => {
      const { result } = renderHook(() => useAppointmentForm())

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockCreateAppointment).not.toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })
    })

    it("should handle availability check failure during submission", async () => {
      mockCheckAvailability.mockResolvedValue(false)
      const { result } = renderHook(() => useAppointmentForm())

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockCreateAppointment).not.toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: "Time Slot Unavailable",
        description: "The selected time slot is no longer available. Please choose another time.",
        variant: "destructive",
      })
    })

    it("should handle submission errors", async () => {
      const error = new Error("Network error")
      mockCreateAppointment.mockRejectedValue(error)

      const { result } = renderHook(() => useAppointmentForm({ onError: mockOnError }))

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockOnError).toHaveBeenCalledWith(error)
      expect(mockToast).toHaveBeenCalledWith({
        title: "Submission Failed",
        description: "Network error",
        variant: "destructive",
      })
    })

    it("should set loading state during submission", async () => {
      const { result } = renderHook(() => useAppointmentForm())

      // Set valid form data
      act(() => {
        Object.entries(validFormData).forEach(([key, value]) => {
          result.current.handleFieldChange(key as any, value)
        })
      })

      const submitPromise = act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.isSubmitting).toBe(true)

      await submitPromise

      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe("Form Reset", () => {
    it("should reset form to initial state", () => {
      const { result } = renderHook(() => useAppointmentForm())

      // Modify form state
      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldBlur("businessId")
      })

      expect(result.current.isDirty).toBe(true)
      expect(result.current.formData.businessId).toBe("business_123")

      // Reset form
      act(() => {
        result.current.resetForm()
      })

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
      expect(result.current.isDirty).toBe(false)
      expect(result.current.touchedFields.size).toBe(0)
    })
  })

  describe("Form Progress", () => {
    it("should calculate form progress correctly", () => {
      const { result } = renderHook(() => useAppointmentForm())

      // No fields filled - 0%
      expect(result.current.formProgress).toBe(0)

      // Fill 2 of 5 required fields - 40%
      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("serviceId", "service_123")
      })

      expect(result.current.formProgress).toBe(40)

      // Fill all required fields - 100%
      act(() => {
        result.current.handleFieldChange("date", "2024-02-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "12:00")
      })

      expect(result.current.formProgress).toBe(100)
    })

    it("should determine form validity", () => {
      const { result } = renderHook(() => useAppointmentForm())

      expect(result.current.isFormValid).toBe(false)

      // Fill all required fields
      act(() => {
        result.current.handleFieldChange("businessId", "business_123")
        result.current.handleFieldChange("serviceId", "service_123")
        result.current.handleFieldChange("date", "2024-02-15")
        result.current.handleFieldChange("startTime", "10:00")
        result.current.handleFieldChange("endTime", "12:00")
      })

      expect(result.current.isFormValid).toBe(true)
    })
  })
})
