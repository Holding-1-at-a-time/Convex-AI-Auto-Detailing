"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface DateTimeSelectionProps {
  businessId: string
  serviceId: string
  serviceDuration: number
  onTimeSlotSelect: (date: string, timeSlot: any) => void
  selectedDate?: string
  selectedTimeSlot?: any
}

export function DateTimeSelection({
  businessId,
  serviceId,
  serviceDuration,
  onTimeSlotSelect,
  selectedDate,
  selectedTimeSlot,
}: DateTimeSelectionProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState<string>("")

  useEffect(() => {
    if (date) {
      const dateStr = date.toISOString().split("T")[0]
      setSelectedDateStr(dateStr)
    }
  }, [date])

  const availableTimeSlots = useQuery(
    api.availability.getAvailableTimeSlots,
    selectedDateStr && businessId && serviceDuration
      ? {
          businessId,
          date: selectedDateStr,
          serviceDuration,
        }
      : "skip",
  )

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
  }

  const handleTimeSlotSelect = (timeSlot: any) => {
    if (selectedDateStr) {
      onTimeSlotSelect(selectedDateStr, timeSlot)
    }
  }

  // Disable past dates
  const disabledDays = {
    before: new Date(),
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Date & Time</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Choose Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={disabledDays}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Times</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDateStr ? (
                <p className="text-muted-foreground text-sm">Please select a date first</p>
              ) : availableTimeSlots === undefined ? (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : !availableTimeSlots || availableTimeSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No available time slots for this date. Please select another date.
                </p>
              ) : (
                <div className="grid gap-2">
                  {availableTimeSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedTimeSlot?.startTime === slot.startTime ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => handleTimeSlotSelect(slot)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.startTime} - {slot.endTime}
                      {selectedTimeSlot?.startTime === slot.startTime && (
                        <Badge variant="secondary" className="ml-auto">
                          Selected
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
