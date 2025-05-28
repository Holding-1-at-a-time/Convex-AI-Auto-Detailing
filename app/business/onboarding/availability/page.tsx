"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Helper function to generate time slots
const generateTimeSlots = (startHour = 8, endHour = 18, interval = 30) => {
  const slots = []
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      if (hour === endHour && minute > 0) continue
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      slots.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

const daysOfWeek = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
]

export default function AvailabilityPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const updateBusinessProfile = useMutation(api.businessProfiles.updateBusinessProfile)
  const completeOnboarding = useMutation(api.businessProfiles.completeOnboarding)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("weekly")

  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState({
    monday: { isOpen: true, open: "09:00", close: "17:00" },
    tuesday: { isOpen: true, open: "09:00", close: "17:00" },
    wednesday: { isOpen: true, open: "09:00", close: "17:00" },
    thursday: { isOpen: true, open: "09:00", close: "17:00" },
    friday: { isOpen: true, open: "09:00", close: "17:00" },
    saturday: { isOpen: true, open: "10:00", close: "15:00" },
    sunday: { isOpen: false, open: "10:00", close: "15:00" },
  })

  // Initialize weekly schedule from business profile
  const [initialWeeklySchedule, setInitialWeeklySchedule] = useState(null)

  useEffect(() => {
    if (businessProfile && businessProfile.businessHours) {
      const formattedSchedule = {}

      Object.entries(businessProfile.businessHours).forEach(([day, hours]) => {
        if (hours === null) {
          formattedSchedule[day] = { isOpen: false, open: "09:00", close: "17:00" }
        } else {
          formattedSchedule[day] = {
            isOpen: true,
            open: hours.open || "09:00",
            close: hours.close || "17:00",
          }
        }
      })

      setInitialWeeklySchedule(formattedSchedule)
      setWeeklySchedule(formattedSchedule)
    }
  }, [businessProfile])

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

  // Redirect if services not set up
  if (!businessProfile.servicesOffered || businessProfile.servicesOffered.length === 0) {
    redirect("/business/onboarding/services")
    return null
  }

  const handleDayToggle = (day, isOpen) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen,
      },
    }))
  }

  const handleTimeChange = (day, type, time) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: time,
      },
    }))
  }

  const handleSaveAndComplete = async () => {
    setIsSubmitting(true)

    try {
      // Format business hours for storage
      const formattedHours = {}

      Object.entries(weeklySchedule).forEach(([day, schedule]) => {
        if (!schedule.isOpen) {
          formattedHours[day] = null
        } else {
          formattedHours[day] = {
            open: schedule.open,
            close: schedule.close,
          }
        }
      })

      // Update business profile with hours
      await updateBusinessProfile({
        profileId: businessProfile._id,
        businessHours: formattedHours,
      })

      // Mark onboarding as completed
      await completeOnboarding({
        profileId: businessProfile._id,
      })

      toast({
        title: "Onboarding Completed",
        description: "Your business profile has been set up successfully.",
      })

      // Navigate to the dashboard
      router.push("/business/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving your availability.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Availability Scheduling</CardTitle>
          <CardDescription>Set your business hours and availability for appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
              <TabsTrigger value="special" disabled>
                Special Days (Coming Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly">
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="bg-muted p-4 text-sm font-medium">Set your regular business hours</div>
                  <div className="p-4">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day.id}
                        className="mb-4 grid grid-cols-12 items-center gap-4 border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="col-span-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${day.id}-toggle`}
                              checked={weeklySchedule[day.id]?.isOpen}
                              onCheckedChange={(checked) => handleDayToggle(day.id, checked)}
                            />
                            <Label htmlFor={`${day.id}-toggle`}>{day.label}</Label>
                          </div>
                        </div>

                        {weeklySchedule[day.id]?.isOpen ? (
                          <>
                            <div className="col-span-4">
                              <Label htmlFor={`${day.id}-open`} className="mb-1 block text-xs">
                                Open Time
                              </Label>
                              <Select
                                value={weeklySchedule[day.id]?.open}
                                onValueChange={(value) => handleTimeChange(day.id, "open", value)}
                                disabled={!weeklySchedule[day.id]?.isOpen}
                              >
                                <SelectTrigger id={`${day.id}-open`}>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.map((time) => (
                                    <SelectItem key={`${day.id}-open-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-4">
                              <Label htmlFor={`${day.id}-close`} className="mb-1 block text-xs">
                                Close Time
                              </Label>
                              <Select
                                value={weeklySchedule[day.id]?.close}
                                onValueChange={(value) => handleTimeChange(day.id, "close", value)}
                                disabled={!weeklySchedule[day.id]?.isOpen}
                              >
                                <SelectTrigger id={`${day.id}-close`}>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.map((time) => (
                                    <SelectItem key={`${day.id}-close-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-8 text-muted-foreground">Closed</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border bg-muted/50 p-4">
                  <div className="flex items-start">
                    <Calendar className="mr-2 mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">Special Days & Exceptions</h4>
                      <p className="text-sm text-muted-foreground">
                        After completing onboarding, you can set special hours for holidays, events, or time off in the
                        dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.push("/business/onboarding/services")}>
            Back
          </Button>
          <Button onClick={handleSaveAndComplete} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Complete Onboarding"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
