"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, DollarSign, AlertTriangle, CheckCircle } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { RescheduleModal } from "@/app/admin/bookings/reschedule-modal"
import { CancelModal } from "@/app/admin/bookings/cancel-modal"

export function CustomerBookingManagement() {
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  // Get customer's appointments
  const appointments = useQuery(api.appointments.getCustomerAppointments, user ? { customerId: user.id } : "skip")

  // Get cancellation policy for selected booking
  const cancellationPolicy = useQuery(
    api.appointmentCancellation.getCancellationPolicy,
    selectedBooking ? { appointmentId: selectedBooking as any } : "skip",
  )

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
      "in-progress": "outline",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "cancelled":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "scheduled":
        return <Calendar className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const handleReschedule = (appointmentId: string) => {
    setSelectedBooking(appointmentId)
    setShowReschedule(true)
  }

  const handleCancel = (appointmentId: string) => {
    setSelectedBooking(appointmentId)
    setShowCancel(true)
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Please sign in to view your bookings</p>
        </CardContent>
      </Card>
    )
  }

  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled") || []
  const pastAppointments = appointments?.filter((a) => a.status === "completed") || []
  const cancelledAppointments = appointments?.filter((a) => a.status === "cancelled") || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <p className="text-muted-foreground">Manage your auto detailing appointments</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastAppointments.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledAppointments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <Card key={appointment._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(appointment.status)}
                      {appointment.serviceType}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                    </div>
                  </div>
                  <CardDescription>
                    {appointment.date} at {appointment.startTime} - {appointment.endTime}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {appointment.price && (
                        <p className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3 h-3" />${appointment.price}
                        </p>
                      )}
                      {appointment.notes && <p className="text-sm text-muted-foreground">{appointment.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReschedule(appointment._id)}>
                        Reschedule
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(appointment._id)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No completed appointments</p>
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map((appointment) => (
              <Card key={appointment._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(appointment.status)}
                      {appointment.serviceType}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                    </div>
                  </div>
                  <CardDescription>
                    {appointment.date} at {appointment.startTime} - {appointment.endTime}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {appointment.price && (
                        <p className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3 h-3" />${appointment.price}
                        </p>
                      )}
                      {appointment.notes && <p className="text-sm text-muted-foreground">{appointment.notes}</p>}
                    </div>
                    <Button variant="outline" size="sm">
                      Leave Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No cancelled appointments</p>
              </CardContent>
            </Card>
          ) : (
            cancelledAppointments.map((appointment) => (
              <Card key={appointment._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(appointment.status)}
                      {appointment.serviceType}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                    </div>
                  </div>
                  <CardDescription>
                    {appointment.date} at {appointment.startTime} - {appointment.endTime}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {appointment.cancellationReason && (
                      <p className="text-sm">
                        <strong>Reason:</strong> {appointment.cancellationReason}
                      </p>
                    )}
                    {appointment.cancelledAt && (
                      <p className="text-sm text-muted-foreground">
                        Cancelled on {new Date(appointment.cancelledAt).toLocaleDateString()}
                      </p>
                    )}
                    {appointment.refundPercentage !== undefined && (
                      <p className="text-sm">
                        <strong>Refund:</strong> {appointment.refundPercentage}%
                        {appointment.price && (
                          <span className="ml-1">
                            (${((appointment.price * appointment.refundPercentage) / 100).toFixed(2)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showReschedule && selectedBooking && (
        <RescheduleModal
          appointmentId={selectedBooking}
          open={showReschedule}
          onClose={() => {
            setShowReschedule(false)
            setSelectedBooking(null)
          }}
          onSuccess={() => {
            setShowReschedule(false)
            setSelectedBooking(null)
            toast({
              title: "Success",
              description: "Your appointment has been rescheduled",
            })
          }}
        />
      )}

      {showCancel && selectedBooking && cancellationPolicy && (
        <CancelModal
          appointmentId={selectedBooking}
          open={showCancel}
          onClose={() => {
            setShowCancel(false)
            setSelectedBooking(null)
          }}
          cancellationPolicy={cancellationPolicy}
          onSuccess={() => {
            setShowCancel(false)
            setSelectedBooking(null)
            toast({
              title: "Success",
              description: "Your appointment has been cancelled",
            })
          }}
        />
      )}
    </div>
  )
}
