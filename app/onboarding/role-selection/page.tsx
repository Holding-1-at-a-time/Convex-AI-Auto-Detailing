"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Shield, User, ArrowRight } from "lucide-react"

export default function RoleSelectionPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateUserRole = useMutation(api.users.updateUserRole)

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return

    setIsSubmitting(true)

    try {
      // Save user role to Convex
      await updateUserRole({
        userId: user.id,
        role: selectedRole,
        name: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
      })

      // Redirect based on role
      if (selectedRole === "customer") {
        router.push("/onboarding/customer")
      } else {
        router.push("/onboarding/business")
      }
    } catch (error) {
      console.error("Error updating user role:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
      <div className="w-full max-w-4xl">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome to AutoDetailAI
        </h1>
        <p className="mb-8 text-center text-muted-foreground">Please select how you'll be using our platform</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card
            className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
              selectedRole === "customer" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelectedRole("customer")}
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Customer</CardTitle>
              <CardDescription>I want to book auto detailing services</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="ml-6 list-disc text-sm text-muted-foreground">
                <li>Book appointments with detailing professionals</li>
                <li>Get personalized vehicle care recommendations</li>
                <li>Track your vehicle's maintenance history</li>
                <li>Receive reminders for upcoming services</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
              selectedRole === "business" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelectedRole("business")}
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Business Owner</CardTitle>
              <CardDescription>I provide auto detailing services</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="ml-6 list-disc text-sm text-muted-foreground">
                <li>Manage your detailing business operations</li>
                <li>Schedule and track customer appointments</li>
                <li>Access AI-powered business analytics</li>
                <li>Optimize inventory and staff management</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleRoleSelection} disabled={!selectedRole || isSubmitting} className="gap-2">
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
