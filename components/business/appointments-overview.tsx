"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Clock, User, Car, CheckCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface BusinessAppointmentsOverviewProps {
  businessId: string
}

export function BusinessAppointmentsOverview({ businessId }: BusinessAppointmentsOverviewProps) {
  const { user } = useUser()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const selectedDateStr = selectedDate.toISOString().split("T")[0]

  const todayAppointments = useQuery(api.appointments.getAppointmentsByDate, {
    date: new Date().toISOString().split("T")[0],
  })

  const selectedDateAppointments = useQuery(api.appointments.getAppointmentsByDate, { date: selectedDateStr })

  const upcomingAppointments = useQuery(api.appointments.getUpcomingAppointments, { days: 7 })

  const updateAppointment = useMutation(api.appointments.updateAppointment)
  const completeAppointment = useMutation(api.appointments.completeAppointment)

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    setUpdatingId(appointmentId)

    try {
      if (status === "completed") {
        await completeAppointment({
          appointmentId,
          notes: "Service completed successfully",
        })
      } else {
        await updateAppointment({
          appointmentId,
          status,
        })
      }

      toast({
        title: "Appointment Updated",
        description: `Appointment status updated to ${status}.`,
      })
    } catch (error) {
      console.error("Error updating appointment:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
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
      case "no-show":
        return <Badge variant="destructive">No Show</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  if (todayAppointments === undefined || upcomingAppointments === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const todayCount = todayAppointments?.filter((a) => a.status !== "cancelled").length || 0
  const weekCount =
    Object.values(upcomingAppointments || {})
      .flat()
      .filter((a) => a.status !== "cancelled").length || 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">
              {todayCount === 1 ? "appointment" : "appointments"} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekCount}</div>
            <p className="text-xs text-muted-foreground">upcoming {weekCount === 1 ? "appointment" : "appointments"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${todayAppointments?.reduce((sum, apt) => sum + (apt.price || 0), 0).toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              from {todayCount} {todayCount === 1 ? "appointment" : "appointments"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>{formatDate(new Date().toISOString().split("T")[0])}</CardDescription>
            </CardHeader>
            <CardContent>
              {!todayAppointments || todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Appointments Today</h3>
                  <p className="text-muted-foreground">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((appointment) => (
                      <div key={appointment._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{appointment.customerName}</span>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {appointment.serviceType} • {formatTime(appointment.startTime)} -{" "}
                            {formatTime(appointment.endTime)}
                          </div>
                          {appointment.vehicleInfo && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Car className="h-3 w-3" />
                              <span>
                                {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                                {appointment.vehicleInfo.model}
                              </span>
                            </div>
                          )}
                          {appointment.price && (
                            <div className="text-sm font-medium">${appointment.price.toFixed(2)}</div>
                          )}
                        </div>

                        {appointment.status === "scheduled" && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(appointment._id, "in-progress")}
                              disabled={updatingId === appointment._id}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(appointment._id, "completed")}
                              disabled={updatingId === appointment._id}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </div>
                        )}

                        {appointment.status === "in-progress" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment._id, "completed")}
                            disabled={updatingId === appointment._id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {updatingId === appointment._id ? "Completing..." : "Complete"}
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointments for {formatDate(selectedDateStr)}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateAppointments === undefined ? (
                  <div className="flex items-center justify-center p-4">
                    <LoadingSpinner />
                  </div>
                ) : !selectedDateAppointments || selectedDateAppointments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No appointments on this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateAppointments
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((appointment) => (
                        <div key={appointment._id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{appointment.customerName}</div>
                              <div className="text-sm text-muted-foreground">{appointment.serviceType}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                              </div>
                            </div>
                            {getStatusBadge(appointment.status)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Next 7 Days</CardTitle>
              <CardDescription>Overview of upcoming appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {!upcomingAppointments || Object.keys(upcomingAppointments).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Appointments</h3>
                  <p className="text-muted-foreground">Your schedule is clear for the next week.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(upcomingAppointments)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, appointments]) => (
                      <div key={date}>
                        <h4 className="font-semibold mb-3">{formatDate(date)}</h4>
                        <div className="space-y-2 ml-4">
                          {appointments.map((appointment) => (
                            <div
                              key={appointment._id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{appointment.customerName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.serviceType} • {formatTime(appointment.startTime)}
                                </div>
                              </div>
                              {getStatusBadge(appointment.status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
