"use client"

import type React from "react"

import { useUser } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function CustomerOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const customerProfile = useQuery(
    api.customerProfiles.getCustomerProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
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
    router.push("/sign-in")
    return null
  }

  // Redirect if not a customer
  if (userDetails?.role !== "customer") {
    router.push("/role-selection")
    return null
  }

  // Define the steps
  const steps = [
    { name: "Profile", href: "/customer/onboarding/profile" },
    { name: "Vehicles", href: "/customer/onboarding/vehicles" },
    { name: "Services", href: "/customer/onboarding/services" },
    { name: "Booking", href: "/customer/onboarding/booking" },
  ]

  // Determine current step
  const currentStepIndex = steps.findIndex((step) => pathname === step.href)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card/50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to AutoDetailAI</h1>
          <p className="text-muted-foreground">Let's set up your account to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol role="list" className="flex space-x-2 md:space-x-4">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className="flex-1">
                  <div
                    className={`group flex flex-col border-l-4 py-2 pl-4 ${
                      stepIdx <= currentStepIndex ? "border-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        stepIdx <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Step {stepIdx + 1}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stepIdx <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Content */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
