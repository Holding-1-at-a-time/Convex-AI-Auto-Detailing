"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { CustomerAppointmentsDashboard } from "@/components/customer/appointments-dashboard"

export default function CustomerAppointmentsPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

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

  // Redirect if not a customer
  if (userDetails?.role !== "customer") {
    redirect("/role-selection")
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <CustomerAppointmentsDashboard />
    </div>
  )
}
