"use client"

import type React from "react"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, DollarSign } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface CancelModalProps {
  appointmentId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
  cancellationPolicy: any
}

export function CancelModal({ appointmentId, open, onClose, onSuccess, cancellationPolicy }: CancelModalProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()

  // Cancel mutation
  const cancelAppointment = useMutation(api.appointmentCancellation.cancelAppointment)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await cancelAppointment({
        appointmentId: appointmentId as Id<"appointments">,
        reason: reason || undefined,
        cancelledBy: "admin", // In a real app, get from current user
        refundRequested: true,
      })

      toast({
        title: "Success",
        description: "Appointment has been cancelled successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Cancel error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel appointment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!cancellationPolicy) {
    return null
  }

  if (!cancellationPolicy.canCancel) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Cannot Cancel
            </DialogTitle>
            <DialogDescription>{cancellationPolicy.reason}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        {/* Cancellation Policy Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Refund Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Refund Percentage:</span>
              <Badge variant={cancellationPolicy.refundPercentage > 0 ? "default" : "destructive"}>
                {cancellationPolicy.refundPercentage}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Refund Amount:</span>
              <span className="font-semibold">${cancellationPolicy.refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Hours Until Appointment:</span>
              <span className="font-semibold">{Math.round(cancellationPolicy.hoursUntilAppointment)}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancellation Policy</CardTitle>
            <CardDescription>Refund percentages based on cancellation timing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cancellationPolicy.policies.map((policy: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {policy.hoursBeforeAppointment === 0 ? "Less than 24h" : `${policy.hoursBeforeAppointment}+ hours`}
                  </span>
                  <span>{policy.refundPercentage}% refund</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Keep Appointment
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
