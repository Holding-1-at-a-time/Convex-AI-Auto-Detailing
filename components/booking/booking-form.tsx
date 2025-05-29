"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ServiceSelection } from "./service-selection"
import { DateTimeSelection } from "./date-time-selection"
import { StaffSelection } from "./staff-selection"
import { useToast } from "@/hooks/use-toast"
import { CalendarDays, Car, MessageSquare, CreditCard, User } from "lucide-react"

interface BookingFormProps {
  businessId: string
  onBookingComplete?: () => void
}

export function BookingForm({ businessId, onBookingComplete }: BookingFormProps) {
  const { user } = useUser()
  const { toast } = useToast()

  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [selectedStaffInfo, setSelectedStaffInfo] = useState<any>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const vehicles = useQuery(
    api.vehicles.getVehiclesByCustomer,
    userDetails?._id ? { customerId: userDetails._id } : "skip",
  )

  const createAppointment = useMutation(api.appointments.createAppointment)

  const handleServiceSelect = (serviceId: string, service: any) => {
    setSelectedService(service)
    // Reset time and staff selection when service changes
    setSelectedDate("")
    setSelectedTimeSlot(null)
    setSelectedStaffId("")
    setSelectedStaffInfo(null)
  }

  const handleTimeSlotSelect = (date: string, timeSlot: any) => {
    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    // Reset staff selection when time changes
    setSelectedStaffId("")
    setSelectedStaffInfo(null)
  }

  const handleStaffSelect = (staffId: string, staffInfo: any) => {
    setSelectedStaffId(staffId)
    setSelectedStaffInfo(staffInfo)
  }

  const handleSubmit = async () => {
    if (!user || !userDetails || !selectedService || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const appointmentId = await createAppointment({
        customerId: userDetails.clerkId,
        vehicleId: selectedVehicleId || undefined,
        staffId: selectedStaffId || undefined,
        date: selectedDate,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        serviceType: selectedService.name,
        price: selectedService.price,
        notes: notes || undefined,
      })

      toast({
        title: "Appointment Booked!",
        description: `Your appointment for ${selectedService.name} has been scheduled for ${selectedDate} at ${selectedTimeSlot.startTime}.`,
      })

      // Reset form
      setSelectedService(null)
      setSelectedDate("")
      setSelectedTimeSlot(null)
      setSelectedStaffId("")
      setSelectedStaffInfo(null)
      setSelectedVehicleId("")
      setNotes("")

      onBookingComplete?.()
    } catch (error) {
      console.error("Error creating appointment:", error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToDateTime = selectedService !== null
  const canProceedToStaff = selectedDate && selectedTimeSlot
  const canProceedToDetails = canProceedToStaff
  const canSubmit = canProceedToDetails && userDetails

  return (
    <div className="space-y-6">
      {/* Step 1: Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
              1
            </span>
            <span>Choose Service</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceSelection
            businessId={businessId}
            onServiceSelect={handleServiceSelect}
            selectedServiceId={selectedService?._id}
          />
        </CardContent>
      </Card>

      {/* Step 2: Date & Time Selection */}
      {canProceedToDateTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                2
              </span>
              <CalendarDays className="h-5 w-5" />
              <span>Select Date & Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateTimeSelection
              businessId={businessId}
              serviceId={selectedService._id}
              serviceDuration={Number.parseInt(selectedService.duration) || 60}
              onTimeSlotSelect={handleTimeSlotSelect}
              selectedDate={selectedDate}
              selectedTimeSlot={selectedTimeSlot}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Staff Selection */}
      {canProceedToStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                3
              </span>
              <User className="h-5 w-5" />
              <span>Select Staff</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StaffSelection
              businessId={businessId}
              serviceId={selectedService._id}
              date={selectedDate}
              startTime={selectedTimeSlot.startTime}
              endTime={selectedTimeSlot.endTime}
              onStaffSelect={handleStaffSelect}
              selectedStaffId={selectedStaffId}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Additional Details */}
      {canProceedToDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                4
              </span>
              <MessageSquare className="h-5 w-5" />
              <span>Additional Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vehicle Selection */}
            {vehicles && vehicles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="vehicle" className="flex items-center space-x-2">
                  <Car className="h-4 w-4" />
                  <span>Select Vehicle (Optional)</span>
                </Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.color && ` (${vehicle.color})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Special Instructions (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or notes for your appointment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Summary & Submit */}
      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Booking Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Service:</span>
                <span>{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{new Date(selectedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>
                  {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </span>
              </div>
              {selectedStaffInfo && (
                <div className="flex justify-between">
                  <span className="font-medium">Staff:</span>
                  <span>{selectedStaffInfo.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Duration:</span>
                <span>{selectedService.duration || 60} minutes</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${selectedService.price.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
