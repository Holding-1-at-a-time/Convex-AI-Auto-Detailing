"use client"

import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
  Calendar,
  Clock,
  Car,
  DollarSign,
  User,
  MessageSquare,
  X,
  Star,
  AlertCircle,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { DetailedAppointment } from "@/types/appointment-management"

/**
 * Customer Dashboard Upcoming Appointments Component
 *
 * Comprehensive appointment management for customers including:
 * - Upcoming appointments with full details
 * - Appointment history and tracking
 * - Reschedule and cancellation options
 * - Feedback submission for completed services
 * - Real-time status updates
 */
export default function UpcomingAppointments() {
  const { user } = useUser()

  // State management
  const [selectedAppointment, setSelectedAppointment] = useState<DetailedAppointment | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Convex queries
  const customerAppointments = useQuery(
    api.appointments.getCustomerAppointments,
    user?.id ? { customerId: user.id, limit: 20 } : "skip",
  )

  const customerProfile = useQuery(api.customerProfiles.getByUserId, user?.id ? { userId: user.id } : "skip")

  // Mutations
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)
  const rescheduleAppointment = useMutation(api.appointments.rescheduleAppointment)
  const submitFeedback = useMutation(api.feedback.submitFeedback)
  const requestReschedule = useMutation(api.appointments.requestReschedule)

  // Organize appointments by status
  const organizedAppointments = useMemo(() => {
    if (!customerAppointments) return { upcoming: [], completed: [], cancelled: [] }

    const now = new Date()
    const upcoming = customerAppointments.filter(
      (apt) => ["scheduled", "confirmed", "in-progress"].includes(apt.status) && new Date(apt.date) >= now,
    )

    const completed = customerAppointments.filter((apt) => apt.status === "completed")

    const cancelled = customerAppointments.filter((apt) => ["cancelled", "no-show"].includes(apt.status))

    return {
      upcoming: upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      completed: completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      cancelled: cancelled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }
  }, [customerAppointments])

  /**
   * Handle appointment cancellation with reason
   */
  const handleCancelAppointment = async (appointmentId: Id<"appointments">) => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Cancellation Reason Required",
        description: "Please provide a reason for cancelling your appointment.",
        variant: "destructive",
      })
      return
    }

    try {
      await cancelAppointment({
        appointmentId,
        reason: cancellationReason.trim(),
      })

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled. The business has been notified.",
      })

      setCancellationReason("")
      setSelectedAppointment(null)
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to cancel appointment. Please contact the business directly.",
        variant: "destructive",
      })
    }
  }

  /**
   * Handle feedback submission
   */
  const handleSubmitFeedback = async (appointmentId: Id<"appointments">) => {
    if (feedbackRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating for your service experience.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingFeedback(true)

    try {
      await submitFeedback({
        appointmentId,
        customerId: user!.id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined,
      })

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve our services.",
      })

      setFeedbackRating(0)
      setFeedbackComment("")
      setSelectedAppointment(null)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast({
        title: "Feedback Submission Failed",
        description: "Unable to submit feedback. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  /**
   * Request appointment reschedule
   */
  const handleRequestReschedule = async (appointmentId: Id<"appointments">) => {
    try {
      await requestReschedule({
        appointmentId,
        customerId: user!.id,
      })

      toast({
        title: "Reschedule Request Sent",
        description: "The business will contact you to arrange a new appointment time.",
      })
    } catch (error) {
      console.error("Error requesting reschedule:", error)
      toast({
        title: "Request Failed",
        description: "Unable to send reschedule request. Please contact the business directly.",
        variant: "destructive",
      })
    }
  }

  /**
   * Get status badge with appropriate styling
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary" as const, label: "Scheduled", icon: Calendar },
      confirmed: { variant: "default" as const, label: "Confirmed", icon: CheckCircle },
      "in-progress": { variant: "default" as const, label: "In Progress", icon: Clock },
      completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
      cancelled: { variant: "destructive" as const, label: "Cancelled", icon: X },
      "no-show": { variant: "destructive" as const, label: "No Show", icon: AlertCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  /**
   * Render individual appointment card
   */
  const renderAppointmentCard = (appointment: DetailedAppointment, showActions = true) => (
    <Card key={appointment._id} className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{appointment.serviceName}</h3>
              <p className="text-sm text-muted-foreground">{appointment.businessName}</p>
            </div>
            {getStatusBadge(appointment.status)}
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(appointment.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {appointment.startTime} - {appointment.endTime}
              </span>
            </div>

            {appointment.vehicleInfo && (
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>
                  {appointment.vehicleInfo.year} {appointment.vehicleInfo.make} {appointment.vehicleInfo.model}
                  {appointment.vehicleInfo.color && ` - ${appointment.vehicleInfo.color}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${appointment.price}</span>
            </div>

            {appointment.staffName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.staffName}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.duration} minutes</span>
            </div>
          </div>

          {/* Service Description */}
          {appointment.serviceDescription && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">{appointment.serviceDescription}</p>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{appointment.notes}</span>
            </div>
          )}

          {/* Cancellation Reason */}
          {appointment.cancellationReason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cancellation Reason:</strong> {appointment.cancellationReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              {appointment.status === "scheduled" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleRequestReschedule(appointment._id)}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reschedule
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Appointment</DialogTitle>
                        <DialogDescription>
                          Please provide a reason for cancelling your appointment. This helps us improve our service.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
                          <Textarea
                            id="cancellation-reason"
                            placeholder="e.g., Schedule conflict, emergency, etc."
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setCancellationReason("")}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleCancelAppointment(appointment._id)}
                            disabled={!cancellationReason.trim()}
                          >
                            Confirm Cancellation
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {appointment.status === "completed" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Star className="h-4 w-4 mr-1" />
                      Leave Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rate Your Experience</DialogTitle>
                      <DialogDescription>
                        How was your {appointment.serviceName} service at {appointment.businessName}?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Rating *</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                              key={star}
                              variant="ghost"
                              size="sm"
                              className="p-1"
                              onClick={() => setFeedbackRating(star)}
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= feedbackRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback-comment">Comments (Optional)</Label>
                        <Textarea
                          id="feedback-comment"
                          placeholder="Tell us about your experience..."
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFeedbackRating(0)
                            setFeedbackComment("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSubmitFeedback(appointment._id)}
                          disabled={feedbackRating === 0 || isSubmittingFeedback}
                        >
                          {isSubmittingFeedback ? (
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                          ) : (
                            <Star className="h-4 w-4 mr-2" />
                          )}
                          Submit Feedback
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                View Details
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!customerAppointments) {
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
          <h2 className="text-2xl font-bold">Your Appointments</h2>
          <p className="text-muted-foreground">Manage your detailing appointments and service history</p>
        </div>
        <Button asChild>
          <a href="/customer/book">
            <Calendar className="h-4 w-4 mr-2" />
            Book New Appointment
          </a>
        </Button>
      </div>

      {/* Appointment Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({organizedAppointments.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({organizedAppointments.completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cancelled ({organizedAppointments.cancelled.length})
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Appointments */}
        <TabsContent value="upcoming" className="space-y-4">
          {organizedAppointments.upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Appointments</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You don't have any scheduled appointments. Book your next detailing service to keep your vehicle
                  looking great!
                </p>
                <Button asChild>
                  <a href="/customer/book">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book an Appointment
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {organizedAppointments.upcoming.map((appointment) => renderAppointmentCard(appointment, true))}
            </div>
          )}
        </TabsContent>

        {/* Completed Appointments */}
        <TabsContent value="completed" className="space-y-4">
          {organizedAppointments.completed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Services</h3>
                <p className="text-muted-foreground text-center">
                  Your completed appointments will appear here after your services are finished.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {organizedAppointments.completed
                .slice(0, 10)
                .map((appointment) => renderAppointmentCard(appointment, true))}

              {organizedAppointments.completed.length > 10 && (
                <Card>
                  <CardContent className="text-center p-6">
                    <p className="text-muted-foreground mb-4">Showing 10 most recent completed appointments</p>
                    <Button variant="outline" asChild>
                      <a href="/customer/appointments/history">View Full History</a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Cancelled Appointments */}
        <TabsContent value="cancelled" className="space-y-4">
          {organizedAppointments.cancelled.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <X className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Appointments</h3>
                <p className="text-muted-foreground text-center">
                  You haven't cancelled any appointments. Great job keeping your commitments!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {organizedAppointments.cancelled.map((appointment) => renderAppointmentCard(appointment, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Service Information */}
              <div className="space-y-3">
                <h4 className="font-semibold">Service Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Service:</span>
                    <p className="font-medium">{selectedAppointment.serviceName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Business:</span>
                    <p className="font-medium">{selectedAppointment.businessName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">
                      {new Date(selectedAppointment.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">
                      {selectedAppointment.startTime} - {selectedAppointment.endTime}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{selectedAppointment.duration} minutes</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <p className="font-medium">${selectedAppointment.price}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              {selectedAppointment.vehicleInfo && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Vehicle Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vehicle:</span>
                      <p className="font-medium">
                        {selectedAppointment.vehicleInfo.year} {selectedAppointment.vehicleInfo.make}{" "}
                        {selectedAppointment.vehicleInfo.model}
                      </p>
                    </div>
                    {selectedAppointment.vehicleInfo.color && (
                      <div>
                        <span className="text-muted-foreground">Color:</span>
                        <p className="font-medium">{selectedAppointment.vehicleInfo.color}</p>
                      </div>
                    )}
                    {selectedAppointment.vehicleInfo.licensePlate && (
                      <div>
                        <span className="text-muted-foreground">License Plate:</span>
                        <p className="font-medium">{selectedAppointment.vehicleInfo.licensePlate}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Information */}
              {selectedAppointment.staffName && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Staff Information</h4>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Assigned Staff:</span>
                    <p className="font-medium">{selectedAppointment.staffName}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Notes</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Status */}
              <div className="space-y-3">
                <h4 className="font-semibold">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAppointment.status)}
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(selectedAppointment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
