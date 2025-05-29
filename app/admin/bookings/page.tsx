"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, DollarSign, Users, Mail, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { BookingDetailsModal } from "./booking-details-modal"
import { EmailLogsModal } from "./email-logs-modal"

export default function AdminBookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [showEmailLogs, setShowEmailLogs] = useState(false)

  // Get all appointments
  const allAppointments = useQuery(api.appointments.getAllAppointments, {
    limit: 100,
  })

  // Get cancelled appointments
  const cancelledAppointments = useQuery(api.appointmentCancellation.getCancelledAppointments, {
    limit: 50,
  })

  // Get email logs
  const emailLogs = useQuery(api.emailNotifications.getEmailLogs, {
    limit: 50,
  })

  // Calculate statistics
  const stats = {
    total: allAppointments?.length || 0,
    scheduled: allAppointments?.filter((a) => a.status === "scheduled").length || 0,
    completed: allAppointments?.filter((a) => a.status === "completed").length || 0,
    cancelled: allAppointments?.filter((a) => a.status === "cancelled").length || 0,
    revenue: allAppointments?.reduce((sum, a) => sum + (a.price || 0), 0) || 0,
  }

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground">Manage appointments, cancellations, and notifications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEmailLogs(true)} variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Email Logs
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Management Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>Complete list of all appointments in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAppointments?.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedBooking(appointment._id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{appointment.serviceType}</h3>
                        {getStatusBadge(appointment.status)}
                        {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {appointment.date} at {appointment.startTime} - {appointment.endTime}
                        </p>
                        <p>Customer: {appointment.customerId}</p>
                        {appointment.price && <p>Price: ${appointment.price}</p>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Appointments</CardTitle>
              <CardDescription>Upcoming appointments that are confirmed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAppointments
                  ?.filter((a) => a.status === "scheduled")
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedBooking(appointment._id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{appointment.serviceType}</h3>
                          {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            {appointment.date} at {appointment.startTime} - {appointment.endTime}
                          </p>
                          <p>Customer: {appointment.customerId}</p>
                          {appointment.price && <p>Price: ${appointment.price}</p>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Appointments</CardTitle>
              <CardDescription>Appointments that have been cancelled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cancelledAppointments?.page?.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedBooking(appointment._id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{appointment.serviceType}</h3>
                        <Badge variant="destructive">Cancelled</Badge>
                        {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {appointment.date} at {appointment.startTime} - {appointment.endTime}
                        </p>
                        <p>Customer: {appointment.customerId}</p>
                        {appointment.cancellationReason && <p>Reason: {appointment.cancellationReason}</p>}
                        {appointment.cancelledAt && (
                          <p>Cancelled: {new Date(appointment.cancelledAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Appointments</CardTitle>
              <CardDescription>Successfully completed appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAppointments
                  ?.filter((a) => a.status === "completed")
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedBooking(appointment._id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{appointment.serviceType}</h3>
                          <Badge variant="secondary">Completed</Badge>
                          {appointment.bundleId && <Badge variant="outline">Bundle</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            {appointment.date} at {appointment.startTime} - {appointment.endTime}
                          </p>
                          <p>Customer: {appointment.customerId}</p>
                          {appointment.price && <p>Price: ${appointment.price}</p>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedBooking && (
        <BookingDetailsModal
          appointmentId={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {showEmailLogs && (
        <EmailLogsModal
          open={showEmailLogs}
          onClose={() => setShowEmailLogs(false)}
          emailLogs={emailLogs?.page || []}
        />
      )}
    </div>
  )
}
