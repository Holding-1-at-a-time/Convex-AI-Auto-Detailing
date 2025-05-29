"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BookingForm } from "@/components/booking/booking-form"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"

export default function BookAppointmentPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("")

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businesses = useQuery(api.businessProfiles.getAllBusinessProfiles)

  // Loading state
  if (!isUserLoaded || userDetails === undefined || businesses === undefined) {
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Book an Appointment</h1>
        <p className="text-muted-foreground">
          Select a business and service to schedule your auto detailing appointment
        </p>
      </div>

      {/* Business Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Business</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="business">Choose a detailing business</Label>
            <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a business" />
              </SelectTrigger>
              <SelectContent>
                {businesses?.map((business) => (
                  <SelectItem key={business._id} value={business._id}>
                    <div>
                      <div className="font-medium">{business.name}</div>
                      {business.address && (
                        <div className="text-sm text-muted-foreground">
                          {business.address}, {business.city}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      {selectedBusinessId && (
        <BookingForm
          businessId={selectedBusinessId}
          onBookingComplete={() => {
            // Redirect to appointments page after successful booking
            window.location.href = "/customer/dashboard?tab=appointments"
          }}
        />
      )}
    </div>
  )
}
