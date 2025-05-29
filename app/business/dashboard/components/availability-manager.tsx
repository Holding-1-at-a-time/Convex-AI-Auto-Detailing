"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, Calendar, Plus, X, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AvailabilityManagerProps {
  businessId: Id<"businessProfiles">
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

export default function AvailabilityManager({ businessId }: AvailabilityManagerProps) {
  const { user } = useUser()

  // State for blocking time slots
  const [blockDate, setBlockDate] = useState("")
  const [blockStartTime, setBlockStartTime] = useState("")
  const [blockEndTime, setBlockEndTime] = useState("")
  const [blockReason, setBlockReason] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Convex queries
  const businessProfile = useQuery(api.businessProfiles.getByUserId, user?.id ? { userId: user.id } : "skip")

  const blockedSlots = useQuery(api.businessAvailability.getBlockedTimeSlots, businessId ? { businessId } : "skip")

  // Mutations
  const setBusinessAvailability = useMutation(api.availability.setBusinessAvailability)
  const blockTimeSlot = useMutation(api.availability.blockTimeSlot)
  const removeBlockedSlot = useMutation(api.businessAvailability.removeBlockedTimeSlot)

  // Handle business hours update
  const handleBusinessHoursUpdate = async (
    dayOfWeek: string,
    isOpen: boolean,
    openTime?: string,
    closeTime?: string,
  ) => {
    if (!businessId) return

    setIsUpdating(true)
    try {
      await setBusinessAvailability({
        businessId,
        dayOfWeek,
        isOpen,
        openTime,
        closeTime,
      })

      toast({
        title: "Hours Updated",
        description: `Business hours for ${dayOfWeek} have been updated.`,
      })
    } catch (error) {
      console.error("Error updating business hours:", error)
      toast({
        title: "Update Failed",
        description: "Unable to update business hours. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle blocking time slot
  const handleBlockTimeSlot = async () => {
    if (!businessId || !blockDate || !blockStartTime || !blockEndTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to block time slot.",
        variant: "destructive",
      })
      return
    }

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
        description: "The selected time slot has been blocked successfully.",
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
        description: error instanceof Error ? error.message : "Unable to block time slot. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle removing blocked slot
  const handleRemoveBlockedSlot = async (slotId: Id<"blockedTimeSlots">) => {
    try {
      await removeBlockedSlot({ slotId })
      toast({
        title: "Block Removed",
        description: "The blocked time slot has been removed.",
      })
    } catch (error) {
      console.error("Error removing blocked slot:", error)
      toast({
        title: "Remove Failed",
        description: "Unable to remove blocked time slot. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!businessProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <LoadingSpinner className="h-6 w-6" />
        </CardContent>
      </Card>
    )
  }

  const businessHours = businessProfile.businessHours || {}

  return (
    <div className="space-y-6">
      {/* Business Hours Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
          <CardDescription>Set your regular operating hours for each day of the week.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayHours = businessHours[day.key]
            const isOpen = !!dayHours

            return (
              <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleBusinessHoursUpdate(day.key, true, "09:00", "17:00")
                      } else {
                        handleBusinessHoursUpdate(day.key, false)
                      }
                    }}
                    disabled={isUpdating}
                  />
                  <Label className="font-medium min-w-[100px]">{day.label}</Label>
                </div>

                {isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={dayHours?.open || "09:00"}
                      onChange={(e) =>
                        handleBusinessHoursUpdate(day.key, true, e.target.value, dayHours?.close || "17:00")
                      }
                      className="w-24"
                      disabled={isUpdating}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={dayHours?.close || "17:00"}
                      onChange={(e) =>
                        handleBusinessHoursUpdate(day.key, true, dayHours?.open || "09:00", e.target.value)
                      }
                      className="w-24"
                      disabled={isUpdating}
                    />
                  </div>
                ) : (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Block Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Block Time Slots
          </CardTitle>
          <CardDescription>Block specific time slots for breaks, maintenance, or personal use.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label htmlFor="block-start">Start Time</Label>
              <Input
                id="block-start"
                type="time"
                value={blockStartTime}
                onChange={(e) => setBlockStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-end">End Time</Label>
              <Input
                id="block-end"
                type="time"
                value={blockEndTime}
                onChange={(e) => setBlockEndTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason (Optional)</Label>
              <Input
                id="block-reason"
                placeholder="e.g., Lunch break"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleBlockTimeSlot} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Block Time Slot
          </Button>
        </CardContent>
      </Card>

      {/* Current Blocked Slots */}
      {blockedSlots && blockedSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Blocked Time Slots
            </CardTitle>
            <CardDescription>Currently blocked time slots that are unavailable for booking.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {blockedSlots.map((slot) => (
                <div key={slot._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(slot.date).toLocaleDateString()} • {slot.startTime} - {slot.endTime}
                    </div>
                    {slot.reason && <div className="text-sm text-muted-foreground">{slot.reason}</div>}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBlockedSlot(slot._id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
