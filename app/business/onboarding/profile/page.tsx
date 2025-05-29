"use client"

import { useState } from "react"
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

export default function BusinessProfilePage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?.clerkId ? { userId: userDetails.clerkId } : "skip",
  )

  const createProfile = useMutation(api.businessProfiles.createBusinessProfile)
  const updateProfile = useMutation(api.businessProfiles.updateBusinessProfile)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    businessName: businessProfile?.businessName || "",
    businessType: businessProfile?.businessType || "fixed_location",
    address: businessProfile?.address || "",
    city: businessProfile?.city || "",
    state: businessProfile?.state || "",
    zipCode: businessProfile?.zipCode || "",
    phone: businessProfile?.phone || "",
    email: businessProfile?.email || user?.primaryEmailAddress?.emailAddress || "",
    website: businessProfile?.website || "",
    description: businessProfile?.description || "",
    foundedYear: businessProfile?.foundedYear || new Date().getFullYear(),
    employeeCount: businessProfile?.employeeCount || 1,
  })

  // Loading state
  if (!isUserLoaded || userDetails === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Redirect if not logged in
  if (!user) {
    redirect("/sign-in")
    return null
  }

  // Redirect if not a business
  if (userDetails?.role !== "business") {
    redirect("/role-selection")
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (businessProfile) {
        // Update existing profile
        await updateProfile({
          profileId: businessProfile._id,
          ...formData,
        })
        toast({
          title: "Profile Updated",
          description: "Your business profile has been updated successfully.",
        })
      } else {
        // Create new profile
        await createProfile({
          userId: userDetails.clerkId,
          ...formData,
        })
        toast({
          title: "Profile Created",
          description: "Your business profile has been created successfully.",
        })
      }

      // Navigate to the next step
      router.push("/business/onboarding/services")
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving your profile.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>Provide information about your auto detailing business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => handleSelectChange("businessType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile Detailing</SelectItem>
                  <SelectItem value="fixed_location">Fixed Location</SelectItem>
                  <SelectItem value="both">Both Mobile & Fixed Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required={formData.businessType !== "mobile"}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" value={formData.state} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell customers about your business and what makes your detailing services special..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="foundedYear">Year Founded</Label>
                <Input
                  id="foundedYear"
                  name="foundedYear"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.foundedYear}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="employeeCount">Number of Employees</Label>
                <Input
                  id="employeeCount"
                  name="employeeCount"
                  type="number"
                  min="1"
                  value={formData.employeeCount}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.push("/business/onboarding")}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
    </form>
  )
}
