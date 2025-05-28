"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function RoleSelectionPage() {
  const router = useRouter()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser)

  // Check if user already has a role
  const existingUser = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id || "",
  })

  // If user already has a role, redirect them
  if (existingUser?.role) {
    if (existingUser.role === "customer") {
      router.push("/customer/dashboard")
    } else if (existingUser.role === "business") {
      router.push("/business/dashboard")
    }
    return <LoadingSpinner />
  }

  const handleRoleSelection = async (role: "customer" | "business") => {
    if (!user) return

    setIsLoading(true)
    try {
      await createOrUpdateUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role,
      })

      // Redirect based on role
      if (role === "customer") {
        router.push("/customer/dashboard")
      } else {
        router.push("/business/dashboard")
      }
    } catch (error) {
      console.error("Error updating user role:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl w-full px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to AI Auto Detailing</h1>
          <p className="text-xl text-gray-600">Please select how you'd like to use our platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleRoleSelection("customer")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">I'm a Customer</CardTitle>
              <CardDescription className="text-base">Book detailing services for your vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Book appointments online</li>
                <li>• Track service history</li>
                <li>• Get personalized recommendations</li>
                <li>• Manage multiple vehicles</li>
              </ul>
              <Button
                className="w-full mt-6"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelection("customer")
                }}
              >
                Continue as Customer
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleRoleSelection("business")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">I'm a Business Owner</CardTitle>
              <CardDescription className="text-base">Manage your auto detailing business</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Manage appointments & staff</li>
                <li>• Track inventory & supplies</li>
                <li>• View analytics & reports</li>
                <li>• Handle customer relationships</li>
              </ul>
              <Button
                className="w-full mt-6"
                variant="default"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelection("business")
                }}
              >
                Continue as Business
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
