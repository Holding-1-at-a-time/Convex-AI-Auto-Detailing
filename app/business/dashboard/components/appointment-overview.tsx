"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Calendar, Clock, User, Car, DollarSign, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AppointmentWithDetails } from "@/types/appointment"

interface AppointmentOverviewProps {
  businessId: Id<"businessProfiles">
}

export default function AppointmentOverview({ businessId }: AppointmentOverviewProps) {
  const { user } = useUser()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Convex queries
  const businessAppointments = useQuery(
    api.appointments.getBusinessAppointments,
    businessId ? { businessId, limit: 50 } : "skip",
  )

  const upcomingAppointments = useQuery(api.appointments.getUpcomingAppointments, { days: 7 })

  // Mutations
  const updateAppointmentStatus = useMutation(api.appointments.updateAppointment)
  const completeAppointment = useMutation(api.appointments.completeAppointment)

  // Filter and organize appointments
  const filteredAppointments = useMemo(() => {
    if (!businessAppointments) return []

    return businessAppointments.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [businessAppointments, statusFilter])

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, AppointmentWithDetails[]> = {}

    filteredAppointments.forEach((appointment) => {
      if (!grouped[appointment.date]) {
        grouped[appointment.date] = []
      }
      grouped[appointment.date].push(appointment)
    })

    // Sort appointments within each date by start time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
    })

    return grouped
  }, [filteredAppointments])

  // Today's appointments
  const todaysAppointments = appointmentsByDate[new Date().toISOString().split("T")[0]] || []

  // Handle status update
  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentStatus({
        appointmentId: appointmentId as Id<"appointments">,
        status: newStatus,
      })

      toast({
        title: "Status Updated",
        description: `Appointment status has been updated to ${newStatus}.`,
      })
    } catch (error) {
      console.error("Error updating appointment status:", error)
      toast({
        title: "Update Failed",
        description: "Unable to update appointment status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle appointment completion
  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await completeAppointment({
        appointmentId: appointmentId as Id<"appointments">,
      })

      toast({
        title: "Appointment Completed",
        description: "Appointment has been marked as completed.",
      })
    } catch (error) {
      console.error("Error completing appointment:", error)
      toast({
        title: "Completion Failed",
        description: "Unable to complete appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

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

  if (!businessAppointments) {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
                <p className="text-2xl font-bold">{todaysAppointments.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold">{filteredAppointments.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {filteredAppointments.filter((a) => a.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  ${filteredAppointments.reduce((sum, a) => sum + (a.price || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Management
              </CardTitle>
              <CardDescription>View and manage your business appointments</CardDescription>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="today" className="w-full">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="all">All Appointments</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              {todaysAppointments.length === 0 ? (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>No appointments scheduled for today.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {todaysAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onStatusUpdate={handleStatusUpdate}
                      onComplete={handleCompleteAppointment}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {Object.entries(upcomingAppointments || {}).map(([date, appointments]) => (
                <div key={date}>
                  <h3 className="font-semibold mb-3">
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <div className="space-y-3">
                    {appointments.map((appointment: any) => (
                      <AppointmentCard
                        key={appointment._id}
                        appointment={appointment}
                        onStatusUpdate={handleStatusUpdate}
                        onComplete={handleCompleteAppointment}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {Object.entries(appointmentsByDate)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, appointments]) => (
                  <div key={date}>
                    <h3 className="font-semibold mb-3">
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    <div className="space-y-3">
                      {appointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          onStatusUpdate={handleStatusUpdate}
                          onComplete={handleCompleteAppointment}
                          getStatusBadge={getStatusBadge}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Individual appointment card component
interface AppointmentCardProps {
  appointment: AppointmentWithDetails
  onStatusUpdate: (id: string, status: string) => void
  onComplete: (id: string) => void
  getStatusBadge: (status: string) => React.JSX.Element
}

function AppointmentCard({ appointment, onStatusUpdate, onComplete, getStatusBadge }: AppointmentCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold">{appointment.serviceName}</h4>
            {getStatusBadge(appointment.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {appointment.startTime} - {appointment.endTime}
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {appointment.customerName}
            </div>

            {appointment.price && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />${appointment.price}
              </div>
            )}

            {appointment.vehicleInfo && (
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {appointment.status === "scheduled" && (
            <Button variant="outline" size="sm" onClick={() => onStatusUpdate(appointment._id, "confirmed")}>
              Confirm
            </Button>
          )}

          {appointment.status === "confirmed" && (
            <Button variant="outline" size="sm" onClick={() => onStatusUpdate(appointment._id, "in-progress")}>
              Start
            </Button>
          )}

          {appointment.status === "in-progress" && (
            <Button variant="default" size="sm" onClick={() => onComplete(appointment._id)}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
