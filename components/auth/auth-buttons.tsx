"use client"

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"

export function AuthButtons() {
  const { user, isLoaded } = useUser()
  const userRole = useQuery(api.users.getCurrentUserRole, user?.id ? { clerkId: user.id } : "skip")

  // Determine dashboard URL based on user role
  const getDashboardUrl = () => {
    if (userRole === "customer") return "/customer/dashboard"
    if (userRole === "business") return "/business/dashboard"
    return "/role-selection" // If role not set yet
  }

  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="outline">Sign In</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button>Get Started</Button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        {!isLoaded || userRole === undefined ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Link href={getDashboardUrl()}>
              <Button variant="outline">Dashboard</Button>
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-10 h-10",
                },
              }}
            />
          </>
        )}
      </SignedIn>
    </div>
  )
}
