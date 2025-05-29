"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function CustomerServicesPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedServices, setSelectedServices] = useState([])

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const customerProfile = useQuery(
    api.customerProfiles.getCustomerProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )
  const completeOnboarding = useMutation(api.customerProfiles.completeOnboarding)

  // Get all available services
  const services = useQuery(api.services.listAllServices) || []

  // Loading state
  if (!isUserLoaded || userDetails === undefined || customerProfile === undefined) {
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

  // Redirect if profile not created
  if (!customerProfile) {
    redirect("/customer/onboarding/profile")
    return null
  }

  // Redirect if vehicles not added
  if (!customerProfile.vehicles || customerProfile.vehicles.length === 0) {
    redirect("/customer/onboarding/vehicles")
    return null
  }

  // Handle service selection
  const handleServiceToggle = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId))
    } else {
      setSelectedServices([...selectedServices, serviceId])
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Complete onboarding
      await completeOnboarding({
        userId: userDetails.clerkId,
      })

      // Update Clerk metadata
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboardingComplete: true,
          preferredServices: selectedServices,
        },
      })

      // Redirect to dashboard
      router.push("/customer/dashboard")
    } catch (error) {
      console.error("Error completing onboarding:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Your Preferred Services</CardTitle>
          <CardDescription>Choose the detailing services you're interested in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <div key={service._id} className="flex items-start space-x-3 rounded-lg border p-4">
                  <Checkbox
                    id={service._id}
                    checked={selectedServices.includes(service._id)}
                    onCheckedChange={() => handleServiceToggle(service._id)}
                  />
                  <div>
                    <Label htmlFor={service._id} className="font-medium">
                      {service.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <p className="mt-1 text-sm font-medium">${service.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Complete Onboarding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
