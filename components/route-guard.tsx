"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireOnboarding?: boolean
}

export function RouteGuard({ children, requireAuth = true, requireOnboarding = true }: RouteGuardProps) {
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()

  const userData = useQuery(api.users.getCurrentUser, user?.id ? { userId: user.id } : "skip")

  useEffect(() => {
    if (!isLoaded) return

    // If authentication is required and user is not signed in
    if (requireAuth && !isSignedIn) {
      router.push("/sign-in")
      return
    }

    // If user is signed in but we're still loading their data
    if (isSignedIn && userData === undefined) {
      return
    }

    // If user is signed in but doesn't have a role yet
    if (isSignedIn && userData && !userData.role && requireOnboarding) {
      router.push("/onboarding/role-selection")
      return
    }

    // If user needs to complete onboarding
    if (isSignedIn && userData && userData.role && requireOnboarding && !userData.onboardingCompleted) {
      if (userData.role === "customer") {
        router.push("/onboarding/customer")
      } else if (userData.role === "business") {
        router.push("/onboarding/business")
      }
      return
    }
  }, [isLoaded, isSignedIn, userData, router, requireAuth, requireOnboarding])

  // Show loading state while checking authentication
  if (!isLoaded || (isSignedIn && userData === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // If authentication checks pass, render children
  return <>{children}</>
}
