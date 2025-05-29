"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Id } from "@/convex/_generated/dataModel"

interface ServiceCatalogWidgetProps {
  businessId?: Id<"businessProfiles">
  limit?: number
  showViewAll?: boolean
  title?: string
  description?: string
  category?: string
}

export default function ServiceCatalogWidget({
  businessId,
  limit = 3,
  showViewAll = true,
  title = "Our Services",
  description = "Explore our range of auto detailing services",
  category,
}: ServiceCatalogWidgetProps) {
  // Fetch services
  const services =
    useQuery(
      businessId ? api.serviceManagement.getBusinessServicePackages : api.services.getAllServicePackages,
      businessId ? { businessId, activeOnly: true } : { activeOnly: true },
    ) || []

  // Filter by category if specified
  const filteredServices = category ? services.filter((service) => service.category === category) : services

  // Limit the number of services shown
  const displayedServices = filteredServices.slice(0, limit)

  // Loading state
  if (!services) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
                  <h3 className="font-bold mb-1">{service.name}</h3>
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
      {showViewAll && displayedServices.length > 0 && (
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href={businessId ? `/business/${businessId}/services` : "/services"}>
              View All Services
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
