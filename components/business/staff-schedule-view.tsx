"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, CheckCircle } from "lucide-react"

interface StaffScheduleViewProps {
  businessId: string
}

export function StaffScheduleView({ businessId }: StaffScheduleViewProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  // Fetch staff members
  const staffMembers = useQuery(api.staff.getAllStaff, { status: "active" }) || []

  // Set first staff member as default when data loads
  useEffect(() => {
    if (staffMembers.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffMembers[0].userId)
    }
  }, [staffMembers, selectedStaffId])

  // Fetch staff schedule
  const staffSchedule = useQuery(
    api.staff.getStaffSchedule,
    selectedStaffId
      ? {
          staffId: selectedStaffId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : "skip",
  )

  // Fetch appointments for the selected date
  const dateAppointments = useQuery(api.appointments.getAppointmentsByDate, {
    date: selectedDate.toISOString().split("T")[0],
  })

  // Fetch staff availability for the selected date
  const staffAvailability = useQuery(
    api.staff.getStaffAvailability,
    selectedStaffId
      ? {
          staffId: selectedStaffId,
          startDate: selectedDate.toISOString().split("T")[0],
          endDate: selectedDate.toISOString().split("T")[0],
        }
      : "skip",
  )

  const setStaffAvailability = useMutation(api.staff.setStaffAvailability)
  const assignStaffToAppointment = useMutation(api.staff.assignStaffToAppointment)

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)

      // Update date range to include a week from the selected date
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 7)

      setDateRange({
        startDate: date.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      })
    }
  }

  const handleAssignStaff = async (appointmentId: string, staffId: string) => {
    try {
      await assignStaffToAppointment({
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
        description: error instanceof Error ? error.message : "Failed to assign staff. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (staffMembers === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff Schedule</CardTitle>
            <CardDescription>View and manage staff assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-select">Select Staff Member</Label>
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

            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{staffSchedule?.name ? `${staffSchedule.name}'s Schedule` : "Staff Schedule"}</CardTitle>
            <CardDescription>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!staffSchedule || !staffAvailability ? (
              <div className="flex items-center justify-center p-4">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Availability Status */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Availability</p>
                      {staffAvailability.dates?.[0]?.isAvailable ? (
                        <p className="text-sm text-muted-foreground">
                          {staffAvailability.dates[0].startTime && staffAvailability.dates[0].endTime
                            ? `${formatTime(staffAvailability.dates[0].startTime)} - ${formatTime(
                                staffAvailability.dates[0].endTime,
                              )}`
                            : "Available all day"}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not available</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={staffAvailability.dates?.[0]?.isAvailable ? "default" : "destructive"}>
                    {staffAvailability.dates?.[0]?.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>

                {/* Appointments for this staff */}
                <div className="space-y-2">
                  <h4 className="font-medium">Assigned Appointments</h4>
                  {staffSchedule.appointments && staffSchedule.appointments.length > 0 ? (
                    <div className="space-y-2">
                      {staffSchedule.appointments
                        .filter(
                          (apt) => apt.date === selectedDate.toISOString().split("T")[0] && apt.status !== "cancelled",
                        )
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((appointment) => (
                          <div key={appointment._id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{appointment.customerName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                                </p>
                                <p className="text-sm">{appointment.serviceType}</p>
                                {appointment.vehicleInfo && (
                                  <p className="text-xs text-muted-foreground">
                                    {appointment.vehicleInfo.year} {appointment.vehicleInfo.make}{" "}
                                    {appointment.vehicleInfo.model}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant={
                                  appointment.status === "completed"
                                    ? "secondary"
                                    : appointment.status === "in-progress"
                                      ? "default"
                                      : "outline"
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No appointments assigned for this date</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Unassigned Appointments</CardTitle>
          <CardDescription>Assign staff members to appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {dateAppointments === undefined ? (
            <div className="flex items-center justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : dateAppointments.filter((apt) => !apt.staffId && apt.status !== "cancelled").length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">All appointments have been assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dateAppointments
                .filter((apt) => !apt.staffId && apt.status !== "cancelled")
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((appointment) => (
                  <div key={appointment._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{appointment.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.serviceType} • {formatTime(appointment.startTime)} -{" "}
                        {formatTime(appointment.endTime)}
                      </div>
                      {appointment.vehicleInfo && (
                        <div className="text-xs text-muted-foreground">
                          {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={(staffId) => handleAssignStaff(appointment._id, staffId)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff._id} value={staff.userId}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Import for Label component
import { Label } from "@/components/ui/label"
