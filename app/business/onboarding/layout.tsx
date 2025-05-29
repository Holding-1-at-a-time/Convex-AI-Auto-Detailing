"use client"

import type React from "react"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
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

  // Redirect to dashboard if onboarding is completed
  if (businessProfile && businessProfile.onboardingCompleted) {
    redirect("/business/dashboard")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Business Onboarding</h1>
          <p className="mt-2 text-gray-600">Complete your business profile to get started</p>
        </div>
        {children}
      </div>
    </div>
  )
}
