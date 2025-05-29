"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import type { ServiceFormData } from "@/types/service"
import type { Id } from "@/convex/_generated/dataModel"
import { PlusCircle, X, ImageIcon, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ServiceFormProps {
  serviceId?: string
  isEdit?: boolean
}

export default function ServiceForm({ serviceId, isEdit = false }: ServiceFormProps) {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    price: 0,
    duration: 60,
    category: undefined,
    features: [],
    isActive: true,
  })

  const [newFeature, setNewFeature] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get service categories
  const categories = useQuery(api.serviceManagement.getServiceCategories) || []

  // Get service details if editing
  const serviceDetails = useQuery(
    api.serviceManagement.getServicePackageById,
    serviceId ? { serviceId: serviceId as Id<"servicePackages"> } : "skip",
  )

  // Mutations
  const createService = useMutation(api.serviceManagement.createServicePackage)
  const updateService = useMutation(api.serviceManagement.updateServicePackage)

  // Load service data if editing
  useEffect(() => {
    if (isEdit && serviceDetails) {
      setFormData({
        name: serviceDetails.name,
        description: serviceDetails.description,
        price: serviceDetails.price,
        duration: serviceDetails.duration,
        category: serviceDetails.category,
        imageUrl: serviceDetails.imageUrl,
        features: serviceDetails.features || [],
        isActive: serviceDetails.isActive,
      })
    }
  }, [isEdit, serviceDetails])

  // Loading state
  if (!isUserLoaded || !userDetails || (isEdit && !serviceDetails)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number.parseFloat(value) : value,
    }))
  }

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }))
  }

  // Handle active status toggle
  const handleActiveToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isActive: checked,
    }))
  }

  // Add a feature
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()],
      }))
      setNewFeature("")
    }
  }

  // Remove a feature
  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index),
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isEdit && serviceId) {
        await updateService({
          serviceId: serviceId as Id<"servicePackages">,
          ...formData,
        })

        toast({
          title: "Service updated",
          description: "Your service has been successfully updated.",
        })
      } else {
        await createService(formData)

        toast({
          title: "Service created",
          description: "Your new service has been successfully added to the catalog.",
        })
      }

      // Redirect back to services page
      router.push("/business/services")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save service",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/business/services">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Service" : "Add New Service"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Update your service details to keep your offerings current"
              : "Create a new service to add to your detailing catalog"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Premium Exterior Detail"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this service includes and its benefits..."
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Pricing and Duration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pricing and Duration</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Service Features</h3>
              <p className="text-sm text-muted-foreground">Add specific features or steps included in this service</p>

              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="e.g., Hand wash with pH-neutral soap"
                  className="flex-1"
                />
                <Button type="button" onClick={addFeature}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {formData.features && formData.features.length > 0 && (
                <div className="space-y-2 mt-2">
                  <Label>Features List</Label>
                  <div className="border rounded-md p-4">
                    <ul className="space-y-2">
                      {formData.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <span>{feature}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl || ""}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
                <Button type="button" variant="outline" className="flex-shrink-0">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Enter a URL for an image that represents this service</p>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive} onCheckedChange={handleActiveToggle} />
              <Label htmlFor="isActive">
                {formData.isActive ? "Service is active and visible to customers" : "Service is inactive and hidden"}
              </Label>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" asChild>
              <Link href="/business/services">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? "Update Service" : "Create Service"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
