"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BusinessAppointmentsOverview } from "@/components/business/appointments-overview"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, Users } from "lucide-react"

export default function BusinessSchedulePage() {
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

  if (businessProfile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!businessProfile) {
    redirect("/business/onboarding")
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-muted-foreground">Manage appointments and staff scheduling</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button asChild variant="outline">
            <Link href="/business/staff">
              <Users className="mr-2 h-4 w-4" />
              Staff Management
            </Link>
          </Button>
          <Button asChild>
            <Link href="/business/appointments/new">
              <Calendar className="mr-2 h-4 w-4" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      <BusinessAppointmentsOverview businessId={businessProfile._id} />
    </div>
  )
}
