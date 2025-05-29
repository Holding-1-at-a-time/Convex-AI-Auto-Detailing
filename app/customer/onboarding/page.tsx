"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function CustomerOnboardingIndex() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const customerProfile = useQuery(
    api.customerProfiles.getCustomerProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  useEffect(() => {
    if (isUserLoaded && userDetails) {
      if (customerProfile) {
        if (customerProfile.onboardingCompleted) {
          router.push("/customer/dashboard")
        } else {
          router.push("/customer/onboarding/profile")
        }
      } else {
        router.push("/customer/onboarding/profile")
      }
    }
  }, [isUserLoaded, userDetails, customerProfile, router])

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
