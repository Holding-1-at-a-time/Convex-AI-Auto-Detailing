"use client"

import { useState } from "react"
import { useActionState } from "react"
import { rescheduleBundle } from "@/app/actions/rescheduleBundle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, DollarSign, Edit, X } from "lucide-react"
import { format } from "date-fns"

interface BookingManagementProps {
  booking: {
    _id: string
    bundleName: string
    date: string
    startTime: string
    endTime: string
    status: string
    price: number
    businessName: string
    customerName: string
    customerEmail: string
    rescheduleHistory?: Array<{
      originalDate: string
      originalStartTime: string
      newDate: string
      newStartTime: string
      reason: string
      rescheduledAt: string
    }>
  }
}

export default function BookingManagement({ booking }: BookingManagementProps) {
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [rescheduleState, rescheduleAction, isSubmitting] = useActionState(rescheduleBundle, null)

  const canReschedule = () => {
    const appointmentTime = new Date(`${booking.date}T${booking.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilAppointment > 24 && booking.status === "confirmed"
  }

  const canCancel = () => {
    const appointmentTime = new Date(`${booking.date}T${booking.startTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilAppointment > 24 && booking.status === "confirmed"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{booking.bundleName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{booking.businessName}</p>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Booking Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{format(new Date(booking.date), "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {booking.startTime} - {booking.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">${booking.price}</span>
          </div>
        </div>

        {/* Reschedule History */}
        {booking.rescheduleHistory && booking.rescheduleHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Reschedule History</h4>
            <div className="space-y-2">
              {booking.rescheduleHistory.map((reschedule, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <p>
                    Moved from {reschedule.originalDate} at {reschedule.originalStartTime} to {reschedule.newDate} at{" "}
                    {reschedule.newStartTime}
                  </p>
                  {reschedule.reason && <p>Reason: {reschedule.reason}</p>}
                  <p>Rescheduled on {format(new Date(reschedule.rescheduledAt), "MMM d, yyyy")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reschedule Form */}
        {isRescheduling && (
          <div className="border-t pt-4">
            <form action={rescheduleAction} className="space-y-4">
              <input type="hidden" name="bookingId" value={booking._id} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newDate">New Date</Label>
                  <Input
                    type="date"
                    id="newDate"
                    name="newDate"
                    min={format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newTime">New Time</Label>
                  <Input type="time" id="newTime" name="newTime" required />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Rescheduling (Optional)</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Please let us know why you need to reschedule..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsRescheduling(false)}>
                  Cancel
                </Button>
              </div>

              {rescheduleState?.error && <p className="text-sm text-red-600">{rescheduleState.error}</p>}
              {rescheduleState?.success && <p className="text-sm text-green-600">Booking rescheduled successfully!</p>}
            </form>
          </div>
        )}

        {/* Action Buttons */}
        {!isRescheduling && (
          <div className="flex gap-2 pt-4 border-t">
            {canReschedule() && (
              <Button variant="outline" onClick={() => setIsRescheduling(true)} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Reschedule
              </Button>
            )}
            {canCancel() && (
              <Button variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
                Cancel Booking
              </Button>
            )}
          </div>
        )}

        {/* Restrictions Notice */}
        {!canReschedule() && !canCancel() && booking.status === "confirmed" && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p>
              Rescheduling and cancellation are only available up to 24 hours before your appointment. Please contact us
              directly for any changes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
