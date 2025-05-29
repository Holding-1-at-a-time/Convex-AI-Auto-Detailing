"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, Calendar, Plus, X, AlertCircle, Settings, Save, RotateCcw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { BusinessHours } from "@/types/appointment-management"

interface AvailabilityManagerProps {
  businessId: Id<"businessProfiles">
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const

/**
 * Business Owner Availability Management Component
 *
 * Comprehensive interface for managing business availability including:
 * - Regular business hours configuration
 * - Break time management
 * - Time slot blocking for special circumstances
 * - Recurring availability patterns
 * - Real-time updates across all clients
 *
 * @param businessId - The business profile ID to manage availability for
 */
export default function AvailabilityManager({ businessId }: AvailabilityManagerProps) {
  const { user } = useUser()

  // State for business hours management
  const [businessHours, setBusinessHours] = useState<BusinessHours>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // State for blocking time slots
  const [blockForm, setBlockForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
    isRecurring: false,
    recurringPattern: "weekly" as "daily" | "weekly" | "monthly",
  })

  // State for break management
  const [breakForm, setBreakForm] = useState({
    day: "",
    startTime: "",
    endTime: "",
    reason: "",
  })

  const [isUpdating, setIsUpdating] = useState(false)

  // Convex queries
  const businessProfile = useQuery(api.businessProfiles.getById, businessId ? { businessId } : "skip")

  const blockedSlots = useQuery(api.businessAvailability.getBlockedTimeSlots, businessId ? { businessId } : "skip")

  const upcomingAppointments = useQuery(
    api.appointments.getBusinessAppointments,
    businessId ? { businessId, limit: 10 } : "skip",
  )

  // Mutations
  const updateBusinessHours = useMutation(api.businessAvailability.updateBusinessHours)
  const blockTimeSlot = useMutation(api.businessAvailability.blockTimeSlot)
  const removeBlockedSlot = useMutation(api.businessAvailability.removeBlockedTimeSlot)
  const addBreakTime = useMutation(api.businessAvailability.addBreakTime)
  const removeBreakTime = useMutation(api.businessAvailability.removeBreakTime)

  // Initialize business hours from profile
  useEffect(() => {
    if (businessProfile?.businessHours) {
      setBusinessHours(businessProfile.businessHours)
    }
  }, [businessProfile])

  /**
   * Handle business hours update for a specific day
   */
  const handleBusinessHoursUpdate = (dayOfWeek: string, isOpen: boolean, openTime?: string, closeTime?: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [dayOfWeek]: {
        isOpen,
        openTime: isOpen ? openTime : undefined,
        closeTime: isOpen ? closeTime : undefined,
        breaks: prev[dayOfWeek]?.breaks || [],
      },
    }))
    setHasUnsavedChanges(true)
  }

  /**
   * Save business hours to database
   */
  const handleSaveBusinessHours = async () => {
    if (!businessId) return

    setIsUpdating(true)
    try {
      await updateBusinessHours({
        businessId,
        businessHours,
      })

      toast({
        title: "Business Hours Updated",
        description: "Your availability has been saved and is now live for customers.",
      })
      setHasUnsavedChanges(false)
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

  /**
   * Handle blocking a time slot
   */
  const handleBlockTimeSlot = async () => {
    if (!businessId || !blockForm.date || !blockForm.startTime || !blockForm.endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to block time slot.",
        variant: "destructive",
      })
      return
    }

    // Validate time range
    if (blockForm.startTime >= blockForm.endTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive",
      })
      return
    }

    try {
      await blockTimeSlot({
        businessId,
        date: blockForm.date,
        startTime: blockForm.startTime,
        endTime: blockForm.endTime,
        reason: blockForm.reason || undefined,
        isRecurring: blockForm.isRecurring,
        recurringPattern: blockForm.isRecurring ? blockForm.recurringPattern : undefined,
      })

      toast({
        title: "Time Slot Blocked",
        description: blockForm.isRecurring
          ? `Recurring ${blockForm.recurringPattern} block has been created.`
          : "The selected time slot has been blocked successfully.",
      })

      // Reset form
      setBlockForm({
        date: "",
        startTime: "",
        endTime: "",
        reason: "",
        isRecurring: false,
        recurringPattern: "weekly",
      })
    } catch (error) {
      console.error("Error blocking time slot:", error)
      toast({
        title: "Block Failed",
        description: error instanceof Error ? error.message : "Unable to block time slot. Please try again.",
        variant: "destructive",
      })
    }
  }

  /**
   * Handle removing a blocked slot
   */
  const handleRemoveBlockedSlot = async (slotId: Id<"blockedTimeSlots">) => {
    try {
      await removeBlockedSlot({ slotId })
      toast({
        title: "Block Removed",
        description: "The blocked time slot has been removed and is now available for booking.",
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

  /**
   * Handle adding break time
   */
  const handleAddBreak = async () => {
    if (!breakForm.day || !breakForm.startTime || !breakForm.endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to add a break.",
        variant: "destructive",
      })
      return
    }

    if (breakForm.startTime >= breakForm.endTime) {
      toast({
        title: "Invalid Time Range",
        description: "Break end time must be after start time.",
        variant: "destructive",
      })
      return
    }

    const newBreak = {
      startTime: breakForm.startTime,
      endTime: breakForm.endTime,
      reason: breakForm.reason || "Break",
    }

    setBusinessHours((prev) => ({
      ...prev,
      [breakForm.day]: {
        ...prev[breakForm.day],
        breaks: [...(prev[breakForm.day]?.breaks || []), newBreak],
      },
    }))

    setHasUnsavedChanges(true)

    // Reset break form
    setBreakForm({
      day: "",
      startTime: "",
      endTime: "",
      reason: "",
    })

    toast({
      title: "Break Added",
      description: "Break time has been added. Don't forget to save your changes.",
    })
  }

  /**
   * Handle removing break time
   */
  const handleRemoveBreak = (day: string, breakIndex: number) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day]?.breaks?.filter((_, index) => index !== breakIndex) || [],
      },
    }))
    setHasUnsavedChanges(true)
  }

  /**
   * Get upcoming conflicts for a day
   */
  const getUpcomingConflicts = (day: string) => {
    if (!upcomingAppointments) return []

    const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.key === day)
    return upcomingAppointments.filter((apt) => {
      const aptDate = new Date(apt.date)
      return aptDate.getDay() === dayIndex && aptDate >= new Date()
    })
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

  return (
    <div className="space-y-6">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Availability Management</h2>
          <p className="text-muted-foreground">Configure your business hours and manage time slot availability</p>
        </div>

        {hasUnsavedChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBusinessHours(businessProfile.businessHours || {})
                setHasUnsavedChanges(false)
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSaveBusinessHours} disabled={isUpdating}>
              {isUpdating ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="hours" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="blocks">Blocked Times</TabsTrigger>
          <TabsTrigger value="breaks">Break Management</TabsTrigger>
        </TabsList>

        {/* Business Hours Tab */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>Set your regular operating hours for each day of the week</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayHours = businessHours[day.key]
                const isOpen = !!dayHours?.isOpen
                const conflicts = getUpcomingConflicts(day.key)

                return (
                  <div key={day.key} className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
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
                        <div>
                          <Label className="font-medium">{day.label}</Label>
                          {conflicts.length > 0 && (
                            <p className="text-xs text-amber-600">
                              {conflicts.length} upcoming appointment{conflicts.length > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={dayHours?.openTime || "09:00"}
                            onChange={(e) =>
                              handleBusinessHoursUpdate(day.key, true, e.target.value, dayHours?.closeTime || "17:00")
                            }
                            className="w-24"
                            disabled={isUpdating}
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={dayHours?.closeTime || "17:00"}
                            onChange={(e) =>
                              handleBusinessHoursUpdate(day.key, true, dayHours?.openTime || "09:00", e.target.value)
                            }
                            className="w-24"
                            disabled={isUpdating}
                          />
                        </div>
                      ) : (
                        <Badge variant="secondary">Closed</Badge>
                      )}
                    </div>

                    {/* Show breaks for this day */}
                    {dayHours?.breaks && dayHours.breaks.length > 0 && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-sm text-muted-foreground">Breaks:</Label>
                        {dayHours.breaks.map((breakTime, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">
                              {breakTime.startTime} - {breakTime.endTime}
                              {breakTime.reason && ` (${breakTime.reason})`}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveBreak(day.key, index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked Times Tab */}
        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Block Time Slots
              </CardTitle>
              <CardDescription>
                Block specific time slots for maintenance, personal time, or special events
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="block-date">Date *</Label>
                    <Input
                      id="block-date"
                      type="date"
                      value={blockForm.date}
                      onChange={(e) => setBlockForm((prev) => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="block-start">Start Time *</Label>
                      <Input
                        id="block-start"
                        type="time"
                        value={blockForm.startTime}
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-end">End Time *</Label>
                      <Input
                        id="block-end"
                        type="time"
                        value={blockForm.endTime}
                        onChange={(e) => setBlockForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="block-reason">Reason</Label>
                    <Input
                      id="block-reason"
                      placeholder="e.g., Equipment maintenance, Personal appointment"
                      value={blockForm.reason}
                      onChange={(e) => setBlockForm((prev) => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring"
                      checked={blockForm.isRecurring}
                      onCheckedChange={(checked) => setBlockForm((prev) => ({ ...prev, isRecurring: checked }))}
                    />
                    <Label htmlFor="recurring">Recurring block</Label>
                  </div>

                  {blockForm.isRecurring && (
                    <div className="space-y-2">
                      <Label>Repeat Pattern</Label>
                      <Select
                        value={blockForm.recurringPattern}
                        onValueChange={(value) =>
                          setBlockForm((prev) => ({
                            ...prev,
                            recurringPattern: value as "daily" | "weekly" | "monthly",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={handleBlockTimeSlot} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Block Time Slot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Blocked Slots */}
          {blockedSlots && blockedSlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Current Blocked Slots
                </CardTitle>
                <CardDescription>Time slots that are currently unavailable for booking</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {blockedSlots
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((slot) => (
                      <div key={slot._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {new Date(slot.date).toLocaleDateString()} • {slot.startTime} - {slot.endTime}
                          </div>
                          {slot.reason && <div className="text-sm text-muted-foreground">{slot.reason}</div>}
                          {slot.isRecurring && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Recurring {slot.recurringPattern}
                            </Badge>
                          )}
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
        </TabsContent>

        {/* Break Management Tab */}
        <TabsContent value="breaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manage Breaks
              </CardTitle>
              <CardDescription>Add regular break times to your daily schedule</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={breakForm.day}
                    onValueChange={(value) => setBreakForm((prev) => ({ ...prev, day: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.key} value={day.key}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={breakForm.startTime}
                    onChange={(e) => setBreakForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={breakForm.endTime}
                    onChange={(e) => setBreakForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="e.g., Lunch"
                    value={breakForm.reason}
                    onChange={(e) => setBreakForm((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={handleAddBreak} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Break Time
              </Button>

              {hasUnsavedChanges && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have unsaved changes to your break times. Don't forget to save your business hours.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
