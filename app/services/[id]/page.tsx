"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, Calendar, CheckCircle, ArrowLeft, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useUser } from "@clerk/nextjs"
import { useState } from "react"

export default function ServiceDetailPage() {
  const params = useParams()
  const serviceId = params.id as string
  const { user, isLoaded: isUserLoaded } = useUser()
  const [activeTab, setActiveTab] = useState("details")

  // Fetch service details
  const service = useQuery(api.serviceManagement.getServicePackageById, {
    serviceId,
  })

  // Fetch business details
  const businessId = service?.businessId
  const business = businessId
    ? useQuery(api.businessProfiles.getBusinessProfileById, {
        businessId: businessId,
      })
    : null

  // Fetch reviews for this service
  const reviews =
    useQuery(api.feedback.getServiceFeedback, {
      serviceId,
    }) || []

  // Loading state
  if (!service || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Calculate average rating
  const averageRating =
    reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Link>
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Service Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={service.imageUrl || `/placeholder.svg?height=400&width=600&query=car+detailing+${service.name}`}
              alt={service.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Service Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{service.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Offered by {business.businessName || "Auto Detailing Professional"}
                  </CardDescription>
                </div>
                <Badge className="text-lg px-3 py-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {service.price.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{service.duration} minutes</span>
                </div>
                {reviews.length > 0 && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
                    <span>
                      {averageRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                )}
              </div>

              <p>{service.description}</p>

              {service.features && service.features.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">What's Included:</h3>
                  <ul className="space-y-2">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" asChild>
                <Link href={`/customer/book?service=${service._id}`}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Book This Service
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Tabs for additional information */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="business">About Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Everything you need to know about this service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{service.description}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Duration</h3>
                <p className="text-muted-foreground">
                  This service takes approximately {service.duration} minutes to complete.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Pricing</h3>
                <p className="text-muted-foreground">
                  The base price for this service is ${service.price.toFixed(2)}. Additional costs may apply depending
                  on vehicle size and condition.
                </p>
              </div>

              {service.category && (
                <div>
                  <h3 className="font-medium mb-2">Category</h3>
                  <Badge variant="outline">{service.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
              <CardDescription>See what others are saying about this service</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{review.customerName || "Customer"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p>{review.comment}</p>

                      {review.businessResponse && (
                        <div className="mt-3 pl-4 border-l-2 border-muted">
                          <p className="text-sm font-medium">Response from business:</p>
                          <p className="text-sm text-muted-foreground">{review.businessResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No reviews yet for this service.</p>
                  <p className="text-sm mt-2">Be the first to book and review this service!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{business.businessName || "Business"}</CardTitle>
              <CardDescription>About the service provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {business.description && (
                <div>
                  <h3 className="font-medium mb-2">About</h3>
                  <p className="text-muted-foreground">{business.description}</p>
                </div>
              )}

              {business.address && (
                <div>
                  <h3 className="font-medium mb-2">Location</h3>
                  <p className="text-muted-foreground">
                    {business.address}
                    {business.city && `, ${business.city}`}
                    {business.state && `, ${business.state}`}
                    {business.zip && ` ${business.zip}`}
                  </p>
                </div>
              )}

              {business.phone && (
                <div>
                  <h3 className="font-medium mb-2">Contact</h3>
                  <p className="text-muted-foreground">
                    {business.phone}
                    {business.email && <span className="block">{business.email}</span>}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/business/${business._id}`}>View All Services from this Provider</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
