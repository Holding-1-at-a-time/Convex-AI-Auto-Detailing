"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, DollarSign, Users, Settings, BarChart } from "lucide-react"
import Link from "next/link"

export default function BusinessDashboard() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  // Get appointments, services, and other business data
  const appointments =
    useQuery(
      api.appointments.getBusinessAppointments,
      businessProfile?._id ? { businessId: businessProfile._id, limit: 5 } : "skip",
    ) || []

  const services =
    useQuery(api.services.getBusinessServices, businessProfile?._id ? { businessId: businessProfile._id } : "skip") ||
    []

  const stats = useQuery(
    api.dashboard.getBusinessStats,
    businessProfile?._id ? { businessId: businessProfile._id } : "skip",
  ) || {
    totalAppointments: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    upcomingAppointments: 0,
  }

  // Loading state
  if (!isUserLoaded || userDetails === undefined) {
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Business Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {businessProfile?.businessName || userDetails?.name || user.firstName}!
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button asChild variant="outline">
            <Link href="/business/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/business/appointments/new">
              <Calendar className="mr-2 h-4 w-4" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalAppointments}</h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-1">${stats.totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalCustomers}</h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <h3 className="text-2xl font-bold mt-1">{stats.upcomingAppointments}</h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your next scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">{appointment.customerName}</p>
                        <p className="text-sm text-muted-foreground">{appointment.serviceName}</p>
                        <p className="text-sm">
                          {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/business/appointments/${appointment._id}`}>View Details</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <Button className="mt-2" asChild>
                    <Link href="/business/appointments/new">Schedule Appointment</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Services</CardTitle>
                <CardDescription>Manage your detailing services</CardDescription>
              </div>
              <Button asChild>
                <Link href="/business/services/new">Add Service</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service._id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <p className="text-sm">
                          ${service.price.toFixed(2)} • {service.duration} min
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/business/services/${service._id}`}>Edit</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No services added yet</p>
                  <Button className="mt-2" asChild>
                    <Link href="/business/services/new">Add Service</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Analytics</CardTitle>
              <CardDescription>Performance metrics for your detailing business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Analytics dashboard coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
