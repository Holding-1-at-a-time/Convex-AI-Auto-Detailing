"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { StaffAvailability } from "@/components/business/staff-availability"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface StaffSchedulePageProps {
  params: {
    id: string
  }
}

export default function StaffSchedulePage({ params }: StaffSchedulePageProps) {
  const { id: staffId } = params
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const staffMember = useQuery(api.staff.getStaffMember, { staffId })

  // Loading state
  if (!isUserLoaded || userDetails === undefined || staffMember === undefined) {
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

  if (!staffMember) {
    redirect("/business/staff")
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/business/staff">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{staffMember.name}'s Schedule</h1>
        <p className="text-muted-foreground">Manage availability and appointments</p>
      </div>

      <StaffAvailability staffId={staffMember.userId} staffName={staffMember.name} />
    </div>
  )
}
