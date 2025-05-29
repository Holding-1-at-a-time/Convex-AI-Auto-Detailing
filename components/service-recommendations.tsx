"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, Star, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ServiceRecommendationsProps {
  limit?: number
  title?: string
  description?: string
}

export default function ServiceRecommendations({
  limit = 3,
  title = "Recommended Services",
  description = "Personalized service recommendations based on your preferences",
}: ServiceRecommendationsProps) {
  const { user, isLoaded: isUserLoaded } = useUser()

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get recommended services
  const recommendedServices =
    useQuery(
      api.recommendations.getRecommendedServices,
      userDetails?.clerkId ? { customerId: userDetails.clerkId, limit } : "skip",
    ) || []

  // If not logged in or no recommendations, show popular services instead
  const popularServices = useQuery(api.services.getPopularServices, { limit }) || []

  // Loading state
  if (!isUserLoaded || userDetails === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  const displayedServices = recommendedServices.length > 0 ? recommendedServices : popularServices

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {recommendedServices.length > 0 ? description : "Popular auto detailing services you might be interested in"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayedServices.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedServices.map((service) => (
              <Card key={service._id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  <Image
                    src={
                      service.imageUrl || `/placeholder.svg?height=200&width=400&query=car+detailing+${service.name}`
                    }
                    alt={service.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{service.name}</h3>
                    {service.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="text-sm">{service.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge>
                      <DollarSign className="h-3 w-3 mr-1" />
                      {service.price.toFixed(2)}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/services/${service._id}`}>
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No services available at this time.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/services">
            Browse All Services
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
