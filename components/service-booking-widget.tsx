"use client"

import Link from "next/link"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import { Clock, CalendarIcon, DollarSign } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface ServiceBookingWidgetProps {
  serviceId: Id<"servicePackages">
}

export default function ServiceBookingWidget({ serviceId }: ServiceBookingWidgetProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>()
  const [isBooking, setIsBooking] = useState(false)

  // Get service details
  const service = useQuery(api.serviceManagement.getServicePackageById, { serviceId })

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get available time slots for the selected date
  const availableSlots =
    useQuery(
      api.availability.getAvailableTimeSlots,
      service && selectedDate
        ? {
            businessId: service.businessId,
            date: selectedDate.toISOString().split("T")[0],
            serviceDuration: service.duration,
          }
        : "skip",
    ) || []

  // Book appointment mutation
  const createAppointment = useMutation(api.appointments.createAppointment)

  // Loading state
  if (!service) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  // Handle booking
  const handleBooking = async () => {
    if (!user || !selectedDate || !selectedTimeSlot || !service) {
      toast({
        title: "Booking Error",
        description: "Please select a date and time to book this service.",
        variant: "destructive",
      })
      return
    }

    setIsBooking(true)

    try {
      // Find the selected time slot
      const slot = availableSlots.find((s) => `${s.startTime}-${s.endTime}` === selectedTimeSlot)

      if (!slot) {
        throw new Error("Selected time slot not found")
      }

      // Create appointment
      await createAppointment({
        customerId: user.id,
        date: selectedDate.toISOString().split("T")[0],
        startTime: slot.startTime,
        endTime: slot.endTime,
        serviceType: service.name,
        price: service.price,
      })

      toast({
        title: "Booking Confirmed!",
        description: "Your appointment has been successfully booked.",
      })

      // Reset selection
      setSelectedDate(undefined)
      setSelectedTimeSlot(undefined)
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book appointment",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book This Service</CardTitle>
        <CardDescription>Select a date and time to schedule your appointment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Summary */}
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-medium">{service.name}</h3>
          <div className="flex items-center justify-between mt-2">
            <Badge>
              <DollarSign className="h-3 w-3 mr-1" />
              {service.price.toFixed(2)}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              <span>{service.duration} min</span>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <h3 className="text-sm font-medium mb-2">Select Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
            className="rounded-md border"
          />
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div>
            <h3 className="text-sm font-medium mb-2">Select Time</h3>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedTimeSlot === `${slot.startTime}-${slot.endTime}` ? "default" : "outline"}
                    className="text-sm"
                    onClick={() => setSelectedTimeSlot(`${slot.startTime}-${slot.endTime}`)}
                  >
                    {slot.startTime} - {slot.endTime}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No available time slots for this date. Please select another date.
              </p>
            )}
          </div>
        )}

        {/* Login Prompt */}
        {!isUserLoaded || !user ? (
          <div className="bg-muted p-4 rounded-md text-center">
            <p className="mb-2">Please sign in to book this service</p>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isUserLoaded || !user || !selectedDate || !selectedTimeSlot || isBooking}
          onClick={handleBooking}
        >
          {isBooking ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Booking...
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Book Appointment
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
