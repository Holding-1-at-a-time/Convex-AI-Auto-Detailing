"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { ArrowLeft, Calendar, Clock, User, Car, DollarSign, MessageSquare, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface AppointmentDetailsPageProps {
  params: {
    id: string
  }
}

export default function AppointmentDetailsPage({ params }: AppointmentDetailsPageProps) {
  const { id: appointmentId } = params
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const { toast } = useToast()
  const [notes, setNotes] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const appointment = useQuery(api.internal.appointments.getAppointmentWithDetails, { appointmentId })
  const staffMembers = useQuery(api.staff.getAllStaff, { status: "active" }) || []

  const updateAppointment = useMutation(api.appointments.updateAppointment)
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)
  const completeAppointment = useMutation(api.appointments.completeAppointment)
  const assignStaff = useMutation(api.staff.assignStaffToAppointment)

  // Set initial values when appointment data loads
  useState(() => {
    if (appointment) {
      setNotes(appointment.notes || "")
      setSelectedStaffId(appointment.staffId || "")
    }
  })

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

  // Redirect if not a business
  if (userDetails?.role !== "business") {
    redirect("/role-selection")
    return null
  }

  if (!appointment) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/business/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Appointment not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true)

    try {
      if (status === "completed") {
        await completeAppointment({
          appointmentId,
          notes: notes || undefined,
        })
      } else if (status === "cancelled") {
        await cancelAppointment({
          appointmentId,
          reason: notes || undefined,
        })
      } else {
        await updateAppointment({
          appointmentId,
          status,
          notes: notes || undefined,
        })
      }

      toast({
        title: "Appointment Updated",
        description: `Appointment status has been updated to ${status}.`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating appointment:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignStaff = async () => {
    if (!selectedStaffId) return

    setIsUpdating(true)

    try {
      await assignStaff({
        appointmentId,
        staffId: selectedStaffId,
      })

      toast({
        title: "Staff Assigned",
        description: "Staff member has been assigned to this appointment.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error assigning staff:", error)
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign staff. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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
      year: "numeric",
    })
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/business/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Appointment Details</h1>
          <p className="text-muted-foreground">
            {formatDate(appointment.date)} • {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </p>
        </div>
        <div className="mt-2 md:mt-0">{getStatusBadge(appointment.status)}</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Date & Time</p>
                  <p>
                    {formatDate(appointment.date)}, {formatTime(appointment.startTime)} -{" "}
                    {formatTime(appointment.endTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Service</p>
                  <p>{appointment.serviceType}</p>
                  {appointment.serviceInfo && (
                    <p className="text-sm text-muted-foreground">{appointment.serviceInfo.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p>${appointment.price?.toFixed(2) || "N/A"}</p>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm">{appointment.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointment.customer ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Customer</p>
                        <p>{appointment.customer.name}</p>
                        {appointment.customer.email && (
                          <p className="text-sm text-muted-foreground">{appointment.customer.email}</p>
                        )}
                        {appointment.customer.phone && (
                          <p className="text-sm text-muted-foreground">{appointment.customer.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {appointment.vehicleInfo && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Vehicle</p>
                          <p>
                            {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                            {appointment.vehicleInfo.model}
                          </p>
                          {appointment.vehicleInfo.color && (
                            <p className="text-sm text-muted-foreground">Color: {appointment.vehicleInfo.color}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Customer information not available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointment.staffInfo ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Assigned Staff</p>
                      <p>{appointment.staffInfo.name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.staffInfo.role}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStaffId("")}
                    disabled={appointment.status === "completed" || appointment.status === "cancelled"}
                  >
                    Change Staff
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">No staff member assigned</p>

                  <div className="space-y-2">
                    <Label htmlFor="staff-select">Assign Staff Member</Label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff._id} value={staff.userId}>
                            {staff.name} ({staff.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAssignStaff}
                    disabled={
                      !selectedStaffId ||
                      isUpdating ||
                      appointment.status === "completed" ||
                      appointment.status === "cancelled"
                    }
                  >
                    Assign Staff
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appointment Actions</CardTitle>
          <CardDescription>Update appointment status or add notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this appointment..."
              rows={3}
              disabled={appointment.status === "completed" || appointment.status === "cancelled"}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {appointment.status === "scheduled" && (
            <>
              <Button variant="outline" onClick={() => handleUpdateStatus("in-progress")} disabled={isUpdating}>
                Start Appointment
              </Button>
              <Button onClick={() => handleUpdateStatus("completed")} disabled={isUpdating}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            </>
          )}

          {appointment.status === "in-progress" && (
            <Button onClick={() => handleUpdateStatus("completed")} disabled={isUpdating}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}

          {(appointment.status === "scheduled" || appointment.status === "in-progress") && (
            <Button variant="destructive" onClick={() => handleUpdateStatus("cancelled")} disabled={isUpdating}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel Appointment
            </Button>
          )}

          {appointment.status === "completed" && (
            <Button disabled>
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed
            </Button>
          )}

          {appointment.status === "cancelled" && (
            <Button variant="destructive" disabled>
              <XCircle className="h-4 w-4 mr-1" />
              Cancelled
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

// Import for Label component
import { Label } from "@/components/ui/label"
