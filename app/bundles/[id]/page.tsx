"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Package, Clock, ArrowLeft, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"

export default function BundleDetailPage() {
  const params = useParams()
  const bundleId = params.id as string

  // Fetch bundle details
  const bundle = useQuery(api.serviceBundles.getBundleById, { bundleId })

  // Calculate savings
  const savings = useQuery(api.serviceBundles.calculateBundleSavings, bundle ? { bundleId } : "skip")

  // Loading state
  if (!bundle || !savings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if bundle is still valid
  const now = new Date()
  const isExpired = bundle.validUntil && new Date(bundle.validUntil) < now
  const isSoldOut = bundle.maxRedemptions && bundle.currentRedemptions >= bundle.maxRedemptions
  const isNotStarted = bundle.validFrom && new Date(bundle.validFrom) > now

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/services">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bundle Header */}
          <Card>
            <div className="aspect-video relative">
              <Image
                src={bundle.imageUrl || `/placeholder.svg?height=400&width=800&query=car+detailing+bundle`}
                alt={bundle.name}
                fill
                className="object-cover rounded-t-lg"
              />
              <div className="absolute top-4 right-4">
                <Badge className="bg-red-500 text-white text-lg px-3 py-1">
                  {bundle.discountType === "percentage" ? (
                    <>{bundle.discountValue}% OFF</>
                  ) : (
                    <>${bundle.discountValue} OFF</>
                  )}
                </Badge>
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{bundle.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{bundle.description}</CardDescription>
                </div>
                <Badge variant="outline" className="text-lg">
                  <Package className="h-4 w-4 mr-1" />
                  {bundle.serviceIds.length} Services
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Included Services */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
              <CardDescription>All services included in this bundle package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bundle.services.map((service, index) => (
                  <div key={service._id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">Regular Price: ${service.price.toFixed(2)}</span>
                        <span className="text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {service.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bundle Terms */}
          {(bundle.validFrom || bundle.validUntil || bundle.maxRedemptions) && (
            <Card>
              <CardHeader>
                <CardTitle>Bundle Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bundle.validFrom && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Valid from: {format(new Date(bundle.validFrom), "MMMM d, yyyy")}</span>
                  </div>
                )}
                {bundle.validUntil && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Valid until: {format(new Date(bundle.validUntil), "MMMM d, yyyy")}</span>
                  </div>
                )}
                {bundle.maxRedemptions && (
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Limited availability: {bundle.maxRedemptions - bundle.currentRedemptions} remaining</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Pricing and Booking */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Bundle Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Price:</span>
                  <span className="line-through text-muted-foreground">${savings.originalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-green-600">
                    -{bundle.discountType === "percentage" ? `${bundle.discountValue}%` : `$${bundle.discountValue}`}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Bundle Price:</span>
                    <span className="text-2xl font-bold">${bundle.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">You Save:</span>
                  <span className="text-lg font-bold text-green-800 dark:text-green-200">
                    ${savings.savings.toFixed(2)} ({savings.savingsPercentage}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <span>Total Duration: {bundle.totalDuration} minutes</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking Widget or Status Message */}
          {isExpired ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <h3 className="font-medium text-lg mb-1">Bundle Expired</h3>
                  <p className="text-sm text-muted-foreground">
                    This bundle offer has expired and is no longer available for booking.
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/services">Explore Other Services</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isSoldOut ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <h3 className="font-medium text-lg mb-1">Bundle Sold Out</h3>
                  <p className="text-sm text-muted-foreground">
                    This bundle offer is fully redeemed and no longer available.
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/services">Explore Other Services</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isNotStarted ? (
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="font-medium text-lg mb-1">Bundle Not Yet Active</h3>
                  <p className="text-sm text-muted-foreground">
                    This bundle offer will be available from {format(new Date(bundle.validFrom!), "MMMM d, yyyy")}.
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/services">Explore Other Services</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Book This Bundle</CardTitle>
                <CardDescription>Schedule your appointment for this amazing package deal.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* TODO: Integrate with a bundle-specific booking form or process */}
                <Button className="w-full" size="lg" asChild>
                  {/* This should link to a booking page that can handle bundles */}
                  <Link href={`/book?bundleId=${bundle._id}`}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Bundle Now
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  You'll be able to select your preferred date and time on the next page.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
