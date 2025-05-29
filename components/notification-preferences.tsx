"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface NotificationPreferences {
  email: boolean
  sms: boolean
  emailAddress: string
  phoneNumber: string
}

export function NotificationPreferences() {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: user?.publicMetadata?.notificationPreferences?.email ?? true,
    sms: user?.publicMetadata?.notificationPreferences?.sms ?? false,
    emailAddress: user?.primaryEmailAddress?.emailAddress ?? "",
    phoneNumber: user?.primaryPhoneNumber?.phoneNumber ?? "",
  })

  const updatePreferences = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          notificationPreferences: {
            email: preferences.email,
            sms: preferences.sms,
            emailAddress: preferences.emailAddress,
            phoneNumber: preferences.phoneNumber,
          },
        },
      })

      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to update notification preferences:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update your notification preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you'd like to receive appointment updates and reminders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive appointment confirmations and reminders via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email}
              onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, email: checked }))}
            />
          </div>

          {preferences.email && (
            <div className="space-y-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                value={preferences.emailAddress}
                onChange={(e) => setPreferences((prev) => ({ ...prev, emailAddress: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive text message alerts for appointments</p>
            </div>
            <Switch
              id="sms-notifications"
              checked={preferences.sms}
              onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, sms: checked }))}
            />
          </div>

          {preferences.sms && (
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={preferences.phoneNumber}
                onChange={(e) => setPreferences((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          )}
        </div>

        <Button onClick={updatePreferences} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
