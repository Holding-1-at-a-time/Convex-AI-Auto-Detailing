"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import type { ServiceBundleFormData } from "@/types/service-bundle"
import type { Id } from "@/convex/_generated/dataModel"
import { Save, ArrowLeft, DollarSign, Percent, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface BundleFormProps {
  bundleId?: string
  isEdit?: boolean
}

export default function BundleForm({ bundleId, isEdit = false }: BundleFormProps) {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()

  // Form state
  const [formData, setFormData] = useState<ServiceBundleFormData>({
    name: "",
    description: "",
    serviceIds: [],
    discountType: "percentage",
    discountValue: 10,
    isActive: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get business profile
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  // Get available services
  const services =
    useQuery(
      api.serviceManagement.getBusinessServicePackages,
      businessProfile?._id ? { businessId: businessProfile._id, activeOnly: true } : "skip",
    ) || []

  // Get bundle details if editing
  const bundleDetails = useQuery(
    api.serviceBundles.getBundleById,
    bundleId ? { bundleId: bundleId as Id<"serviceBundles"> } : "skip",
  )

  // Mutations
  const createBundle = useMutation(api.serviceBundles.createServiceBundle)
  const updateBundle = useMutation(api.serviceBundles.updateServiceBundle)

  // Load bundle data if editing
  useEffect(() => {
    if (isEdit && bundleDetails) {
      setFormData({
        name: bundleDetails.name,
        description: bundleDetails.description,
        serviceIds: bundleDetails.serviceIds,
        discountType: bundleDetails.discountType,
        discountValue: bundleDetails.discountValue,
        imageUrl: bundleDetails.imageUrl,
        isActive: bundleDetails.isActive,
        validFrom: bundleDetails.validFrom,
        validUntil: bundleDetails.validUntil,
        maxRedemptions: bundleDetails.maxRedemptions,
      })
    }
  }, [isEdit, bundleDetails])

  // Loading state
  if (!isUserLoaded || !userDetails || !businessProfile || (isEdit && !bundleDetails)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Calculate bundle preview
  const selectedServices = services.filter((service) => formData.serviceIds.includes(service._id))
  const originalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)

  let discountedPrice: number
  if (formData.discountType === "percentage") {
    discountedPrice = originalPrice * (1 - formData.discountValue / 100)
  } else {
    discountedPrice = originalPrice - formData.discountValue
  }
  discountedPrice = Math.max(0, discountedPrice)

  const savings = originalPrice - discountedPrice
  const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "discountValue" || name === "maxRedemptions" ? Number.parseFloat(value) : value,
    }))
  }

  // Handle service selection
  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.serviceIds.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 services for the bundle",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit && bundleId) {
        await updateBundle({
          bundleId: bundleId as Id<"serviceBundles">,
          ...formData,
        })

        toast({
          title: "Bundle updated",
          description: "Your service bundle has been successfully updated.",
        })
      } else {
        await createBundle(formData)

        toast({
          title: "Bundle created",
          description: "Your new service bundle has been successfully created.",
        })
      }

      // Redirect back to bundles page
      router.push("/business/bundles")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bundle",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/business/bundles">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bundles
        </Link>
      </Button>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEdit ? "Edit Bundle" : "Create Service Bundle"}</CardTitle>
                <CardDescription>
                  {isEdit
                    ? "Update your service bundle details"
                    : "Create a discounted package by bundling multiple services"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-2">
                  <Label htmlFor="name">Bundle Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Complete Car Care Package"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what this bundle includes and its benefits..."
                    rows={4}
                    required
                  />
                </div>

                {/* Discount Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Discount Settings</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <Select
                        value={formData.discountType}
                        onValueChange={(value: "percentage" | "fixed") =>
                          setFormData((prev) => ({ ...prev, discountType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            <div className="flex items-center">
                              <Percent className="h-4 w-4 mr-2" />
                              Percentage
                            </div>
                          </SelectItem>
                          <SelectItem value="fixed">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              Fixed Amount
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Discount Value {formData.discountType === "percentage" ? "(%)" : "($)"}
                      </Label>
                      <Input
                        id="discountValue"
                        name="discountValue"
                        type="number"
                        min="0"
                        max={formData.discountType === "percentage" ? "100" : undefined}
                        step={formData.discountType === "percentage" ? "1" : "0.01"}
                        value={formData.discountValue}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Validity Period */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Validity Period (Optional)</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Valid From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.validFrom && "text-muted-foreground",
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.validFrom ? format(new Date(formData.validFrom), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.validFrom ? new Date(formData.validFrom) : undefined}
                            onSelect={(date) =>
                              setFormData((prev) => ({
                                ...prev,
                                validFrom: date ? date.toISOString() : undefined,
                              }))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Valid Until</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.validUntil && "text-muted-foreground",
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.validUntil ? format(new Date(formData.validUntil), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.validUntil ? new Date(formData.validUntil) : undefined}
                            onSelect={(date) =>
                              setFormData((prev) => ({
                                ...prev,
                                validUntil: date ? date.toISOString() : undefined,
                              }))
                            }
                            disabled={(date) =>
                              date < new Date() || (formData.validFrom ? date < new Date(formData.validFrom) : false)
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxRedemptions">Maximum Redemptions (Optional)</Label>
                    <Input
                      id="maxRedemptions"
                      name="maxRedemptions"
                      type="number"
                      min="1"
                      value={formData.maxRedemptions || ""}
                      onChange={handleInputChange}
                      placeholder="Leave empty for unlimited"
                    />
                    <p className="text-xs text-muted-foreground">Limit how many times this bundle can be purchased</p>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">
                    {formData.isActive ? "Bundle is active and visible to customers" : "Bundle is inactive and hidden"}
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Service Selection and Preview */}
          <div className="space-y-6">
            {/* Service Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Services *</CardTitle>
                <CardDescription>Choose at least 2 services to include in this bundle</CardDescription>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {services.map((service) => (
                      <div
                        key={service._id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <Checkbox
                          id={service._id}
                          checked={formData.serviceIds.includes(service._id)}
                          onCheckedChange={() => handleServiceToggle(service._id)}
                        />
                        <Label htmlFor={service._id} className="flex-1 cursor-pointer space-y-1">
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${service.price.toFixed(2)} • {service.duration} min
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No services available. Please create services first.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Bundle Preview */}
            {selectedServices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bundle Preview</CardTitle>
                  <CardDescription>See how your bundle will appear to customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Included Services:</h4>
                    <ul className="space-y-1">
                      {selectedServices.map((service) => (
                        <li key={service._id} className="text-sm flex justify-between">
                          <span>{service.name}</span>
                          <span>${service.price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Original Price:</span>
                      <span>${originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>
                        -
                        {formData.discountType === "percentage"
                          ? `${formData.discountValue}%`
                          : `$${formData.discountValue}`}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Bundle Price:</span>
                      <span>${discountedPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Customer Saves:</span>
                      <span>
                        ${savings.toFixed(2)} ({savingsPercentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Total Duration: {totalDuration} minutes
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/business/bundles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || formData.serviceIds.length < 2}>
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? "Update Bundle" : "Create Bundle"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
