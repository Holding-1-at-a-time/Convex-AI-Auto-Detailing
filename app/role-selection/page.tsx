"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"
import { UserCog, Users } from "lucide-react"

export default function RoleSelectionPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const { isLoaded: isAuthLoaded } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser)

  const isLoading = !isUserLoaded || !isAuthLoaded

  const handleRoleSelect = async (role: "customer" | "business") => {
    if (!user) return

    setIsSubmitting(true)
    try {
      // Store user data in Convex
      await createOrUpdateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: role,
      })

      // Redirect based on role
      if (role === "customer") {
        router.push("/customer/dashboard")
      } else {
        router.push("/business/dashboard")
      }
    } catch (error) {
      console.error("Error setting user role:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || isSubmitting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-card/50 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to AutoDetailAI</h1>
          <p className="text-muted-foreground">Please select how you'll be using our platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleRoleSelect("customer")}
          >
            <CardHeader className="text-center">
              <Users className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="mt-4">I'm a Customer</CardTitle>
              <CardDescription>Looking for auto detailing services</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Get personalized recommendations, book appointments, and manage your vehicles
              </p>
              <Button className="w-full">Continue as Customer</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleRoleSelect("business")}
          >
            <CardHeader className="text-center">
              <UserCog className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="mt-4">I'm a Business Owner</CardTitle>
              <CardDescription>Providing auto detailing services</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Manage appointments, track inventory, and grow your detailing business
              </p>
              <Button className="w-full">Continue as Business</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
