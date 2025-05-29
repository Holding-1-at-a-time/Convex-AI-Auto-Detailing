"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, MessageSquare, Bell, Moon } from "lucide-react"
import { toast } from "sonner"
import type { NotificationPreferences } from "@/types/notification"

export function NotificationPreferencesForm() {
  const { user } = useUser()
  const updatePreferences = useMutation(api.notifications.updateNotificationPreferences)

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const customerProfile = useQuery(
    api.customerProfiles.getCustomerProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    push: false,
    reminderTiming: {
      days: [1], // 1 day before
      hours: [24], // 24 hours before
    },
    quietHours: {
      start: "22:00",
      end: "08:00",
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (customerProfile?.notificationPreferences) {
      setPreferences(customerProfile.notificationPreferences)
    }
  }, [customerProfile])

  const handleSave = async () => {
    if (!userDetails?._id) return

    setIsLoading(true)
    try {
      await updatePreferences({
        userId: userDetails._id,
        preferences,
      })
      toast.success("Notification preferences updated successfully!")
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast.error("Failed to update preferences. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReminderDayChange = (day: number, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      reminderTiming: {
        ...prev.reminderTiming,
        days: checked
          ? [...prev.reminderTiming.days, day].sort((a, b) => b - a)
          : prev.reminderTiming.days.filter((d) => d !== day),
      },
    }))
  }

  const handleReminderHourChange = (hour: number, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      reminderTiming: {
        ...prev.reminderTiming,
        hours: checked
          ? [...prev.reminderTiming.hours, hour].sort((a, b) => b - a)
          : prev.reminderTiming.hours.filter((h) => h !== hour),
      },
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how and when you'd like to receive notifications about your appointments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Communication Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Communication Methods</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive detailed appointment information via email</p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email}
                onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, email: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get quick reminders and updates via text message</p>
                </div>
              </div>
              <Switch
                id="sms-notifications"
                checked={preferences.sms}
                onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, sms: checked }))}
                disabled={!customerProfile?.phone}
              />
            </div>

            {!customerProfile?.phone && preferences.sms && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                Please add a phone number to your profile to enable SMS notifications.
              </div>
            )}
          </div>

          <Separator />

          {/* Reminder Timing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Reminder Timing</h3>

            <div className="space-y-3">
              <Label>Send reminders this many days before appointment:</Label>
              <div className="flex flex-wrap gap-2">
                {[7, 3, 1].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={preferences.reminderTiming.days.includes(day)}
                      onCheckedChange={(checked) => handleReminderDayChange(day, checked as boolean)}
                    />
                    <Label htmlFor={`day-${day}`} className="text-sm">
                      {day} day{day > 1 ? "s" : ""}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Send reminders this many hours before appointment:</Label>
              <div className="flex flex-wrap gap-2">
                {[48, 24, 12, 2].map((hour) => (
                  <div key={hour} className="flex items-center space-x-2">
                    <Checkbox
                      id={`hour-${hour}`}
                      checked={preferences.reminderTiming.hours.includes(hour)}
                      onCheckedChange={(checked) => handleReminderHourChange(hour, checked as boolean)}
                    />
                    <Label htmlFor={`hour-${hour}`} className="text-sm">
                      {hour} hour{hour > 1 ? "s" : ""}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <strong>Current reminder schedule:</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {preferences.reminderTiming.days.map((day) => (
                  <Badge key={`day-${day}`} variant="secondary" className="text-xs">
                    {day} day{day > 1 ? "s" : ""} before
                  </Badge>
                ))}
                {preferences.reminderTiming.hours.map((hour) => (
                  <Badge key={`hour-${hour}`} variant="secondary" className="text-xs">
                    {hour} hour{hour > 1 ? "s" : ""} before
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <h3 className="text-lg font-medium">Quiet Hours</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Set hours when you don't want to receive notifications. Messages will be delayed until after quiet hours.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, start: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, end: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              <Clock className="h-4 w-4 inline mr-1" />
              Quiet hours: {preferences.quietHours.start} - {preferences.quietHours.end}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
