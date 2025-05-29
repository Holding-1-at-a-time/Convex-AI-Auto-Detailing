"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, Clock, MapPin } from "lucide-react"
import Link from "next/link"

interface BookingConfirmationProps {
  appointment: {
    id: string
    serviceName: string
    date: string
    startTime: string
    endTime: string
    businessName: string
    businessAddress?: string
    price?: number
  }
}

export function BookingConfirmation({ appointment }: BookingConfirmationProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
        <CardDescription>Your appointment has been successfully scheduled</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-lg">{appointment.serviceName}</h3>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(appointment.date)}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.businessName}</span>
            </div>

            {appointment.businessAddress && (
              <div className="ml-6 text-muted-foreground">{appointment.businessAddress}</div>
            )}
          </div>

          {appointment.price && (
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold">${appointment.price.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">What's Next?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• You'll receive a confirmation email shortly</li>
            <li>• We'll send you a reminder 24 hours before your appointment</li>
            <li>• You can manage your appointment from your dashboard</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link href="/customer/appointments">View My Appointments</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/customer/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
