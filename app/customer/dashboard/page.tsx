"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Star, Settings } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CustomerDashboard() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const customerProfile = useQuery(
    api.customerProfiles.getCustomerProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  // Get appointments, vehicles, and other customer data
  const appointments =
    useQuery(
      api.appointments.getCustomerAppointments,
      userDetails?.clerkId ? { customerId: userDetails.clerkId, limit: 5 } : "skip",
    ) || []

  const vehicles =
    useQuery(
      api.customerProfiles.getCustomerVehicles,
      userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
    ) || []

  const recommendedServices =
    useQuery(
      api.recommendations.getRecommendedServices,
      userDetails?.clerkId ? { customerId: userDetails.clerkId, limit: 3 } : "skip",
    ) || []

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

  // Redirect if not a customer
  if (userDetails?.role !== "customer") {
    redirect("/role-selection")
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {customerProfile?.name || userDetails?.name || user.firstName}!
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button asChild variant="outline">
            <Link href="/customer/profile">
              <Settings className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/customer/book">
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="vehicles">My Vehicles</TabsTrigger>
          <TabsTrigger value="services">Recommended Services</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Appointments</CardTitle>
              <CardDescription>Upcoming and past detailing appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">{appointment.serviceName}</p>
                        <p className="text-sm text-muted-foreground">{appointment.businessName}</p>
                        <p className="text-sm">
                          {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                        </p>
                        <div className="flex items-center mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                          <span className="text-xs text-muted-foreground">{appointment.duration} min</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/customer/appointments/${appointment._id}`}>View Details</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No appointments scheduled</p>
                  <Button className="mt-2" asChild>
                    <Link href="/customer/book">Book an Appointment</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Vehicles</CardTitle>
                <CardDescription>Manage your registered vehicles</CardDescription>
              </div>
              <Button asChild>
                <Link href="/customer/vehicles/new">Add Vehicle</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {vehicles.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle._id} className="overflow-hidden">
                      <div className="aspect-video relative bg-muted">
                        <Image
                          src={`/abstract-geometric-shapes.png?height=200&width=400&query=${vehicle.make}+${vehicle.model}+${vehicle.year}+car`}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-sm text-muted-foreground">{vehicle.color || "N/A"}</p>
                        {vehicle.licensePlate && <p className="text-sm mt-1">License: {vehicle.licensePlate}</p>}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/customer/vehicles/${vehicle._id}`}>Edit</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/customer/vehicles/${vehicle._id}/history`}>Service History</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No vehicles added yet</p>
                  <Button className="mt-2" asChild>
                    <Link href="/customer/vehicles/new">Add Vehicle</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Services</CardTitle>
              <CardDescription>Personalized detailing recommendations for your vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendedServices.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendedServices.map((service) => (
                    <Card key={service._id} className="overflow-hidden">
                      <div className="aspect-video relative bg-muted">
                        <Image
                          src={
                            service.imageUrl ||
                            `/placeholder.svg?height=200&width=400&query=car+detailing+${service.name}`
                          }
                          alt={service.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold">{service.name}</h3>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                            <span className="text-sm">{service.rating || "4.5"}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-medium">${service.price.toFixed(2)}</p>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="text-xs text-muted-foreground">{service.duration} min</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button className="w-full" asChild>
                          <Link href={`/customer/book?service=${service._id}`}>Book Now</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No recommended services available</p>
                  <Button className="mt-2" asChild>
                    <Link href="/customer/services">Browse All Services</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
