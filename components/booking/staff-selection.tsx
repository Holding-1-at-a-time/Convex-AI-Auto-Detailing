"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Award, Star } from "lucide-react"

interface StaffSelectionProps {
  businessId: string
  serviceId: string
  date: string
  startTime: string
  endTime: string
  onStaffSelect: (staffId: string, staffInfo: any) => void
  selectedStaffId?: string
}

export function StaffSelection({
  businessId,
  serviceId,
  date,
  startTime,
  endTime,
  onStaffSelect,
  selectedStaffId,
}: StaffSelectionProps) {
  const [availableStaff, setAvailableStaff] = useState<any[]>([])

  // Get service details
  const service = useQuery(api.services.getServiceById, { serviceId })

  // Get all staff members
  const staffMembers = useQuery(api.staff.getAllStaff, { status: "active" }) || []

  // Check staff availability for the selected date and time
  const checkAvailability = useQuery(
    api.appointments.checkAvailability,
    date && startTime && endTime
      ? {
          date,
          serviceType: service?.name || "",
          duration: service?.duration ? Number.parseInt(service.duration) : 60,
        }
      : "skip",
  )

  // Filter staff based on availability and specialties
  useEffect(() => {
    if (staffMembers.length > 0 && checkAvailability) {
      const availableTimeSlot = checkAvailability.availableTimeSlots.find(
        (slot) => slot.startTime === startTime && slot.endTime === endTime,
      )

      if (availableTimeSlot) {
        // Filter staff by availability and specialties
        const filteredStaff = staffMembers.filter((staff) => {
          // Check if staff is available for this time slot
          const isAvailable = availableTimeSlot.availableStaff.some((availStaff) => availStaff.id === staff.userId)

          // Check if staff has the required specialties for this service
          const hasSpecialty =
            !service?.specialtyRequired ||
            (staff.specialties && staff.specialties.some((specialty) => service.specialties?.includes(specialty)))

          return isAvailable && hasSpecialty
        })

        setAvailableStaff(filteredStaff)

        // Auto-select first staff member if none selected
        if (filteredStaff.length > 0 && !selectedStaffId) {
          onStaffSelect(filteredStaff[0].userId, filteredStaff[0])
        }
      }
    }
  }, [staffMembers, checkAvailability, service, startTime, endTime, selectedStaffId, onStaffSelect])

  if (!date || !startTime || !endTime) {
    return null
  }

  if (staffMembers === undefined || checkAvailability === undefined) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    )
  }

  if (availableStaff.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">No staff members available for this time slot</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Select Staff Member (Optional)</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableStaff.map((staff) => (
          <Card
            key={staff._id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedStaffId === staff.userId ? "border-2 border-primary" : ""
            }`}
            onClick={() => onStaffSelect(staff.userId, staff)}
          >
            <CardContent className="p-4 flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={`/abstract-geometric-shapes.png?height=40&width=40&query=${staff.name}`}
                  alt={staff.name}
                />
                <AvatarFallback>{staff.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{staff.name}</p>
                  {selectedStaffId === staff.userId && (
                    <Badge variant="default" className="ml-2">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{staff.role}</p>
                {staff.specialties && staff.specialties.length > 0 && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    <span>{staff.specialties.join(", ")}</span>
                  </div>
                )}
                {staff.certifications && staff.certifications.length > 0 && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Award className="h-3 w-3 mr-1" />
                    <span>{staff.certifications.length} certification(s)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
