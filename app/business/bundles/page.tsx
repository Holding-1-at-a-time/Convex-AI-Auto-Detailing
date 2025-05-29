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
import { Package, Plus, Edit, Trash2, AlertTriangle, Search, Percent, DollarSign, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"

export default function BusinessBundlesPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bundleToDelete, setBundleToDelete] = useState<string | null>(null)

  // Get user details
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")

  // Get business profile
  const businessProfile = useQuery(
    api.businessProfiles.getBusinessProfileByUserId,
    userDetails?._id ? { userId: userDetails._id } : "skip",
  )

  // Get bundles
  const bundles =
    useQuery(
      api.serviceBundles.getBusinessBundles,
      businessProfile?._id ? { businessId: businessProfile._id, activeOnly: !showInactive } : "skip",
    ) || []

  // Mutations
  const deleteBundle = useMutation(api.serviceBundles.deleteServiceBundle)
  const updateBundleStatus = useMutation(api.serviceBundles.updateServiceBundle)

  // Loading state
  if (!isUserLoaded || !userDetails || !businessProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter bundles based on search query
  const filteredBundles = bundles.filter(
    (bundle) =>
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle bundle deletion
  const handleDeleteBundle = async () => {
    if (!bundleToDelete) return

    try {
      await deleteBundle({ bundleId: bundleToDelete })
      toast({
        title: "Bundle deleted",
        description: "The service bundle has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete bundle",
        variant: "destructive",
      })
    } finally {
      setBundleToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  // Handle bundle status toggle
  const handleStatusToggle = async (bundleId: string, isActive: boolean) => {
    try {
      await updateBundleStatus({
        bundleId,
        isActive,
      })

      toast({
        title: isActive ? "Bundle activated" : "Bundle deactivated",
        description: `The bundle is now ${isActive ? "visible" : "hidden"} to customers.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bundle status",
        variant: "destructive",
      })
    }
  }

  // Check if bundle is expired
  const isBundleExpired = (bundle: any) => {
    const now = new Date()
    if (bundle.validUntil && new Date(bundle.validUntil) < now) return true
    if (bundle.maxRedemptions && bundle.currentRedemptions >= bundle.maxRedemptions) return true
    return false
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Bundles</h1>
          <p className="text-muted-foreground">Create and manage discounted service packages</p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <Link href="/business/bundles/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Bundle
          </Link>
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bundles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center">
          <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="show-inactive" className="ml-2">
            Show inactive bundles
          </Label>
        </div>
      </div>

      {/* Bundles List */}
      {filteredBundles.length > 0 ? (
        <div className="space-y-4">
          {filteredBundles.map((bundle) => {
            const expired = isBundleExpired(bundle)

            return (
              <Card key={bundle._id} className={!bundle.isActive || expired ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>{bundle.name}</CardTitle>
                      {!bundle.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                      {expired && <Badge variant="destructive">Expired</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {bundle.discountType === "percentage" ? (
                          <>
                            <Percent className="h-3 w-3 mr-1" />
                            {bundle.discountValue}% OFF
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-3 w-3 mr-1" />${bundle.discountValue} OFF
                          </>
                        )}
                      </Badge>
                      <Badge>
                        <DollarSign className="h-3 w-3 mr-1" />
                        {bundle.totalPrice.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">{bundle.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{bundle.totalDuration} minutes total</span>
                    </div>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{bundle.serviceIds.length} services</span>
                    </div>
                    {bundle.validFrom && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>From {format(new Date(bundle.validFrom), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {bundle.validUntil && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>Until {format(new Date(bundle.validUntil), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {bundle.maxRedemptions && (
                      <Badge variant="outline">
                        {bundle.currentRedemptions}/{bundle.maxRedemptions} redeemed
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active-${bundle._id}`}
                      checked={bundle.isActive}
                      onCheckedChange={(checked) => handleStatusToggle(bundle._id, checked)}
                      disabled={expired}
                    />
                    <Label htmlFor={`active-${bundle._id}`} className="text-sm">
                      {bundle.isActive ? "Active" : "Inactive"}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/business/bundles/${bundle._id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBundleToDelete(bundle._id)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Bundles Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "No bundles match your search criteria."
                : "You haven't created any service bundles yet. Create your first bundle to offer discounted packages to customers."}
            </p>
            <Button asChild>
              <Link href="/business/bundles/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Bundle
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bundle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bundle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBundle}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
