"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Package, Clock, ChevronRight, Sparkles, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"

interface ServiceBundlesDisplayProps {
  limit?: number
  businessId?: string
}

export default function ServiceBundlesDisplay({ limit, businessId }: ServiceBundlesDisplayProps) {
  // Fetch bundles
  const bundles =
    useQuery(
      businessId ? api.serviceBundles.getBusinessBundles : api.serviceBundles.getActiveBundles,
      businessId ? { businessId, activeOnly: true } : { limit },
    ) || []

  // Loading state
  if (!bundles) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (bundles.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Special Bundle Offers
          </h2>
          <p className="text-muted-foreground">Save more with our discounted service packages</p>
        </div>
        {!limit && (
          <Button variant="outline" asChild>
            <Link href="/bundles">
              View All Bundles
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => {
          // Calculate savings for display
          const originalPrice = bundle.serviceIds.length * 100 // This would be calculated from actual services
          const savings = originalPrice - bundle.totalPrice
          const savingsPercentage = (savings / originalPrice) * 100

          return (
            <Card key={bundle._id} className="overflow-hidden relative">
              {/* Discount Badge */}
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-red-500 text-white">
                  {bundle.discountType === "percentage" ? (
                    <>{bundle.discountValue}% OFF</>
                  ) : (
                    <>${bundle.discountValue} OFF</>
                  )}
                </Badge>
              </div>

              {/* Bundle Image */}
              <div className="aspect-video relative bg-muted">
                <Image
                  src={bundle.imageUrl || `/placeholder.svg?height=200&width=400&query=car+detailing+bundle`}
                  alt={bundle.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold">{bundle.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">{bundle.serviceIds.length} services included</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{bundle.description}</p>

                {/* Bundle Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bundle Price:</span>
                    <span className="text-2xl font-bold">${bundle.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">You Save:</span>
                    <span className="text-green-600 font-medium">
                      ${savings.toFixed(2)} ({savingsPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{bundle.totalDuration} minutes total</span>
                  </div>
                </div>

                {/* Validity Info */}
                {(bundle.validUntil || bundle.maxRedemptions) && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {bundle.validUntil && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Valid until {format(new Date(bundle.validUntil), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {bundle.maxRedemptions && (
                      <div className="text-xs text-muted-foreground">
                        {bundle.maxRedemptions - bundle.currentRedemptions} left
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button className="w-full" asChild>
                  <Link href={`/bundles/${bundle._id}`}>
                    View Bundle Details
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
