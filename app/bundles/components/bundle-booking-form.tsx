"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, User, Package, AlertCircle, Info, ListChecks } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AvailableTimeSlot } from "@/types/appointment-management"
import type { BundleBookingFormProps } from "@/types/bundle-booking"
import { format } from "date-fns"

export default function BundleBookingForm({ bundleId, businessId, onBookingComplete }: BundleBookingFormProps) {
  const { user } = useUser()

  const [selectedVehicle, setSelectedVehicle] = useState<Id<"vehicles"> | "">("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch bundle details
  const bundleDetails = useQuery(api.serviceBundles.getBundleById, { bundleId })

  // Fetch customer vehicles
  const customerVehicles = useQuery(api.vehicles.getByCustomerId, user?.id ? { customerId: user.id } : "skip")

  // Fetch business details (e.g., for business hours)
  const businessProfileDetails = useQuery(api.businessProfiles.getById, businessId ? { businessId } : "skip")

  // Fetch available slots - **ASSUMES BACKEND ADAPTATION**
  // Assumes `getAvailableTimeSlots` can take `bundleDuration`
  const availableSlots = useQuery(
    api.availability.getAvailableTimeSlots, // This query needs to be adapted or a new one created for bundles
    selectedDate && bundleDetails
      ? {
          businessId: bundleDetails.businessId,
          date: format(selectedDate, "yyyy-MM-dd"),
          serviceDuration: bundleDetails.totalDuration, // Using bundle's total duration
        }
      : "skip",
  )

  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment) // **ASSUMES BACKEND ADAPTATION**
  const incrementBundleRedemption = useMutation(api.serviceBundles.incrementBundleRedemption)
  const sendNotification = useMutation(api.notifications.sendAppointmentConfirmation) // Assuming this can be reused

  useEffect(() => {
    if (bundleDetails && !bundleDetails.isActive) {
      setError("This bundle is no longer active and cannot be booked.")
    }
    // Could add more checks here (e.g., validity dates, redemption limits)
  }, [bundleDetails])

  const handleSubmit = async () => {
    if (!user || !bundleDetails || !selectedDate || !selectedSlot) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time slot.",
        variant: "destructive",
      })
      return
    }

    if (!bundleDetails.isActive) {
      toast({
        title: "Bundle Not Available",
        description: "This bundle cannot be booked at this time.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const appointmentData = {
        customerId: user.id,
        businessId: bundleDetails.businessId,
        bundleId: bundleDetails._id,
        serviceType: `Bundle: ${bundleDetails.name}`, // Or a more structured way to denote bundle
        price: bundleDetails.totalPrice,
        // Note: Individual services within the bundle are not itemized in the appointment here.
        // This could be added as a 'metadata' field if needed.
        vehicleId: selectedVehicle || undefined,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime, // This should be calculated based on bundle totalDuration
        notes: notes.trim() || undefined,
        staffId: selectedSlot.staffId, // If a staff is assigned for the whole bundle duration
      }

      // **BACKEND ADAPTATION NEEDED for createAppointment to handle bundle specifics**
      const appointmentId = await createAppointment(appointmentData)

      await incrementBundleRedemption({ bundleId: bundleDetails._id })

      // Send confirmation notification
      await sendNotification({
        appointmentId,
        customerId: user.id,
        businessId: bundleDetails.businessId,
      })

      toast({
        title: "Bundle Booked Successfully! 🎉",
        description: `Your appointment for "${bundleDetails.name}" is confirmed.`,
      })

      setSelectedDate(undefined)
      setSelectedSlot(null)
      setNotes("")
      setSelectedVehicle("")

      onBookingComplete?.(appointmentId)
    } catch (err) {
      console.error("Bundle booking error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unable to book bundle. Please try again."
      setError(errorMessage)
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 90) // Max 90 days in advance
    if (date > maxDate) return true

    if (businessProfileDetails?.businessHours) {
      const dayOfWeek = format(date, "EEEE").toLowerCase() as keyof typeof businessProfileDetails.businessHours
      const dayHours = businessProfileDetails.businessHours[dayOfWeek]
      if (dayHours && !dayHours.isOpen) return true
    }
    return false
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Please Sign In</AlertTitle>
            <AlertDescription>You need to be signed in to book a service bundle.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!bundleDetails) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <LoadingSpinner />
          <p className="ml-2">Loading bundle details...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Booking Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>An Error Occurred</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => setError(null)} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <CardTitle>Book Bundle: {bundleDetails.name}</CardTitle>
        </div>
        <CardDescription>Schedule your appointment for the "{bundleDetails.name}" service bundle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>Bundle Details</AlertTitle>
          <AlertDescription>
            <p>{bundleDetails.description}</p>
            <div className="mt-2">
              <strong>Services Included:</strong>
              <ul className="list-disc list-inside ml-4 text-sm">
                {bundleDetails.services.map((service) => (
                  <li key={service._id}>{service.name}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" /> Total Duration: {bundleDetails.totalDuration} min
              </Badge>
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" /> Bundle Price: ${bundleDetails.totalPrice.toFixed(2)}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {customerVehicles && customerVehicles.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="vehicle">Select Vehicle (Optional)</Label>
            <Select value={selectedVehicle} onValueChange={(value) => setSelectedVehicle(value as Id<"vehicles">)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific vehicle</SelectItem>
                {customerVehicles.map((vehicle) => (
                  <SelectItem key={vehicle._id} value={vehicle._id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.licensePlate || "No Plate"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="date">Select Date *</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={isDateDisabled}
            className="rounded-md border"
          />
        </div>

        {selectedDate && (
          <div className="space-y-2">
            <Label>Available Time Slots for {format(selectedDate, "PPP")} *</Label>
            {!availableSlots && <LoadingSpinner />}
            {availableSlots && availableSlots.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Slots Available</AlertTitle>
                <AlertDescription>
                  No time slots available for this bundle on the selected date. Please try another date.
                </AlertDescription>
              </Alert>
            )}
            {availableSlots && availableSlots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot)}
                    className="h-auto p-3 flex flex-col items-center"
                  >
                    <span className="font-medium">{slot.startTime}</span>
                    <span className="text-xs text-muted-foreground">Ends {slot.endTime}</span>
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

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or information..."
            rows={3}
          />
        </div>

        {selectedDate && selectedSlot && bundleDetails && (
          <>
            <Separator />
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Bundle:</span>
                  <span className="font-medium">{bundleDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium">{format(selectedDate, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Duration:</span>
                  <span className="font-medium">{bundleDetails.totalDuration} minutes</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total Price:</span>
                  <span>${bundleDetails.totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={!selectedDate || !selectedSlot || isSubmitting || !bundleDetails?.isActive}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" /> Booking Bundle...
            </>
          ) : (
            "Confirm Bundle Booking"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
