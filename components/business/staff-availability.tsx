"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface StaffAvailabilityProps {
  staffId: string
  staffName?: string
}

export function StaffAvailability({ staffId, staffName }: StaffAvailabilityProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isAvailable, setIsAvailable] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedDateStr = selectedDate.toISOString().split("T")[0]

  // Fetch staff availability for the selected date
  const staffAvailability = useQuery(api.staff.getStaffAvailability, {
    staffId,
    startDate: selectedDateStr,
    endDate: selectedDateStr,
  })

  const setStaffAvailability = useMutation(api.staff.setStaffAvailability)

  // Generate time options (30-minute intervals)
  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeOptions.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  // Update form when selected date changes
  const updateFormFromAvailability = () => {
    if (staffAvailability && staffAvailability.dates && staffAvailability.dates.length > 0) {
      const dateAvailability = staffAvailability.dates[0]
      setIsAvailable(dateAvailability.isAvailable)

      if (dateAvailability.startTime) {
        setStartTime(dateAvailability.startTime)
      }

      if (dateAvailability.endTime) {
        setEndTime(dateAvailability.endTime)
      }

      setReason(dateAvailability.reason || "")
    } else {
      // Default values
      setIsAvailable(true)
      setStartTime("09:00")
      setEndTime("17:00")
      setReason("")
    }
  }

  // Update form when availability data changes
  useState(() => {
    if (staffAvailability) {
      updateFormFromAvailability()
    }
  })

  const handleSubmit = async () => {
    if (!staffId || !selectedDateStr) {
      toast({
        title: "Missing Information",
        description: "Please select a staff member and date.",
        variant: "destructive",
      })
      return
    }

    if (isAvailable && startTime >= endTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await setStaffAvailability({
        staffId,
        date: selectedDateStr,
        startTime,
        endTime,
        isAvailable,
        reason: reason || undefined,
      })

      toast({
        title: "Availability Updated",
        description: `Availability for ${new Date(selectedDateStr).toLocaleDateString()} has been updated.`,
      })
    } catch (error) {
      console.error("Error updating availability:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  if (staffAvailability === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Availability</CardTitle>
          <CardDescription>
            {staffName ? `Manage availability for ${staffName}` : "Manage staff availability"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-available" className="text-base font-medium">
                    Available on {formatDate(selectedDateStr)}
                  </Label>
                  <Switch id="is-available" checked={isAvailable} onCheckedChange={setIsAvailable} />
                </div>
              </div>

              {isAvailable && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`start-${time}`} value={time}>
                              {new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Select value={endTime} onValueChange={setEndTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`end-${time}`} value={time}>
                              {new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {!isAvailable && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Vacation, Training, Personal day"
                    rows={3}
                  />
                </div>
              )}

              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-4">
                {isSubmitting ? "Updating..." : "Update Availability"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
