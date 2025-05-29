"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Clock, DollarSign, Plus, Edit, Trash2, AlertTriangle, Search, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function BusinessServicesPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [sortField, setSortField] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get business profile
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  // Get services
  const services =
    useQuery(
      api.serviceManagement.getBusinessServicePackages,
      businessProfile?._id ? { businessId: businessProfile._id, activeOnly: !showInactive } : "skip",
    ) || []

  // Get service categories
  const categories = useQuery(api.serviceManagement.getServiceCategories) || []

  // Mutations
  const deleteService = useMutation(api.serviceManagement.deleteServicePackage)
  const updateServiceStatus = useMutation(api.serviceManagement.updateServicePackage)

  // Loading state
  if (!isUserLoaded || !userDetails || !businessProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter services based on search query
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Sort services
  const sortedServices = [...filteredServices].sort((a, b) => {
    let comparison = 0

    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name)
    } else if (sortField === "price") {
      comparison = a.price - b.price
    } else if (sortField === "duration") {
      comparison = a.duration - b.duration
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  // Handle service deletion
  const handleDeleteService = async () => {
    if (!serviceToDelete) return

    try {
      await deleteService({ serviceId: serviceToDelete })
      toast({
        title: "Service deleted",
        description: "The service has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete service",
        variant: "destructive",
      })
    } finally {
      setServiceToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  // Handle service status toggle
  const handleStatusToggle = async (serviceId: string, isActive: boolean) => {
    try {
      await updateServiceStatus({
        serviceId,
        isActive,
      })

      toast({
        title: isActive ? "Service activated" : "Service deactivated",
        description: `The service is now ${isActive ? "visible" : "hidden"} in the catalog.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Manage your auto detailing service offerings</p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <Link href="/business/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Service
          </Link>
        </Button>
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
          <div className="flex gap-2">
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
            >
              <ArrowUpDown className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="flex items-center">
          <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="show-inactive" className="ml-2">
            Show inactive services
          </Label>
        </div>
      </div>

      {/* Services List */}
      {sortedServices.length > 0 ? (
        <div className="space-y-4">
          {sortedServices.map((service) => (
            <Card key={service._id} className={!service.isActive ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle>{service.name}</CardTitle>
                    {!service.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Badge>
                    <DollarSign className="h-3 w-3 mr-1" />
                    {service.price.toFixed(2)}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{service.duration} minutes</span>
                  </div>
                  {service.category && (
                    <Badge variant="outline">
                      {categories.find((c) => c.id === service.category)?.name || service.category}
                    </Badge>
                  )}
                </div>
                {service.features && service.features.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {service.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{service.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`active-${service._id}`}
                    checked={service.isActive}
                    onCheckedChange={(checked) => handleStatusToggle(service._id, checked)}
                  />
                  <Label htmlFor={`active-${service._id}`} className="text-sm">
                    {service.isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/business/services/${service._id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setServiceToDelete(service._id)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Services Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "No services match your search criteria. Try adjusting your filters."
                : "You haven't added any services yet. Get started by adding your first service."}
            </p>
            <Button asChild>
              <Link href="/business/services/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
