"use client"

import { useEffect, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { bookBundle, type BookBundleState } from "@/app/actions/bookBundle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"
import { format } from "date-fns"
import { CalendarIcon, Clock, CheckCircle, AlertCircle, Car } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

interface BundleBookingFormProps {
  bundleId: string
  bundleName: string
  bundleDuration: number
}

export function BundleBookingForm({ bundleId, bundleName, bundleDuration }: BundleBookingFormProps) {
  const { user } = useUser()
  const [state, formAction] = useFormState<BookBundleState | null, FormData>(bookBundle, null)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>()
  const [showSuccess, setShowSuccess] = useState(false)

  // Fetch user's vehicles
  const vehicles = useQuery(api.vehicles.getUserVehicles, user ? { userId: user.id } : "skip")

  // Fetch availability when date is selected
  const availability = useQuery(
    api.bundleBookings.getBundleAvailability,
    selectedDate
      ? {
          bundleId: bundleId as Id<"serviceBundles">,
          date: format(selectedDate, "yyyy-MM-dd"),
        }
      : "skip",
  )

  // Handle successful booking
  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true)
      // Reset form after a delay
      setTimeout(() => {
        setSelectedDate(undefined)
        setSelectedTime(undefined)
        setShowSuccess(false)
      }, 5000)
    }
  }, [state])

  // Show success screen
  if (showSuccess && state?.success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Booking Confirmed!</h3>
            <p className="text-sm text-muted-foreground mb-4">Your bundle booking has been successfully scheduled.</p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Bundle:</strong> {bundleName}
              </p>
              <p>
                <strong>Date:</strong> {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </p>
              <p>
                <strong>Time:</strong> {selectedTime}
              </p>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Book Another Bundle
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="bundleId" value={bundleId} />

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Date
          </CardTitle>
          <CardDescription>Choose your preferred date for the service</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 2))}
            className="rounded-md border"
          />
          <input type="hidden" name="date" value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} />
        </CardContent>
      </Card>

      {/* Time Selection */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Time
            </CardTitle>
            <CardDescription>
              Available time slots for {format(selectedDate, "MMMM d, yyyy")} (Duration: {bundleDuration} minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availability ? (
              availability.availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availability.availableSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      type="button"
                      variant={selectedTime === slot.startTime ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot.startTime)}
                      className={cn("text-sm", selectedTime === slot.startTime && "ring-2 ring-primary ring-offset-2")}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No available time slots for this date. Please select another date.
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}
            <input type="hidden" name="time" value={selectedTime || ""} />
          </CardContent>
        </Card>
      )}

      {/* Customer Information */}
      {selectedDate && selectedTime && (
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Please provide your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                defaultValue={user?.fullName || ""}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" />
            </div>

            {vehicles && vehicles.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="vehicleId">
                  <Car className="h-4 w-4 inline mr-1" />
                  Vehicle (Optional)
                </Label>
                <Select name="vehicleId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_vehicle">No vehicle</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any special requests or information..." rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      {selectedDate && selectedTime && <SubmitButton />}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? (
        <>
          <LoadingSpinner className="mr-2" />
          Booking...
        </>
      ) : (
        "Confirm Bundle Booking"
      )}
    </Button>
  )
}
