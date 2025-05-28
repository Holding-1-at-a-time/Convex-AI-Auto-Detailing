"use client"

import type React from "react"

import { useUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSignedIn) {
    redirect("/sign-in")
    return null
  }

  return <>{children}</>
}
