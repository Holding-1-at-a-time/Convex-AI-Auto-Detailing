"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Search, Clock, DollarSign, Star, Info } from "lucide-react"

export default function CustomerServiceExploration() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const servicePackages = useQuery(api.services.getAllServicePackages, { activeOnly: true })

  // Loading state
  if (!isUserLoaded || userDetails === undefined || servicePackages === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter services based on search query and active tab
  const filteredServices = servicePackages.filter((service) => {
    const matchesSearch =
      searchQuery === "" ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeTab === "all" || service.category === activeTab

    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(servicePackages.map((service) => service.category)))

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Explore Our Services</h2>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Services</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredServices.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredServices.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => router.push("/customer/onboarding/vehicles")}>
          Back
        </Button>
        <Button onClick={() => router.push("/customer/onboarding/booking")}>Continue</Button>
      </div>
    </div>
  )
}

function ServiceCard({ service }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle>{service.name}</CardTitle>
            <CardDescription>{service.category.charAt(0).toUpperCase() + service.category.slice(1)}</CardDescription>
          </div>
          <Badge variant={getBadgeVariant(service.category)}>{service.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{service.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            {formatDuration(service.duration)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="mr-1 h-4 w-4" />${service.price.toFixed(2)}
          </div>
          {service.popularityRank && service.popularityRank <= 3 && (
            <div className="flex items-center text-sm text-amber-500">
              <Star className="mr-1 h-4 w-4" />
              Popular
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          <Info className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
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
