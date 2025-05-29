"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Calendar, Clock, Car, DollarSign, User, MessageSquare, Edit, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AppointmentWithDetails } from "@/types/appointment"

export default function UpcomingAppointments() {
  const { user } = useUser()
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)

  // Convex queries
  const appointments = useQuery(
    api.appointments.getCustomerAppointments,
    user?.id ? { customerId: user.id, limit: 10 } : "skip",
  )

  // Mutations
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)
  const updateAppointment = useMutation(api.appointments.updateAppointment)

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      await cancelAppointment({
        appointmentId: appointmentId as any,
        reason,
      })

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      })
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Unable to cancel appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Filter appointments by status
  const upcomingAppointments = appointments?.filter((apt) => ["scheduled", "confirmed"].includes(apt.status)) || []

  const pastAppointments = appointments?.filter((apt) => ["completed", "cancelled"].includes(apt.status)) || []

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: { variant: "secondary" as const, label: "Scheduled" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      "in-progress": { variant: "default" as const, label: "In Progress" },
      completed: { variant: "default" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    }

    const config = variants[status as keyof typeof variants] || variants.scheduled
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (!appointments) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <LoadingSpinner className="h-6 w-6" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>Your scheduled detailing appointments</CardDescription>
        </CardHeader>

        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                You don't have any upcoming appointments. Book your next detailing service!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment._id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{appointment.serviceName}</h3>
                        {getStatusBadge(appointment.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(appointment.date).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {appointment.startTime} - {appointment.endTime}
                        </div>

                        {appointment.vehicleInfo && (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                            {appointment.vehicleInfo.model}
                          </div>
                        )}

                        {appointment.price && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />${appointment.price}
                          </div>
                        )}

                        {appointment.staffName && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {appointment.staffName}
                          </div>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 mt-0.5" />
                          <span>{appointment.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment History */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment History</CardTitle>
            <CardDescription>Your past detailing appointments</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {pastAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{appointment.serviceName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(appointment.date).toLocaleDateString()} • {appointment.startTime}
                      {appointment.vehicleInfo && (
                        <span className="ml-2">
                          • {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                          {appointment.vehicleInfo.model}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appointment.price && <span className="text-sm font-medium">${appointment.price}</span>}
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
