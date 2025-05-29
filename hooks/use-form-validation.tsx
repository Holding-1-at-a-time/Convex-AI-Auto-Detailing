"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { z } from "zod"

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>
  initialValues: Partial<T>
  onSubmit?: (values: T) => Promise<void> | void
  validateOnChange?: boolean
  validateOnBlur?: boolean
  resetOnSubmit?: boolean
}

interface FieldError {
  message: string
  type: string
}

interface FormState<T> {
  values: Partial<T>
  errors: Partial<Record<keyof T, FieldError>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

/**
 * Custom hook for form validation and state management
 *
 * Features:
 * - Zod schema validation
 * - Field-level error handling
 * - Touch state tracking
 * - Async form submission
 * - Dirty state detection
 * - Customizable validation timing
 *
 * @param options - Configuration options for form validation
 * @returns Form state and management functions
 */
export function useFormValidation<T extends Record<string, any>>(options: UseFormValidationOptions<T>) {
  const {
    schema,
    initialValues,
    onSubmit,
    validateOnChange = false,
    validateOnBlur = true,
    resetOnSubmit = false,
  } = options

  // Form state
  const [values, setValues] = useState<Partial<T>>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, FieldError>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Check if form is dirty (has changes from initial values)
   */
  const isDirty = useMemo(() => {
    return Object.keys(values).some((key) => values[key as keyof T] !== initialValues[key as keyof T])
  }, [values, initialValues])

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (fieldName: keyof T, value: any): FieldError | null => {
      try {
        // Create a partial schema for the specific field
        const fieldSchema = schema.pick({ [fieldName]: true } as any)
        fieldSchema.parse({ [fieldName]: value })
        return null
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((err) => err.path[0] === fieldName)
          if (fieldError) {
            return {
              message: fieldError.message,
              type: fieldError.code,
            }
          }
        }
        return {
          message: "Invalid value",
          type: "invalid",
        }
      }
    },
    [schema],
  )

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    try {
      schema.parse(values)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, FieldError>> = {}

        error.errors.forEach((err) => {
          const fieldName = err.path[0] as keyof T
          if (fieldName) {
            newErrors[fieldName] = {
              message: err.message,
              type: err.code,
            }
          }
        })

        setErrors(newErrors)
        return false
      }
      return false
    }
  }, [schema, values])

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    try {
      schema.parse(values)
      return true
    } catch {
      return false
    }
  }, [schema, values])

  /**
   * Set field value with optional validation
   */
  const setFieldValue = useCallback(
    (fieldName: keyof T, value: any, shouldValidate = validateOnChange) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }))

      if (shouldValidate && touched[fieldName]) {
        const fieldError = validateField(fieldName, value)
        setErrors((prev) => ({
          ...prev,
          [fieldName]: fieldError || undefined,
        }))
      }
    },
    [validateField, validateOnChange, touched],
  )

  /**
   * Set field as touched with optional validation
   */
  const setFieldTouched = useCallback(
    (fieldName: keyof T, isTouched = true, shouldValidate = validateOnBlur) => {
      setTouched((prev) => ({ ...prev, [fieldName]: isTouched }))

      if (shouldValidate && isTouched) {
        const value = values[fieldName]
        const fieldError = validateField(fieldName, value)
        setErrors((prev) => ({
          ...prev,
          [fieldName]: fieldError || undefined,
        }))
      }
    },
    [validateField, validateOnBlur, values],
  )

  /**
   * Set multiple field values
   */
  const setFieldValues = useCallback(
    (newValues: Partial<T>, shouldValidate = false) => {
      setValues((prev) => ({ ...prev, ...newValues }))

      if (shouldValidate) {
        Object.keys(newValues).forEach((key) => {
          const fieldName = key as keyof T
          if (touched[fieldName]) {
            const fieldError = validateField(fieldName, newValues[fieldName])
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldError || undefined,
            }))
          }
        })
      }
    },
    [validateField, touched],
  )

  /**
   * Clear field error
   */
  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()

      // Mark all fields as touched
      const allFields = Object.keys(schema.shape) as (keyof T)[]
      const touchedFields = allFields.reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {} as Record<keyof T, boolean>,
      )
      setTouched(touchedFields)

      // Validate form
      if (!validateForm()) {
        return false
      }

      if (!onSubmit) {
        return true
      }

      setIsSubmitting(true)
      try {
        await onSubmit(values as T)

        if (resetOnSubmit) {
          resetForm()
        }

        return true
      } catch (error) {
        console.error("Form submission error:", error)
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [schema, validateForm, onSubmit, values, resetOnSubmit, resetForm],
  )

  /**
   * Get field props for easy integration with form inputs
   */
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      name: fieldName as string,
      value: values[fieldName] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFieldValue(fieldName, e.target.value)
      },
      onBlur: () => {
        setFieldTouched(fieldName)
      },
      error: touched[fieldName] ? errors[fieldName]?.message : undefined,
      "aria-invalid": touched[fieldName] && errors[fieldName] ? true : false,
      "aria-describedby": errors[fieldName] ? `${fieldName as string}-error` : undefined,
    }),
    [values, errors, touched, setFieldValue, setFieldTouched],
  )

  /**
   * Get field error message
   */
  const getFieldError = useCallback(
    (fieldName: keyof T): string | undefined => {
      return touched[fieldName] ? errors[fieldName]?.message : undefined
    },
    [errors, touched],
  )

  /**
   * Check if field has error
   */
  const hasFieldError = useCallback(
    (fieldName: keyof T): boolean => {
      return Boolean(touched[fieldName] && errors[fieldName])
    },
    [errors, touched],
  )

  /**
   * Get form state summary
   */
  const formState = useMemo(
    (): FormState<T> => ({
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
      isDirty,
    }),
    [values, errors, touched, isSubmitting, isValid, isDirty],
  )

  // Reset form when initial values change
  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  return {
    // State
    formState,
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,

    // Field management
    setFieldValue,
    setFieldTouched,
    setFieldValues,
    getFieldProps,
    getFieldError,
    hasFieldError,
    clearFieldError,

    // Form management
    validateForm,
    validateField,
    clearErrors,
    resetForm,
    handleSubmit,

    // Utilities
    canSubmit: isValid && !isSubmitting,
    hasErrors: Object.keys(errors).length > 0,
    touchedFieldsCount: Object.values(touched).filter(Boolean).length,
    errorFieldsCount: Object.keys(errors).length,
  }
}
