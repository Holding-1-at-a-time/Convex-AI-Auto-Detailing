"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Package, Calendar, Clock, MapPin } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

export function BundleBookingsList() {
  const { user } = useUser()

  // Fetch user's appointments that have bundleIds
  const appointments = useQuery(
    api.appointments.getCustomerAppointments,
    user ? { customerId: user.id, limit: 20 } : "skip",
  )

  if (!appointments) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter for bundle bookings
  const bundleBookings = appointments.filter((apt) => apt.bundleId)

  if (bundleBookings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Bundle Bookings</h3>
            <p className="text-sm text-muted-foreground mb-4">You haven't booked any service bundles yet.</p>
            <Button asChild>
              <Link href="/services">Browse Bundles</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Bundle Bookings</h2>
        <Badge variant="secondary">{bundleBookings.length} Bundles</Badge>
      </div>

      <div className="grid gap-4">
        {bundleBookings.map((booking) => (
          <Card key={booking._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {booking.serviceType}
                  </CardTitle>
                  <CardDescription>Booking ID: {booking._id.slice(-8)}</CardDescription>
                </div>
                <Badge
                  variant={
                    booking.status === "completed"
                      ? "default"
                      : booking.status === "cancelled"
                        ? "destructive"
                        : booking.status === "in-progress"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(booking.date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>
                {booking.vehicleInfo && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {booking.vehicleInfo.year} {booking.vehicleInfo.make} {booking.vehicleInfo.model}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Total Price:</span>
                  <span className="text-lg">${booking.price?.toFixed(2)}</span>
                </div>
              </div>

              {booking.status === "scheduled" && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Cancel Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
