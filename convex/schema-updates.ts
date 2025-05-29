Now, let
's update the appointment booking form to potentially handle bundles. This is a simplified update; a more robust solution might involve a dedicated bundle booking flow.

```typescriptreact file="app/dashboard/customer/components/BookingForm.tsx"
[v0-no-op-code-block-prefix]"use client"

import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/loading-spinner"
import { CalendarIcon, Clock, DollarSign, User, Car, MapPin, Star, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AvailableTimeSlot, BookingFormData } from "@/types/appointment-management"

interface BookingFormProps {
  businessId?: Id<"businessProfiles">
  preSelectedService?: Id<"servicePackages">
  onBookingComplete?: (appointmentId: Id<"appointments">) => void
  bundleId?: Id<"serviceBundles">
}

/**
 * Customer Booking Interface Component
 *
 * Provides a comprehensive booking experience for customers including:
 * - Service selection with detailed information
 * - Real-time availability checking
 * - Vehicle selection integration
 * - Appointment confirmation with notifications
 *
 * @param businessId - Optional specific business to book with
 * @param preSelectedService - Optional pre-selected service
 * @param onBookingComplete - Callback when booking is completed
 * @param bundleId - Optional service bundle to book
 */
export default function BookingForm({ businessId, preSelectedService, onBookingComplete, bundleId }: BookingFormProps) {
  const { user } = useUser()

  // Form state management
  const [selectedBusiness, setSelectedBusiness] = useState<Id<"businessProfiles"> | "">(businessId || "")
  const [selectedService, setSelectedService] = useState<Id<"servicePackages"> | "">(preSelectedService || "")
  const [selectedVehicle, setSelectedVehicle] = useState<Id<"vehicles"> | "">("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Convex queries with optimized loading
  const customerProfile = useQuery(api.customerProfiles.getByUserId, user?.id ? { userId: user.id } : "skip")

  const customerVehicles = useQuery(api.vehicles.getByCustomerId, user?.id ? { customerId: user.id } : "skip")

  const availableBusinesses = useQuery(api.businessProfiles.getActiveBusinesses, !businessId ? {} : "skip")

  const businessServices = useQuery(
    api.services.getBusinessServices,
    selectedBusiness ? { businessId: selectedBusiness } : "skip",
  )

  const allServices = useQuery(api.services.getAllServicePackages, !selectedBusiness ? { activeOnly: true } : "skip")

  const businessDetails = useQuery(
    api.businessProfiles.getById,
    selectedBusiness ? { businessId: selectedBusiness } : "skip",
  )

  const availableSlots = useQuery(
    api.availability.getAvailableTimeSlots,
    selectedDate && selectedService && selectedBusiness
      ? {
          businessId: selectedBusiness,
          date: selectedDate.toISOString().split("T")[0],
          serviceDuration: getServiceDuration(selectedService),
        }
      : "skip",
  )

  const bundleDetails = useQuery(api.serviceBundles.getById, bundleId ? { bundleId: bundleId } : "skip")

  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment)
  const trackInteraction = useMutation(api.recommendations.trackInteraction)
  const sendNotification = useMutation(api.notifications.sendAppointmentConfirmation)
  const incrementBundleRedemption = useMutation(api.serviceBundles.incrementRedemptionCount)

  // Memoized service data
  const availableServices = useMemo(() => {
    return businessServices?.length ? businessServices : allServices
  }, [businessServices, allServices])

  const selectedServiceDetails = useMemo(() => {
    return availableServices?.find((service) => service._id === selectedService)
  }, [availableServices, selectedService])

  /**
   * Get service duration by ID
   */
  function getServiceDuration(serviceId: Id<"servicePackages">): number {
    const service = availableServices?.find((s) => s._id === serviceId)
    return service?.duration || 60
  }

  /**
   * Calculate total price including add-ons
   */
  const calculateTotalPrice = useMemo(() => {
    if (bundleId && bundleDetails) {
      return bundleDetails.totalPrice
    }
    if (!selectedServiceDetails) return 0
    return selectedServiceDetails.price
  }, [selectedServiceDetails, bundleId, bundleDetails])

  const totalDuration = useMemo(() => {
    if (bundleId && bundleDetails) {
      return bundleDetails.totalDuration
    }
    if (!selectedServiceDetails) return 0
    return selectedServiceDetails.duration
  }, [selectedServiceDetails, bundleId, bundleDetails])

  /**
   * Handle form submission with comprehensive validation
   */
  const handleSubmit = async () => {
    // Validation
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book an appointment.",
        variant: "destructive",
      })
      return
    }

    if (!selectedBusiness || !selectedService || !selectedDate || !selectedSlot) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to complete your booking.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare appointment data
      const appointmentData: BookingFormData = {
        serviceId: selectedService,
        businessId: selectedBusiness,
        vehicleId: selectedVehicle || undefined,
        date: selectedDate.toISOString().split("T")[0],
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes.trim() || undefined,
        staffId: selectedSlot.staffId,
      }

      // Create appointment
      const appointmentId = await createAppointment({
        customerId: user.id,
        ...appointmentData,
        bundleId: bundleId, // If booking a bundle
      })

      // Track interaction for recommendations
      await trackInteraction({
        customerId: user.id,
        serviceId: selectedService,
        interactionType: "booked",
      })

      // Send confirmation notification
      await sendNotification({
        appointmentId,
        customerId: user.id,
        businessId: selectedBusiness,
      })

      if (bundleId) {
        await incrementBundleRedemption({ bundleId: bundleId })
      }

      // Success feedback
      toast({
        title: "Appointment Booked Successfully! 🎉",
        description: "You'll receive a confirmation email shortly. We look forward to serving you!",
      })

      // Reset form
      resetForm()
      setShowConfirmation(true)

      // Callback for parent component
      onBookingComplete?.(appointmentId)
    } catch (error) {
      console.error("Booking error:", error)

      const errorMessage =
        error instanceof Error ? error.message : "Unable to book appointment. Please try again or contact support."

      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    if (!businessId) setSelectedBusiness("")
    if (!preSelectedService) setSelectedService("")
    setSelectedVehicle("")
    setSelectedDate(undefined)
    setSelectedSlot(null)
    setNotes("")
  }

  /**
   * Check if a date should be disabled
   */
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Disable past dates
    if (date < today) return true

    // Disable dates more than 90 days in advance
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 90)
    if (date > maxDate) return true

    // Check business hours (if available)
    if (businessDetails?.businessHours) {
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "lowercase" })
      const dayHours = businessDetails.businessHours[dayOfWeek]
      if (!dayHours?.isOpen) return true
    }

    return false
  }

  // Loading state
  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Please sign in to book an appointment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Book Your Detailing Appointment
        </CardTitle>
        <CardDescription>
          Select your preferred service, date, and time to schedule your auto detailing appointment.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Business Selection (if not pre-selected) */}
        {!businessId && availableBusinesses && (
          <div className="space-y-2">
            <Label htmlFor="business">Select Business *</Label>
            <Select
              value={selectedBusiness}
              onValueChange={(value) => setSelectedBusiness(value as Id<"businessProfiles">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a detailing business" />
              </SelectTrigger>
              <SelectContent>
                {availableBusinesses.map((business) => (
                  <SelectItem key={business._id} value={business._id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{business.businessName}</span>
                      {business.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs">{business.rating}</span>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Service Selection */}
        <div className="space-y-2">
          <Label htmlFor="service">Select Service *</Label>
          <Select
            value={selectedService}
            onValueChange={(value) => setSelectedService(value as Id<"servicePackages">)}
            disabled={bundleId !== undefined}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a detailing service" />
            </SelectTrigger>
            <SelectContent>
              {availableServices?.map((service) => (
                <SelectItem key={service._id} value={service._id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{service.name}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />${service.price}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Service Details */}
          {selectedServiceDetails && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{selectedServiceDetails.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{selectedServiceDetails.description}</p>
                    </div>
                    <Badge variant="default" className="ml-4">
                      ${selectedServiceDetails.price}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{selectedServiceDetails.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>${selectedServiceDetails.price}</span>
                    </div>
                  </div>

                  {selectedServiceDetails.requirements && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Requirements:</strong> {selectedServiceDetails.requirements.join(", ")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vehicle Selection */}
        {customerVehicles && customerVehicles.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="vehicle">Select Vehicle (Optional)</Label>
            <Select value={selectedVehicle} onValueChange={(value) => setSelectedVehicle(value as Id<"vehicles">)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle for this service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific vehicle</SelectItem>
                {customerVehicles.map((vehicle) => (
                  <SelectItem key={vehicle._id} value={vehicle._id}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.color && ` - ${vehicle.color}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Selection */}
        {selectedService && selectedBusiness && (
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <div className="border rounded-md p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md"
              />
            </div>
          </div>
        )}

        {/* Time Slot Selection */}
        {selectedDate && availableSlots && (
          <div className="space-y-2">
            <Label>Available Time Slots *</Label>
            {availableSlots.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No available time slots for {selectedDate.toLocaleDateString()}. Please choose a different date or
                  contact the business directly.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    className="h-auto p-3 flex flex-col items-center justify-center"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <span className="font-medium text-sm">{slot.startTime}</span>
                    <span className="text-xs text-muted-foreground">{slot.endTime}</span>
                    {slot.staffName && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {slot.staffName}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests, vehicle details, or preferences..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">{notes.length}/500 characters</div>
        </div>

        {/* Booking Summary */}
        {selectedServiceDetails && selectedDate && selectedSlot && (
          <>
            <Separator />
            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{selectedServiceDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{selectedServiceDetails.duration} minutes</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Price:</span>
                  <span>${calculateTotalPrice}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedBusiness || !selectedService || !selectedDate || !selectedSlot || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Booking Appointment...
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Confirm Booking
            </>
          )}
        </Button>

        {/* Terms and Conditions */}
        <div className="text-xs text-muted-foreground text-center">
          By booking this appointment, you agree to our{" "}
          <a href="/terms" className="underline hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </a>
          .
        </div>
      </CardContent>
    </Card>
  )
}
