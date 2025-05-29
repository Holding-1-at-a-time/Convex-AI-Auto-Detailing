"use client"

import { useState } from "react"
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
import { LoadingSpinner } from "@/components/loading-spinner"
import { CalendarIcon, Clock, DollarSign, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AppointmentSlot } from "@/types/appointment"

interface ServiceBookingFormProps {
  businessId?: Id<"businessProfiles">
}

export default function ServiceBookingForm({ businessId }: ServiceBookingFormProps) {
  const { user } = useUser()

  // State management
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Convex queries
  const customerProfile = useQuery(api.customerProfiles.getByUserId, user?.id ? { userId: user.id } : "skip")

  const vehicles = useQuery(api.vehicles.getByCustomerId, user?.id ? { customerId: user.id } : "skip")

  const services = useQuery(api.services.getAllServicePackages, { activeOnly: true })

  const businessServices = useQuery(api.services.getBusinessServices, businessId ? { businessId } : "skip")

  const availableSlots = useQuery(
    api.availability.getAvailableTimeSlots,
    selectedDate && selectedService && businessId
      ? {
          businessId,
          date: selectedDate.toISOString().split("T")[0],
          serviceDuration: getServiceDuration(selectedService),
        }
      : "skip",
  )

  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment)
  const trackInteraction = useMutation(api.recommendations.trackInteraction)

  // Helper function to get service duration
  function getServiceDuration(serviceId: string): number {
    const service = (businessServices || services)?.find((s) => s._id === serviceId)
    return service?.duration || 60
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!user || !selectedService || !selectedDate || !selectedSlot) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const appointmentData = {
        customerId: user.id,
        vehicleId: selectedVehicle ? (selectedVehicle as Id<"vehicles">) : undefined,
        businessId: businessId!,
        date: selectedDate.toISOString().split("T")[0],
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        serviceType: selectedService,
        notes: notes || undefined,
        staffId: selectedSlot.staffId,
      }

      const appointmentId = await createAppointment(appointmentData)

      // Track service interaction for recommendations
      if (selectedService) {
        await trackInteraction({
          customerId: user.id,
          serviceId: selectedService as Id<"servicePackages">,
          interactionType: "booked",
        })
      }

      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully scheduled. You'll receive a confirmation shortly.",
      })

      // Reset form
      setSelectedDate(undefined)
      setSelectedService("")
      setSelectedVehicle("")
      setSelectedSlot(null)
      setNotes("")
    } catch (error) {
      console.error("Error creating appointment:", error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Unable to book appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get available services (prioritize business-specific services)
  const availableServices = businessServices?.length ? businessServices : services

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Book an Appointment
        </CardTitle>
        <CardDescription>
          Select a service and available time slot to schedule your auto detailing appointment.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Service Selection */}
        <div className="space-y-2">
          <Label htmlFor="service">Select Service *</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a detailing service" />
            </SelectTrigger>
            <SelectContent>
              {availableServices?.map((service) => (
                <SelectItem key={service._id} value={service._id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{service.name}</span>
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

          {selectedService && (
            <div className="p-3 bg-muted rounded-md">
              {(() => {
                const service = availableServices?.find((s) => s._id === selectedService)
                return service ? (
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm">Duration: {service.duration} minutes</span>
                      <span className="text-sm">Price: ${service.price}</span>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )}
        </div>

        {/* Vehicle Selection */}
        {vehicles && vehicles.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="vehicle">Select Vehicle (Optional)</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle._id} value={vehicle._id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                    {vehicle.color && ` - ${vehicle.color}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Selection */}
        {selectedService && (
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
              className="rounded-md border"
            />
          </div>
        )}

        {/* Time Slot Selection */}
        {selectedDate && availableSlots && (
          <div className="space-y-2">
            <Label>Available Time Slots *</Label>
            {availableSlots.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No available time slots for the selected date. Please choose a different date.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    className="h-auto p-3 flex flex-col items-center"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <span className="font-medium">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    {slot.staffName && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
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

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests or vehicle details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!user || !selectedService || !selectedDate || !selectedSlot || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Booking Appointment...
            </>
          ) : (
            "Book Appointment"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
