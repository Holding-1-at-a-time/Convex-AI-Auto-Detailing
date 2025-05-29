"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, Car, X, Edit } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

export function CustomerAppointmentsDashboard() {
  const { user } = useUser()
  const { toast } = useToast()

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const upcomingAppointments = useQuery(
    api.appointments.getCustomerAppointments,
    userDetails?.clerkId ? { customerId: userDetails.clerkId, status: "scheduled" } : "skip",
  )
  const pastAppointments = useQuery(
    api.appointments.getCustomerAppointments,
    userDetails?.clerkId ? { customerId: userDetails.clerkId, status: "completed", limit: 10 } : "skip",
  )

  const cancelAppointment = useMutation(api.appointments.cancelAppointment)

  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancelAppointment = async (appointmentId: string) => {
    setCancellingId(appointmentId)

    try {
      await cancelAppointment({
        appointmentId,
        reason: "Cancelled by customer",
      })

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      })
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
    }
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

  if (upcomingAppointments === undefined || pastAppointments === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Appointments</h2>
        <p className="text-muted-foreground">Manage your upcoming and past appointments</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">History ({pastAppointments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {!upcomingAppointments || upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Appointments</h3>
                <p className="text-muted-foreground">
                  You don't have any scheduled appointments. Book a service to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingAppointments.map((appointment) => (
                <Card key={appointment._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{appointment.serviceType}</CardTitle>
                        <CardDescription className="flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(appointment.date)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                            </span>
                          </span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {appointment.vehicleInfo && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span>
                            {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                            {appointment.vehicleInfo.model}
                          </span>
                        </div>
                      )}

                      {appointment.price && (
                        <div className="text-lg font-semibold">${appointment.price.toFixed(2)}</div>
                      )}

                      {appointment.notes && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Notes:</strong> {appointment.notes}
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment._id)}
                          disabled={cancellingId === appointment._id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {cancellingId === appointment._id ? "Cancelling..." : "Cancel"}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {!pastAppointments || pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Past Appointments</h3>
                <p className="text-muted-foreground">Your completed appointments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastAppointments.map((appointment) => (
                <Card key={appointment._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{appointment.serviceType}</CardTitle>
                        <CardDescription className="flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(appointment.date)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                            </span>
                          </span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {appointment.vehicleInfo && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span>
                            {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                            {appointment.vehicleInfo.model}
                          </span>
                        </div>
                      )}

                      {appointment.price && (
                        <div className="text-lg font-semibold">${appointment.price.toFixed(2)}</div>
                      )}

                      <Button variant="outline" size="sm">
                        Book Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
