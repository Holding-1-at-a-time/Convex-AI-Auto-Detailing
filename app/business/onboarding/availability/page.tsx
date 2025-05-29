"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Clock } from "lucide-react"

export default function BusinessAvailabilityPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const updateBusinessProfile = useMutation(api.businessProfiles.updateBusinessProfile)

  // Default business hours
  const [businessHours, setBusinessHours] = useState({
    monday: { isOpen: true, open: "09:00", close: "17:00" },
    tuesday: { isOpen: true, open: "09:00", close: "17:00" },
    wednesday: { isOpen: true, open: "09:00", close: "17:00" },
    thursday: { isOpen: true, open: "09:00", close: "17:00" },
    friday: { isOpen: true, open: "09:00", close: "17:00" },
    saturday: { isOpen: true, open: "10:00", close: "15:00" },
    sunday: { isOpen: false, open: "10:00", close: "15:00" },
  })

  // Loading state
  if (!isUserLoaded || userDetails === undefined || businessProfile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Redirect if not logged in
  if (!user) {
    redirect("/sign-in")
    return null
  }

  // Redirect if not a business
  if (userDetails?.role !== "business") {
    redirect("/role-selection")
    return null
  }

  // Redirect if profile not created
  if (!businessProfile) {
    redirect("/business/onboarding/profile")
    return null
  }

  // Redirect if services not added
  if (!businessProfile.servicesOffered || businessProfile.servicesOffered.length === 0) {
    redirect("/business/onboarding/services")
    return null
  }

  // Handle day toggle
  const handleDayToggle = (day) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        isOpen: !businessHours[day].isOpen,
      },
    })
  }

  // Handle time change
  const handleTimeChange = (day, type, value) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [type]: value,
      },
    })
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Format business hours for storage
      const formattedHours = {}
      Object.keys(businessHours).forEach((day) => {
        if (businessHours[day].isOpen) {
          formattedHours[day] = {
            open: businessHours[day].open,
            close: businessHours[day].close,
          }
        } else {
          formattedHours[day] = null
        }
      })

      // Update business profile
      await updateBusinessProfile({
        profileId: businessProfile._id,
        businessHours: formattedHours,
        onboardingCompleted: true,
      })

      // Update Clerk metadata
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboardingComplete: true,
        },
      })

      // Redirect to dashboard
      router.push("/business/dashboard")
    } catch (error) {
      console.error("Error saving availability:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate time options
  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeOptions.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Set Your Business Hours</CardTitle>
          <CardDescription>Define when your business is available for appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {Object.keys(businessHours).map((day) => (
                <div key={day} className="flex items-center space-x-4 rounded-lg border p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${day}-toggle`}
                      checked={businessHours[day].isOpen}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label htmlFor={`${day}-toggle`} className="capitalize font-medium min-w-[100px]">
                      {day}
                    </Label>
                  </div>

                  {businessHours[day].isOpen ? (
                    <div className="flex flex-1 items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={businessHours[day].open}
                        onValueChange={(value) => handleTimeChange(day, "open", value)}
                        disabled={!businessHours[day].isOpen}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Opening time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`${day}-open-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-muted-foreground">to</span>

                      <Select
                        value={businessHours[day].close}
                        onValueChange={(value) => handleTimeChange(day, "close", value)}
                        disabled={!businessHours[day].isOpen}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Closing time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`${day}-close-${time}`} value={time}>
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
              ))}
            </div>

            <div className="mt-6">
              <Separator className="my-4" />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Complete Onboarding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
