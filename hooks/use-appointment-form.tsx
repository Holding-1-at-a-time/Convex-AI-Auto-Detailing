"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "@/hooks/use-toast"
import { z } from "zod"

// Form validation schema
const appointmentFormSchema = z.object({
  businessId: z.string().min(1, "Business selection is required"),
  serviceId: z.string().min(1, "Service selection is required"),
  vehicleId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  staffId: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface UseAppointmentFormOptions {
  appointmentId?: Id<"appointments">
  onSuccess?: (appointmentId: Id<"appointments">) => void
  onError?: (error: Error) => void
}

interface FormErrors {
  [key: string]: string | undefined
}

/**
 * Custom hook to manage appointment creation and editing forms
 *
 * Features:
 * - Form state management with validation
 * - Real-time validation feedback
 * - Optimistic updates
 * - Error handling and recovery
 * - Loading states
 * - Form reset functionality
 *
 * @param options - Configuration options for the form
 * @returns Form state, handlers, and utilities
 */
export function useAppointmentForm(options: UseAppointmentFormOptions = {}) {
  const { user } = useUser()
  const { appointmentId, onSuccess, onError } = options

  // Form state
  const [formData, setFormData] = useState<Partial<AppointmentFormData>>({
    businessId: "",
    serviceId: "",
    vehicleId: "",
    date: "",
    startTime: "",
    endTime: "",
    notes: "",
    staffId: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // Convex queries and mutations
  const existingAppointment = useQuery(
    api.appointments.getAppointmentDetails,
    appointmentId ? { appointmentId } : "skip",
  )

  const createAppointment = useMutation(api.validatedAppointments.createValidatedAppointment)
  const updateAppointment = useMutation(api.validatedAppointments.updateValidatedAppointment)
  const checkAvailability = useMutation(api.appointments.checkAvailability)

  // Load existing appointment data
  useEffect(() => {
    if (existingAppointment) {
      setFormData({
        businessId: existingAppointment.businessId,
        serviceId: existingAppointment.serviceId,
        vehicleId: existingAppointment.vehicleId || "",
        date: existingAppointment.date,
        startTime: existingAppointment.startTime,
        endTime: existingAppointment.endTime,
        notes: existingAppointment.notes || "",
        staffId: existingAppointment.staffId || "",
      })
    }
  }, [existingAppointment])

  /**
   * Validate a single field
   */
  const validateField = useCallback((field: keyof AppointmentFormData, value: any): string | undefined => {
    try {
      const fieldSchema = appointmentFormSchema.shape[field]
      fieldSchema.parse(value)
      return undefined
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message
      }
      return "Invalid value"
    }
  }, [])

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    try {
      appointmentFormSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(newErrors)
        return false
      }
      return false
    }
  }, [formData])

  /**
   * Handle field change with validation
   */
  const handleFieldChange = useCallback(
    (field: keyof AppointmentFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setIsDirty(true)
      setTouchedFields((prev) => new Set(prev).add(field))

      // Validate field on change if it's been touched
      if (touchedFields.has(field)) {
        const error = validateField(field, value)
        setErrors((prev) => ({ ...prev, [field]: error }))
      }

      // Clear end time if start time changes
      if (field === "startTime") {
        setFormData((prev) => ({ ...prev, endTime: "" }))
      }
    },
    [touchedFields, validateField],
  )

  /**
   * Handle field blur - trigger validation
   */
  const handleFieldBlur = useCallback(
    (field: keyof AppointmentFormData) => {
      setTouchedFields((prev) => new Set(prev).add(field))
      const value = formData[field]
      const error = validateField(field, value)
      setErrors((prev) => ({ ...prev, [field]: error }))
    },
    [formData, validateField],
  )

  /**
   * Check availability for selected time slot
   */
  const checkTimeSlotAvailability = useCallback(async (): Promise<boolean> => {
    if (!formData.businessId || !formData.date || !formData.startTime || !formData.endTime) {
      return false
    }

    try {
      const isAvailable = await checkAvailability({
        businessId: formData.businessId as Id<"businessProfiles">,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        excludeAppointmentId: appointmentId,
      })

      if (!isAvailable) {
        setErrors((prev) => ({
          ...prev,
          startTime: "This time slot is not available",
        }))
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking availability:", error)
      return false
    }
  }, [formData, appointmentId, checkAvailability])

  /**
   * Submit form
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      // Mark all fields as touched
      const allFields = Object.keys(appointmentFormSchema.shape) as (keyof AppointmentFormData)[]
      setTouchedFields(new Set(allFields))

      // Validate form
      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before submitting.",
          variant: "destructive",
        })
        return
      }

      // Check availability
      const isAvailable = await checkTimeSlotAvailability()
      if (!isAvailable) {
        toast({
          title: "Time Slot Unavailable",
          description: "The selected time slot is no longer available. Please choose another time.",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)

      try {
        const appointmentData = {
          ...formData,
          customerId: user!.id,
        } as AppointmentFormData & { customerId: string }

        let resultId: Id<"appointments">

        if (appointmentId) {
          // Update existing appointment
          await updateAppointment({
            appointmentId,
            ...appointmentData,
          })
          resultId = appointmentId
          toast({
            title: "Appointment Updated",
            description: "Your appointment has been successfully updated.",
          })
        } else {
          // Create new appointment
          resultId = await createAppointment(appointmentData)
          toast({
            title: "Appointment Booked",
            description: "Your appointment has been successfully booked!",
          })
        }

        setIsDirty(false)
        onSuccess?.(resultId)
      } catch (error) {
        console.error("Error submitting appointment:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to submit appointment"

        toast({
          title: "Submission Failed",
          description: errorMessage,
          variant: "destructive",
        })

        onError?.(error instanceof Error ? error : new Error(errorMessage))
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      formData,
      user,
      appointmentId,
      validateForm,
      checkTimeSlotAvailability,
      createAppointment,
      updateAppointment,
      onSuccess,
      onError,
    ],
  )

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({
      businessId: "",
      serviceId: "",
      vehicleId: "",
      date: "",
      startTime: "",
      endTime: "",
      notes: "",
      staffId: "",
    })
    setErrors({})
    setIsDirty(false)
    setTouchedFields(new Set())
  }, [])

  /**
   * Calculate form progress percentage
   */
  const formProgress = useMemo(() => {
    const requiredFields = ["businessId", "serviceId", "date", "startTime", "endTime"]
    const filledFields = requiredFields.filter((field) => formData[field as keyof AppointmentFormData])
    return Math.round((filledFields.length / requiredFields.length) * 100)
  }, [formData])

  /**
   * Check if form is valid
   */
  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0 && formProgress === 100
  }, [errors, formProgress])

  return {
    // Form state
    formData,
    errors,
    isSubmitting,
    isDirty,
    touchedFields,
    formProgress,
    isFormValid,

    // Handlers
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    checkTimeSlotAvailability,

    // Utilities
    validateField,
    validateForm,
    isEditMode: !!appointmentId,
  }
}
