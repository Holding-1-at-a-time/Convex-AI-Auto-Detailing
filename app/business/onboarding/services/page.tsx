"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Save, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function ServicesPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const servicePackages = useQuery(api.services.getAllServicePackages, {})
  const createServicePackage = useMutation(api.services.createServicePackage)
  const updateServicePackage = useMutation(api.services.updateServicePackage)
  const updateBusinessProfile = useMutation(api.businessProfiles.updateBusinessProfile)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [selectedServices, setSelectedServices] = useState([])

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    category: "standard",
    services: [],
    price: 0,
    duration: 60,
  })

  const [shouldRedirect, setShouldRedirect] = useState(null)

  useEffect(() => {
    if (!isUserLoaded) return

    if (!user) {
      setShouldRedirect("/sign-in")
      return
    }

    if (userDetails?.role !== "business") {
      setShouldRedirect("/role-selection")
      return
    }

    if (!businessProfile) {
      setShouldRedirect("/business/onboarding/profile")
      return
    }

    setShouldRedirect(null)
  }, [isUserLoaded, user, userDetails, businessProfile])

  useEffect(() => {
    if (businessProfile && businessProfile.servicesOffered) {
      setSelectedServices(businessProfile.servicesOffered)
    }
  }, [businessProfile])

  if (shouldRedirect) {
    redirect(shouldRedirect)
    return null
  }

  // Loading state
  if (!isUserLoaded || userDetails === undefined || businessProfile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const handleServiceFormChange = (e) => {
    const { name, value } = e.target
    setServiceForm((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }))
  }

  const handleServiceSelectChange = (name, value) => {
    setServiceForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddService = () => {
    setEditingService(null)
    setServiceForm({
      name: "",
      description: "",
      category: "standard",
      services: [],
      price: 0,
      duration: 60,
    })
    setIsDialogOpen(true)
  }

  const handleEditService = (service) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description,
      category: service.category,
      services: service.services,
      price: service.price,
      duration: service.duration,
    })
    setIsDialogOpen(true)
  }

  const handleServiceSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingService) {
        // Update existing service
        await updateServicePackage({
          packageId: editingService._id,
          ...serviceForm,
        })
        toast({
          title: "Service Updated",
          description: "Your service package has been updated successfully.",
        })
      } else {
        // Create new service
        await createServicePackage(serviceForm)
        toast({
          title: "Service Created",
          description: "Your service package has been created successfully.",
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving the service.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectServicePackage = (packageId, isSelected) => {
    if (isSelected) {
      // Add to selected services
      const serviceToAdd = servicePackages.find((pkg) => pkg._id === packageId)
      if (serviceToAdd && !selectedServices.includes(serviceToAdd.name)) {
        setSelectedServices([...selectedServices, serviceToAdd.name])
      }
    } else {
      // Remove from selected services
      const serviceToRemove = servicePackages.find((pkg) => pkg._id === packageId)
      if (serviceToRemove) {
        setSelectedServices(selectedServices.filter((name) => name !== serviceToRemove.name))
      }
    }
  }

  const handleSaveAndContinue = async () => {
    setIsSubmitting(true)

    try {
      // Update business profile with selected services
      await updateBusinessProfile({
        profileId: businessProfile._id,
        servicesOffered: selectedServices,
      })

      toast({
        title: "Services Saved",
        description: "Your service offerings have been saved successfully.",
      })

      // Navigate to the next step
      router.push("/business/onboarding/availability")
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving your services.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Management</CardTitle>
          <CardDescription>Add and manage your detailing service packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-medium">Available Service Packages</h3>
            <Button onClick={handleAddService} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add New Service
            </Button>
          </div>

          {servicePackages?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicePackages.map((service) => (
                  <TableRow key={service._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.name)}
                        onChange={(e) => handleSelectServicePackage(service._id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          service.category === "premium"
                            ? "default"
                            : service.category === "standard"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell>${service.price}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditService(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No service packages found</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddService}>
                  Add Your First Service
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-2 text-lg font-medium">Selected Services</h3>
            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((serviceName) => (
                  <Badge key={serviceName} variant="secondary" className="text-sm">
                    {serviceName}
                    <button
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedServices(selectedServices.filter((name) => name !== serviceName))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No services selected. Please select at least one service to continue.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.push("/business/onboarding/profile")}>
            Back
          </Button>
          <Button onClick={handleSaveAndContinue} disabled={isSubmitting || selectedServices.length === 0}>
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Service Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service Package" : "Add Service Package"}</DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the details of your service package"
                : "Create a new service package for your customers"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleServiceSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={serviceForm.name}
                  onChange={handleServiceFormChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={serviceForm.category}
                  onValueChange={(value) => handleServiceSelectChange("category", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Base Price ($)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={handleServiceFormChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration (min)
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={serviceForm.duration}
                  onChange={handleServiceFormChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={serviceForm.description}
                  onChange={handleServiceFormChange}
                  className="col-span-3"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="services" className="text-right">
                  Included Services
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="services"
                    name="servicesText"
                    placeholder="Enter services included, one per line (e.g., Exterior Wash, Interior Vacuum, etc.)"
                    value={serviceForm.services.join("\n")}
                    onChange={(e) => {
                      const servicesArray = e.target.value.split("\n").filter((s) => s.trim() !== "")
                      setServiceForm((prev) => ({ ...prev, services: servicesArray }))
                    }}
                    className="mb-2"
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-1">
                    {serviceForm.services.map((service, index) => (
                      <Badge key={index} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingService ? "Update Service" : "Add Service"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
