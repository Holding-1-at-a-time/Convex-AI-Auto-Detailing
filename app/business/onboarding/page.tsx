"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Settings, Calendar, Store } from "lucide-react"

export default function OnboardingPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  // Loading state
  if (!isUserLoaded || userDetails === undefined) {
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

  // Determine the next step based on profile completion
  const getNextStep = () => {
    if (!businessProfile) {
      return "/business/onboarding/profile"
    }

    // Check if services are set up
    if (!businessProfile.servicesOffered || businessProfile.servicesOffered.length === 0) {
      return "/business/onboarding/services"
    }

    // Default to availability
    return "/business/onboarding/availability"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Auto Detailing Assistant</CardTitle>
          <CardDescription>
            Complete the following steps to set up your business profile and start accepting appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 rounded-lg border p-4">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Step 1: Business Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your business details including name, location, and contact information.
                </p>
              </div>
              <div>
                {businessProfile ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <a href="/business/onboarding/profile">Start</a>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4 rounded-lg border p-4">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Step 2: Service Management</h3>
                <p className="text-sm text-muted-foreground">
                  Add your detailing services, including descriptions, durations, and pricing.
                </p>
              </div>
              <div>
                {businessProfile && businessProfile.servicesOffered && businessProfile.servicesOffered.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Button variant="outline" size="sm" asChild disabled={!businessProfile}>
                    <a href="/business/onboarding/services">{businessProfile ? "Start" : "Complete Profile First"}</a>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4 rounded-lg border p-4">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Step 3: Availability Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Set your business hours and availability for appointments.
                </p>
              </div>
              <div>
                {businessProfile && businessProfile.onboardingCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={
                      !businessProfile ||
                      !businessProfile.servicesOffered ||
                      businessProfile.servicesOffered.length === 0
                    }
                  >
                    <a href="/business/onboarding/availability">
                      {businessProfile && businessProfile.servicesOffered && businessProfile.servicesOffered.length > 0
                        ? "Start"
                        : "Complete Services First"}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <a href={getNextStep()}>Continue Onboarding</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
