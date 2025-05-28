"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { format, addDays } from "date-fns"
import { Clock, Check } from "lucide-react"

export default function CustomerBookingSetup() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const servicePackages = useQuery(api.services.getAllServicePackages, { activeOnly: true })
  const vehicles = useQuery(
    api.customerProfiles.getCustomerVehicles,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  const completeOnboarding = useMutation(api.customerProfiles.completeOnboarding)
  const createAppointment = useMutation(api.appointments.createAppointment)

  // Get availability for the selected date and service
  const availability = useQuery(
    api.appointments.checkAvailability,
    selectedDate && selectedService
      ? {
          date: format(selectedDate, "yyyy-MM-dd"),
          serviceType: selectedService,
        }
      : "skip",
  )

  // Loading state
  if (!isUserLoaded || userDetails === undefined || servicePackages === undefined || vehicles === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Get popular services (top 3)
  const popularServices = [...servicePackages]
    .sort((a, b) => (a.popularityRank || 999) - (b.popularityRank || 999))
    .slice(0, 3)

  // Handle booking completion
  async function handleCompleteBooking() {
    if (!userDetails?._id || !selectedDate || !selectedService || !selectedTimeSlot) return

    setIsBooking(true)
    try {
      // Find the selected time slot
      const timeSlot = availability?.availableTimeSlots.find(
        (slot) => `${slot.startTime}-${slot.endTime}` === selectedTimeSlot,
      )

      if (!timeSlot) throw new Error("Time slot not available")

      // Get the first vehicle (if any)
      const vehicleId = vehicles.length > 0 ? vehicles[0]._id : undefined

      // Create the appointment
      await createAppointment({
        customerId: userDetails._id,
        vehicleId,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        serviceType: selectedService,
        notes: "Booked during onboarding",
      })

      // Mark onboarding as completed
      await completeOnboarding({ userId: userDetails._id })

      // Redirect to dashboard
      router.push("/customer/dashboard")
    } catch (error) {
      console.error("Error booking appointment:", error)
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Book Your First Appointment</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-medium">1. Select a Service</h3>
          <div className="space-y-3">
            {popularServices.map((service) => (
              <Card
                key={service._id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedService === service.name ? "border-2 border-primary" : ""
                }`}
                onClick={() => setSelectedService(service.name)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {selectedService === service.name && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  <CardDescription>${service.price.toFixed(2)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-medium">2. Choose a Date</h3>
          <Card>
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                className="mx-auto"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedService && selectedDate && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium">3. Select a Time Slot</h3>

          {availability === undefined ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : availability.availableTimeSlots.length === 0 ? (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <p className="text-muted-foreground">
                  No available time slots for this date. Please select another date.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {availability.availableTimeSlots.map((slot) => (
                <Card
                  key={`${slot.startTime}-${slot.endTime}`}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTimeSlot === `${slot.startTime}-${slot.endTime}` ? "border-2 border-primary" : ""
                  }`}
                  onClick={() => setSelectedTimeSlot(`${slot.startTime}-${slot.endTime}`)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </div>
                    {selectedTimeSlot === `${slot.startTime}-${slot.endTime}` && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => router.push("/customer/onboarding/services")}>
          Back
        </Button>
        <Button
          onClick={handleCompleteBooking}
          disabled={!selectedService || !selectedDate || !selectedTimeSlot || isBooking}
        >
          {isBooking ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Booking...
            </>
          ) : (
            "Complete Booking"
          )}
        </Button>
      </div>
    </div>
  )
}

// Helper function to format time
function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`
}
