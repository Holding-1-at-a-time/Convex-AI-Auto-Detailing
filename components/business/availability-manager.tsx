"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Clock, Calendar, Plus } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface AvailabilityManagerProps {
  businessId: string
}

export function AvailabilityManager({ businessId }: AvailabilityManagerProps) {
  const { user } = useUser()
  const { toast } = useToast()

  const businessProfile = useQuery(api.businessProfiles.getBusinessProfile, { businessId })
  const setBusinessAvailability = useMutation(api.availability.setBusinessAvailability)
  const blockTimeSlot = useMutation(api.availability.blockTimeSlot)

  const [blockDate, setBlockDate] = useState("")
  const [blockStartTime, setBlockStartTime] = useState("")
  const [blockEndTime, setBlockEndTime] = useState("")
  const [blockReason, setBlockReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ]

  // Generate time options (30-minute intervals)
  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeOptions.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  if (businessProfile === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!businessProfile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Business profile not found.</p>
        </CardContent>
      </Card>
    )
  }

  const businessHours = businessProfile.businessHours || {}

  const handleDayToggle = async (dayOfWeek: string, isOpen: boolean) => {
    try {
      await setBusinessAvailability({
        businessId,
        dayOfWeek,
        isOpen,
        openTime: isOpen ? "09:00" : undefined,
        closeTime: isOpen ? "17:00" : undefined,
      })

      toast({
        title: "Availability Updated",
        description: `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} availability has been ${
          isOpen ? "enabled" : "disabled"
        }.`,
      })
    } catch (error) {
      console.error("Error updating availability:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleTimeChange = async (dayOfWeek: string, timeType: "openTime" | "closeTime", time: string) => {
    try {
      const dayHours = businessHours[dayOfWeek]
      if (!dayHours) return

      await setBusinessAvailability({
        businessId,
        dayOfWeek,
        isOpen: true,
        openTime: timeType === "openTime" ? time : dayHours.open,
        closeTime: timeType === "closeTime" ? time : dayHours.close,
      })

      toast({
        title: "Hours Updated",
        description: `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} hours have been updated.`,
      })
    } catch (error) {
      console.error("Error updating hours:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBlockTimeSlot = async () => {
    if (!blockDate || !blockStartTime || !blockEndTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (blockStartTime >= blockEndTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await blockTimeSlot({
        businessId,
        date: blockDate,
        startTime: blockStartTime,
        endTime: blockEndTime,
        reason: blockReason || undefined,
      })

      toast({
        title: "Time Slot Blocked",
        description: `Time slot from ${blockStartTime} to ${blockEndTime} on ${blockDate} has been blocked.`,
      })

      // Reset form
      setBlockDate("")
      setBlockStartTime("")
      setBlockEndTime("")
      setBlockReason("")
    } catch (error) {
      console.error("Error blocking time slot:", error)
      toast({
        title: "Block Failed",
        description: "Failed to block time slot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Business Hours</span>
          </CardTitle>
          <CardDescription>Set your regular operating hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => {
            const dayHours = businessHours[day.key]
            const isOpen = !!dayHours

            return (
              <div key={day.key} className="flex items-center space-x-4 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Switch checked={isOpen} onCheckedChange={(checked) => handleDayToggle(day.key, checked)} />
                  <Label className="min-w-[100px] font-medium">{day.label}</Label>
                </div>

                {isOpen ? (
                  <div className="flex flex-1 items-center space-x-2">
                    <Select
                      value={dayHours?.open || "09:00"}
                      onValueChange={(value) => handleTimeChange(day.key, "openTime", value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={`${day.key}-open-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-muted-foreground">to</span>

                    <Select
                      value={dayHours?.close || "17:00"}
                      onValueChange={(value) => handleTimeChange(day.key, "closeTime", value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={`${day.key}-close-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex-1 text-muted-foreground">Closed</div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Separator />

      {/* Block Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Block Time Slots</span>
          </CardTitle>
          <CardDescription>Block specific time slots for personal use or maintenance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-date">Date</Label>
              <Input
                id="block-date"
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason (Optional)</Label>
              <Input
                id="block-reason"
                placeholder="e.g., Lunch break, Equipment maintenance"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-start-time">Start Time</Label>
              <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={`block-start-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-end-time">End Time</Label>
              <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={`block-end-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleBlockTimeSlot}
            disabled={isSubmitting || !blockDate || !blockStartTime || !blockEndTime}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? "Blocking..." : "Block Time Slot"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
