"use client"

import { useState, useEffect } from "react"
import { useAction, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, DollarSign, Star, Shield, Sparkles, ChevronRight } from "lucide-react"
import Link from "next/link"

export function VehicleRecommendations({ vehicleId, limit = 6, showTabs = true, className = "" }) {
  const [activeTab, setActiveTab] = useState("services")
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Get vehicle details
  const vehicle = useQuery(api.vehicles.getVehicle, { vehicleId })

  // Get recommendations actions
  const getServiceRecommendations = useAction(api.search.getServiceRecommendations)
  const getVehicleRecommendations = useAction(api.search.getVehicleRecommendations)

  // Load recommendations when vehicle data is available
  useEffect(() => {
    if (!vehicle) return

    const loadRecommendations = async () => {
      setIsLoading(true)
      try {
        if (activeTab === "services") {
          const services = await getServiceRecommendations({
            vehicleId,
            limit,
          })
          setRecommendations(services)
        } else {
          const products = await getVehicleRecommendations({
            vehicleId,
            limit,
          })
          setRecommendations(products)
        }
      } catch (error) {
        console.error("Error loading recommendations:", error)
        setRecommendations([])
      } finally {
        setIsLoading(false)
      }
    }

    loadRecommendations()
  }, [vehicle, activeTab, vehicleId])

  if (!vehicle) {
    return (
      <div className="flex h-40 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">
          Recommendations for Your {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        <p className="text-muted-foreground">
          Personalized recommendations based on your vehicle's make, model, and condition
        </p>
      </div>

      {showTabs && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="services">Recommended Services</TabsTrigger>
            <TabsTrigger value="products">Recommended Products</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">No recommendations available</p>
            <p className="text-sm text-muted-foreground">
              We're still learning about your {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((item) => (
            <Card key={item._id} className="overflow-hidden">
              {activeTab === "services" ? (
                <ServiceRecommendation service={item} vehicle={vehicle} />
              ) : (
                <ProductRecommendation product={item} vehicle={vehicle} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceRecommendation({ service, vehicle }) {
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{service.name}</CardTitle>
          <Badge variant={getBadgeVariant(service.category)}>{service.category}</Badge>
        </div>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatDuration(service.duration)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${service.price.toFixed(2)}</span>
            </div>
          </div>

          {service.recommendationReason && (
            <div className="rounded-md bg-muted p-2 text-sm">
              <p className="font-medium">Why we recommend this:</p>
              <p className="text-muted-foreground">{service.recommendationReason}</p>
            </div>
          )}

          {service.benefits && (
            <div className="space-y-1">
              {service.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Shield className="mt-0.5 h-3 w-3 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 px-6 py-3">
        <Button className="w-full" asChild>
          <Link href={`/customer/book?service=${service._id}&vehicle=${vehicle._id}`}>Book This Service</Link>
        </Button>
      </CardFooter>
    </>
  )
}

function ProductRecommendation({ product, vehicle }) {
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <Badge variant="outline">{product.category}</Badge>
        </div>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-amber-500" />
              <span>
                {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
            <div className="font-bold">${product.price.toFixed(2)}</div>
          </div>

          {product.recommendationReason && (
            <div className="rounded-md bg-muted p-2 text-sm">
              <p className="font-medium">
                Perfect for your {vehicle.make} {vehicle.model}:
              </p>
              <p className="text-muted-foreground">{product.recommendationReason}</p>
            </div>
          )}

          {product.features && (
            <div className="space-y-1">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Sparkles className="mt-0.5 h-3 w-3 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 px-6 py-3">
        <Button className="w-full" variant="outline">
          View Product Details
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </>
  )
}

// Helper functions
function getBadgeVariant(category) {
  switch (category) {
    case "basic":
      return "secondary"
    case "standard":
      return "default"
    case "premium":
      return "destructive"
    case "custom":
      return "outline"
    default:
      return "default"
  }
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}
