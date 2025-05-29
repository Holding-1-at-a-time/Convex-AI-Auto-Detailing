"use client"

import type React from "react"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface RescheduleModalProps {
  appointmentId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RescheduleModal({ appointmentId, open, onClose, onSuccess }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("")
  const [newEndTime, setNewEndTime] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()

  // Get appointment details
  const appointment = useQuery(api.appointments.getAppointment, {
    id: appointmentId as Id<"appointments">,
  })

  // Check if appointment can be rescheduled
  const canReschedule = useQuery(api.appointmentRescheduling.canRescheduleAppointment, {
    appointmentId: appointmentId as Id<"appointments">,
  })

  // Reschedule mutation
  const rescheduleAppointment = useMutation(api.appointmentRescheduling.rescheduleAppointment)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate inputs
      if (!newDate || !newStartTime || !newEndTime) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      // Validate date is not in the past
      const selectedDate = new Date(newDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        toast({
          title: "Error",
          description: "Please select a future date",
          variant: "destructive",
        })
        return
      }

      // Validate time order
      if (newStartTime >= newEndTime) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        })
        return
      }

      await rescheduleAppointment({
        appointmentId: appointmentId as Id<"appointments">,
        newDate,
        newStartTime,
        newEndTime,
        reason: reason || undefined,
        rescheduledBy: "admin", // In a real app, get from current user
      })

      toast({
        title: "Success",
        description: "Appointment has been rescheduled successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Reschedule error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule appointment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!appointment || !canReschedule) {
    return null
  }

  if (!canReschedule.canReschedule) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Reschedule</DialogTitle>
            <DialogDescription>{canReschedule.reason}</DialogDescription>
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
            <Calendar className="w-4 h-4" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Current appointment: {appointment.date} at {appointment.startTime} - {appointment.endTime}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newDate">New Date</Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newStartTime">Start Time</Label>
              <Input
                id="newStartTime"
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndTime">End Time</Label>
              <Input
                id="newEndTime"
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rescheduling (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rescheduling..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Rescheduling..." : "Reschedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
