"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Calendar, Clock, User, Car, DollarSign, CheckCircle, Phone, Mail, MessageSquare, Filter } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { DetailedAppointment } from "@/types/appointment-management"

interface AppointmentOverviewProps {
  businessId: Id<"businessProfiles">
}

/**
 * Business Owner Dashboard Appointment Overview Component
 *
 * Comprehensive appointment management for business owners including:
 * - Real-time appointment calendar view
 * - Customer details and contact information
 * - Appointment status management
 * - Revenue and performance analytics
 * - Staff scheduling and assignment
 * - Customer communication tools
 *
 * @param businessId - The business profile ID to manage appointments for
 */
export default function AppointmentOverview({ businessId }: AppointmentOverviewProps) {
  const { user } = useUser()

  // State management
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAppointment, setSelectedAppointment] = useState<DetailedAppointment | null>(null)
  const [completionNotes, setCompletionNotes] = useState("")

  // Convex queries
  const businessAppointments = useQuery(
    api.appointments.getBusinessAppointments,
    businessId ? { businessId, limit: 100 } : "skip",
  )

  const todayAppointments = useQuery(api.appointments.getTodayAppointments, businessId ? { businessId } : "skip")

  const appointmentStats = useQuery(api.dashboard.getBusinessStats, businessId ? { businessId } : "skip")

  const businessStaff = useQuery(api.staff.getBusinessStaff, businessId ? { businessId } : "skip")

  // Mutations
  const updateAppointmentStatus = useMutation(api.appointments.updateAppointmentStatus)
  const completeAppointment = useMutation(api.appointments.completeAppointment)
  const assignStaff = useMutation(api.appointments.assignStaff)
  const sendCustomerMessage = useMutation(api.notifications.sendCustomerMessage)

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
    const grouped: Record<string, DetailedAppointment[]> = {}

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
  const todaysAppointmentsList = appointmentsByDate[new Date().toISOString().split("T")[0]] || []

  /**
   * Handle appointment status update
   */
  const handleStatusUpdate = async (appointmentId: Id<"appointments">, newStatus: string) => {
    try {
      await updateAppointmentStatus({
        appointmentId,
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

  /**
   * Handle appointment completion
   */
  const handleCompleteAppointment = async (appointmentId: Id<"appointments">) => {
    try {
      await completeAppointment({
        appointmentId,
        completionNotes: completionNotes.trim() || undefined,
      })

      toast({
        title: "Appointment Completed",
        description: "Appointment has been marked as completed and customer has been notified.",
      })

      setCompletionNotes("")
      setSelectedAppointment(null)
    } catch (error) {
      console.error("Error completing appointment:", error)
      toast({
        title: "Completion Failed",
        description: "Unable to complete appointment. Please try again.",
        variant: "destructive",
      })
    }
  }

  /**
   * Handle staff assignment
   */
  const handleAssignStaff = async (appointmentId: Id<"appointments">, staffId: Id<"staff">) => {
    try {
      await assignStaff({
        appointmentId,
        staffId,
      })

      toast({
        title: "Staff Assigned",
        description: "Staff member has been assigned to this appointment.",
      })
    } catch (error) {
      console.error("Error assigning staff:", error)
      toast({
        title: "Assignment Failed",
        description: "Unable to assign staff. Please try again.",
        variant: "destructive",
      })
    }
  }

  /**
   * Send message to customer
   */
  const handleSendMessage = async (customerId: string, message: string) => {
    try {
      await sendCustomerMessage({
        customerId,
        businessId,
        message,
      })

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the customer.",
      })
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Message Failed",
        description: "Unable to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  /**
   * Get status badge with appropriate styling
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary" as const, label: "Scheduled" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      "in-progress": { variant: "default" as const, label: "In Progress" },
      completed: { variant: "default" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
      "no-show": { variant: "destructive" as const, label: "No Show" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  /**
   * Calculate revenue for filtered appointments
   */
  const calculateRevenue = (appointments: DetailedAppointment[]) => {
    return appointments.filter((apt) => apt.status === "completed").reduce((sum, apt) => sum + apt.price, 0)
  }

  if (!businessAppointments || !appointmentStats) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Appointment Management</h2>
          <p className="text-muted-foreground">Manage your business appointments and customer interactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/business/calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </a>
          </Button>
          <Button asChild>
            <a href="/business/appointments/new">
              <Calendar className="h-4 w-4 mr-2" />
              New Appointment
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
                <p className="text-2xl font-bold">{todaysAppointmentsList.length}</p>
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
                <p className="text-2xl font-bold">{appointmentStats.totalAppointments}</p>
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
                <p className="text-2xl font-bold">{appointmentStats.completedAppointments}</p>
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
                <p className="text-2xl font-bold">${appointmentStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Label>Filter by status:</Label>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
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

            <div className="text-sm text-muted-foreground">
              Showing {filteredAppointments.length} appointments
              {statusFilter !== "all" && ` with status: ${statusFilter}`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Management */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Today ({todaysAppointmentsList.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todaysAppointmentsList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Appointments Today</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any appointments scheduled for today. Enjoy your free time!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todaysAppointmentsList.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  businessStaff={businessStaff}
                  onStatusUpdate={handleStatusUpdate}
                  onComplete={() => setSelectedAppointment(appointment)}
                  onAssignStaff={handleAssignStaff}
                  onSendMessage={handleSendMessage}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {Object.entries(appointmentsByDate)
            .filter(([date]) => new Date(date) > new Date())
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .slice(0, 7) // Show next 7 days
            .map(([date, appointments]) => (
              <div key={date}>
                <h3 className="font-semibold mb-3 text-lg">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({appointments.length} appointment{appointments.length !== 1 ? "s" : ""})
                  </span>
                </h3>
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      businessStaff={businessStaff}
                      onStatusUpdate={handleStatusUpdate}
                      onComplete={() => setSelectedAppointment(appointment)}
                      onAssignStaff={handleAssignStaff}
                      onSendMessage={handleSendMessage}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {Object.entries(appointmentsByDate)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, appointments]) => (
              <div key={date}>
                <h3 className="font-semibold mb-3 text-lg">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({appointments.length} appointment{appointments.length !== 1 ? "s" : ""} • $
                    {calculateRevenue(appointments).toFixed(2)} revenue)
                  </span>
                </h3>
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      businessStaff={businessStaff}
                      onStatusUpdate={handleStatusUpdate}
                      onComplete={() => setSelectedAppointment(appointment)}
                      onAssignStaff={handleAssignStaff}
                      onSendMessage={handleSendMessage}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </div>
            ))}
        </TabsContent>
      </Tabs>

      {/* Completion Dialog */}
      {selectedAppointment && (
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Appointment</DialogTitle>
              <DialogDescription>Mark this appointment as completed and add any final notes.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
                <Textarea
                  id="completion-notes"
                  placeholder="Any additional notes about the service provided..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCompleteAppointment(selectedAppointment._id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Appointment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Individual appointment card component
interface AppointmentCardProps {
  appointment: DetailedAppointment
  businessStaff?: any[]
  onStatusUpdate: (id: Id<"appointments">, status: string) => void
  onComplete: () => void
  onAssignStaff: (appointmentId: Id<"appointments">, staffId: Id<"staff">) => void
  onSendMessage: (customerId: string, message: string) => void
  getStatusBadge: (status: string) => React.JSX.Element
}

function AppointmentCard({
  appointment,
  businessStaff,
  onStatusUpdate,
  onComplete,
  onAssignStaff,
  onSendMessage,
  getStatusBadge,
}: AppointmentCardProps) {
  const [messageText, setMessageText] = useState("")

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-lg">{appointment.serviceName}</h4>
                {getStatusBadge(appointment.status)}
              </div>
              <p className="text-sm text-muted-foreground">Appointment #{appointment._id.slice(-8)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">${appointment.price}</p>
              <p className="text-sm text-muted-foreground">{appointment.duration} min</p>
            </div>
          </div>

          {/* Customer & Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h5 className="font-medium mb-2">Customer Information</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{appointment.customerName}</span>
                  </div>
                  {appointment.customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.customerEmail}</span>
                    </div>
                  )}
                  {appointment.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {appointment.vehicleInfo && (
                <div>
                  <h5 className="font-medium mb-2">Vehicle Information</h5>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                      {appointment.vehicleInfo.color && ` - ${appointment.vehicleInfo.color}`}
                    </span>
                  </div>
                  {appointment.vehicleInfo.licensePlate && (
                    <p className="text-sm text-muted-foreground ml-6">
                      License: {appointment.vehicleInfo.licensePlate}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h5 className="font-medium mb-2">Appointment Details</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(appointment.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {appointment.startTime} - {appointment.endTime}
                    </span>
                  </div>
                  {appointment.staffName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Assigned to: {appointment.staffName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Staff Assignment */}
              {businessStaff && businessStaff.length > 0 && !appointment.staffId && (
                <div>
                  <Label className="text-sm font-medium">Assign Staff</Label>
                  <Select onValueChange={(staffId) => onAssignStaff(appointment._id, staffId as Id<"staff">)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessStaff.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Customer Notes:</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {appointment.status === "scheduled" && (
              <Button variant="outline" size="sm" onClick={() => onStatusUpdate(appointment._id, "confirmed")}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}

            {appointment.status === "confirmed" && (
              <Button variant="outline" size="sm" onClick={() => onStatusUpdate(appointment._id, "in-progress")}>
                <Clock className="h-4 w-4 mr-1" />
                Start Service
              </Button>
            )}

            {appointment.status === "in-progress" && (
              <Button variant="default" size="sm" onClick={onComplete}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}

            {["scheduled", "confirmed"].includes(appointment.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(appointment._id, "cancelled")}
                className="text-destructive hover:text-destructive"
              >
                Cancel
              </Button>
            )}

            {/* Customer Communication */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message to Customer</DialogTitle>
                  <DialogDescription>
                    Send a message to {appointment.customerName} about their appointment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setMessageText("")}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        onSendMessage(appointment.customerId, messageText)
                        setMessageText("")
                      }}
                      disabled={!messageText.trim()}
                    >
                      Send Message
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
