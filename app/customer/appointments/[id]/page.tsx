"use client"

import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, Car, MapPin, Phone, Mail, DollarSign, ArrowLeft } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import Link from "next/link"
import { redirect } from "next/navigation"

export default function AppointmentDetailsPage() {
  const params = useParams()
  const { user, isLoaded: isUserLoaded } = useUser()
  const { toast } = useToast()

  const appointmentId = params.id as string

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const appointment = useQuery(api.appointments.getAppointmentById, { appointmentId })
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)

  const handleCancelAppointment = async () => {
    try {
      await cancelAppointment({
        appointmentId,
        reason: "Cancelled by customer",
      })

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      })

      // Redirect back to appointments
      window.location.href = "/customer/appointments"
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Loading state
  if (!isUserLoaded || userDetails === undefined || appointment === undefined) {
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

  if (!appointment) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Appointment not found</p>
            <Button className="mt-4" asChild>
              <Link href="/customer/appointments">Back to Appointments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="default">Scheduled</Badge>
      case "completed":
        return <Badge variant="secondary">Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      case "in-progress":
        return <Badge variant="outline">In Progress</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const isPastAppointment = new Date(appointment.date) < new Date()
  const canCancel = appointment.status === "scheduled" && !isPastAppointment

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customer/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointment Details</h1>
            <p className="text-muted-foreground">View and manage your appointment</p>
          </div>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Date</span>
              </div>
              <p className="font-medium">{formatDate(appointment.date)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Time</span>
              </div>
              <p className="font-medium">
                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Service Details</h4>
              <p className="text-lg">{appointment.serviceType}</p>
              {appointment.price && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">${appointment.price.toFixed(2)}</span>
                </div>
              )}
            </div>

            {appointment.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Special Instructions</h4>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">{appointment.businessName || "Business Name"}</h4>
              <p className="text-sm text-muted-foreground">
                {appointment.businessDescription || "Auto Detailing Service"}
              </p>
            </div>

            {appointment.businessAddress && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Address</span>
                </div>
                <p className="text-sm">{appointment.businessAddress}</p>
              </div>
            )}

            {appointment.businessPhone && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Phone</span>
                </div>
                <p className="text-sm">{appointment.businessPhone}</p>
              </div>
            )}

            {appointment.businessEmail && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                <p className="text-sm">{appointment.businessEmail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        {appointment.vehicleInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                </span>
              </div>
              {appointment.vehicleInfo.color && (
                <div className="text-sm text-muted-foreground">Color: {appointment.vehicleInfo.color}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {canCancel && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage your appointment</CardDescription>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Button variant="destructive" onClick={handleCancelAppointment}>
              Cancel Appointment
            </Button>
            <Button variant="outline">Reschedule</Button>
          </CardContent>
        </Card>
      )}

      {appointment.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Service Completed</CardTitle>
            <CardDescription>We hope you enjoyed our service!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">Book Again</Button>
            <Button variant="outline" className="w-full">
              Leave Feedback
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
