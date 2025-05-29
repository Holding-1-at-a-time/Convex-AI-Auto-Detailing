"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { RescheduleModal } from "./reschedule-modal"
import { CancelModal } from "./cancel-modal"
import type { Id } from "@/convex/_generated/dataModel"

interface BookingDetailsModalProps {
  appointmentId: string
  open: boolean
  onClose: () => void
}

export function BookingDetailsModal({ appointmentId, open, onClose }: BookingDetailsModalProps) {
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  // Get appointment details
  const appointment = useQuery(api.appointments.getAppointment, {
    id: appointmentId as Id<"appointments">,
  })

  // Get reschedule history
  const rescheduleHistory = useQuery(api.appointmentRescheduling.getRescheduleHistory, {
    appointmentId: appointmentId as Id<"appointments">,
  })

  // Get cancellation policy
  const cancellationPolicy = useQuery(api.appointmentCancellation.getCancellationPolicy, {
    appointmentId: appointmentId as Id<"appointments">,
  })

  // Get bundle details if applicable
  const bundle = useQuery(
    api.serviceBundles.getServiceBundle,
    appointment?.bundleId ? { id: appointment.bundleId } : "skip",
  )

  if (!appointment) {
    return null
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking Details
              {getStatusBadge(appointment.status)}
            </DialogTitle>
            <DialogDescription>Appointment ID: {appointment._id}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Service</p>
                    <p className="font-semibold">{appointment.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="font-semibold">{appointment.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p className="font-semibold">
                      {appointment.startTime} - {appointment.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Price</p>
                    <p className="font-semibold">${appointment.price || 0}</p>
                  </div>
                </div>

                {appointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{appointment.notes}</p>
                  </div>
                )}

                {bundle && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bundle</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Bundle</Badge>
                      <span className="font-semibold">{bundle.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{bundle.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer ID</p>
                  <p className="font-semibold">{appointment.customerId}</p>
                </div>

                {appointment.customerInfo && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-semibold">{appointment.customerInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-semibold">{appointment.customerInfo.email}</p>
                    </div>
                    {appointment.customerInfo.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="font-semibold">{appointment.customerInfo.phone}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Reschedule History */}
            {rescheduleHistory && rescheduleHistory.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Reschedule History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rescheduleHistory.map((entry, index) => (
                      <div key={index} className="border-l-2 border-muted pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {entry.originalDate} {entry.originalStartTime} → {entry.newDate} {entry.newStartTime}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Rescheduled by {entry.rescheduledBy} on{" "}
                              {new Date(entry.rescheduledAt).toLocaleDateString()}
                            </p>
                            {entry.reason && <p className="text-sm">Reason: {entry.reason}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancellation Information */}
            {appointment.status === "cancelled" && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Cancellation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cancelled By</p>
                      <p className="font-semibold">{appointment.cancelledBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cancelled At</p>
                      <p className="font-semibold">
                        {appointment.cancelledAt ? new Date(appointment.cancelledAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Refund Percentage</p>
                      <p className="font-semibold">{appointment.refundPercentage || 0}%</p>
                    </div>
                  </div>
                  {appointment.cancellationReason && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reason</p>
                      <p className="text-sm">{appointment.cancellationReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          {appointment.status === "scheduled" && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowReschedule(true)}>
                Reschedule
              </Button>
              <Button variant="destructive" onClick={() => setShowCancel(true)}>
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      {showReschedule && (
        <RescheduleModal
          appointmentId={appointmentId}
          open={showReschedule}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => {
            setShowReschedule(false)
            // Refresh data
          }}
        />
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <CancelModal
          appointmentId={appointmentId}
          open={showCancel}
          onClose={() => setShowCancel(false)}
          cancellationPolicy={cancellationPolicy}
          onSuccess={() => {
            setShowCancel(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
