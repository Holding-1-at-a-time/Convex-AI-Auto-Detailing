"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, Search, Star, Filter, Car, Armchair, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { ServiceCategory } from "@/types/service"

export default function ServiceCatalogPage() {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 240])
  const [showFilters, setShowFilters] = useState(false)

  // Fetch service categories
  const categories = useQuery(api.serviceManagement.getServiceCategories) || []

  // Fetch services with filters
  const services =
    useQuery(api.serviceManagement.searchServices, {
      query: searchQuery,
      category: selectedCategory,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minDuration: durationRange[0],
      maxDuration: durationRange[1],
    }) || []

  // Get all services for initial load
  const allServices = useQuery(api.services.getAllServicePackages, { activeOnly: true }) || []

  // Loading state
  if (!categories || !services) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Get icon component for category
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case "car":
        return <Car className="h-5 w-5" />
      case "armchair":
        return <Armchair className="h-5 w-5" />
      case "sparkles":
        return <Sparkles className="h-5 w-5" />
      default:
        return <Star className="h-5 w-5" />
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Catalog</h1>
          <p className="text-muted-foreground">Browse our comprehensive range of auto detailing services</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="sm:w-auto w-full">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={undefined}>All Categories</SelectItem>
                    {categories.map((category: ServiceCategory) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center">
                          {getCategoryIcon(category.icon)}
                          <span className="ml-2">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Price Range</label>
                <div className="pt-6 px-2">
                  <Slider
                    defaultValue={[0, 500]}
                    max={500}
                    step={10}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <div className="pt-6 px-2">
                  <Slider
                    defaultValue={[0, 240]}
                    max={240}
                    step={15}
                    value={durationRange}
                    onValueChange={(value) => setDurationRange(value as [number, number])}
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>{durationRange[0]}min</span>
                    <span>{durationRange[1]}min</span>
                  </div>
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory(undefined)
                    setPriceRange([0, 500])
                    setDurationRange([0, 240])
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Service Categories Tabs */}
      <Tabs defaultValue="all" className="w-full mb-8">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="all" className="mb-1">
            All Services
          </TabsTrigger>
          {categories.map((category: ServiceCategory) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="mb-1"
              onClick={() => setSelectedCategory(category.id)}
            >
              <div className="flex items-center">
                {getCategoryIcon(category.icon)}
                <span className="ml-2">{category.name}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.length > 0 ? (
              services.map((service) => <ServiceCard key={service._id} service={service} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No services found matching your criteria.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory(undefined)
                    setPriceRange([0, 500])
                    setDurationRange([0, 240])
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {categories.map((category: ServiceCategory) => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((service) => service.category === category.id)
                .map((service) => (
                  <ServiceCard key={service._id} service={service} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ServiceCard({ service }: { service: any }) {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="aspect-video relative bg-muted">
        <Image
          src={service.imageUrl || `/placeholder.svg?height=200&width=400&query=car+detailing+${service.name}`}
          alt={service.name}
          fill
          className="object-cover"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{service.name}</CardTitle>
          <Badge variant="secondary">
            <DollarSign className="h-3 w-3 mr-1" />
            {service.price.toFixed(2)}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          <span>{service.duration} minutes</span>
        </div>
        {service.features && service.features.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium mb-1">Includes:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {service.features.slice(0, 3).map((feature: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{feature}</span>
                </li>
              ))}
              {service.features.length > 3 && (
                <li className="text-sm text-muted-foreground">+ {service.features.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/services/${service._id}`}>View Details</Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link href={`/customer/book?service=${service._id}`}>Book Now</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
