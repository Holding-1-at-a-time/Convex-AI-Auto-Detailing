"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingSpinner } from "@/components/loading-spinner"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Gift, Clock, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function LoyaltyProgram() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const userDetails = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip")
  const [activeTab, setActiveTab] = useState("rewards")
  const [selectedReward, setSelectedReward] = useState(null)
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false)

  // Get customer loyalty info
  const loyaltyInfo = useQuery(
    api.loyalty.getCustomerLoyalty,
    userDetails?._id ? { customerId: userDetails._id } : "skip",
  )

  // Get available rewards
  const availableRewards = useQuery(api.loyalty.getLoyaltyRewards, {
    activeOnly: true,
    tierLevel: loyaltyInfo ? getTierLevel(loyaltyInfo.tier) : undefined,
  })

  // Redeem reward mutation
  const redeemReward = useMutation(api.loyalty.redeemReward)

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

  // Redirect if not a customer
  if (userDetails?.role !== "customer") {
    redirect("/role-selection")
    return null
  }

  // Initialize loyalty if it doesn't exist
  if (userDetails && !loyaltyInfo && !loyaltyInfo?.isLoading) {
    // This would typically be handled by a server action or mutation
    // For now, we'll just redirect to a join page
    redirect("/customer/loyalty/join")
    return null
  }

  // Handle reward redemption
  const handleRedeemReward = async () => {
    if (!selectedReward) return

    try {
      await redeemReward({
        customerId: userDetails._id,
        rewardId: selectedReward._id,
      })

      toast({
        title: "Reward Redeemed",
        description: `You've successfully redeemed ${selectedReward.name}!`,
      })

      setIsRedeemDialogOpen(false)
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Program</h1>
          <p className="text-muted-foreground">Earn points with every service and redeem for rewards</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Status</CardTitle>
              <CardDescription>Current tier and points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Tier</p>
                    <p className="text-xl font-bold capitalize">{loyaltyInfo?.tier || "Bronze"}</p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {loyaltyInfo?.tier || "Bronze"}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Points Balance</p>
                <p className="text-3xl font-bold">{loyaltyInfo?.points || 0}</p>
              </div>

              {loyaltyInfo?.pointsToNextTier > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Progress to {loyaltyInfo.nextTier}</p>
                    <p className="text-sm font-medium">
                      {loyaltyInfo.points}/{loyaltyInfo.points + loyaltyInfo.pointsToNextTier}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (loyaltyInfo.points / (loyaltyInfo.points + loyaltyInfo.pointsToNextTier)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loyaltyInfo.pointsToNextTier} more points to reach {loyaltyInfo.nextTier}
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium">How to Earn Points</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>10 points for every $1 spent on services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>500 bonus points for referring a friend</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>250 bonus points on your birthday</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>100 bonus points for leaving a review</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <CardTitle>Rewards & History</CardTitle>
                  <TabsList>
                    <TabsTrigger value="rewards">Available Rewards</TabsTrigger>
                    <TabsTrigger value="history">Points History</TabsTrigger>
                    <TabsTrigger value="redeemed">Redeemed Rewards</TabsTrigger>
                  </TabsList>
                </div>
                <CardDescription>
                  {activeTab === "rewards"
                    ? "Redeem your points for these rewards"
                    : activeTab === "history"
                      ? "Your points earning history"
                      : "Rewards you've already redeemed"}
                </CardDescription>
              </Tabs>
            </CardHeader>
            <CardContent>
              <TabsContent value="rewards" className="mt-0">
                {!availableRewards ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : availableRewards.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center">
                    <p className="text-muted-foreground">No rewards available for your tier yet</p>
                    <p className="text-sm text-muted-foreground">Earn more points to unlock rewards</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableRewards.map((reward) => (
                      <Card key={reward._id} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{reward.name}</CardTitle>
                            <Badge variant="secondary">{reward.pointsCost} points</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">{reward.description}</p>

                          {reward.expirationDays && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Valid for {reward.expirationDays} days after redemption</span>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="border-t bg-muted/30 px-4 py-2">
                          <Button
                            className="w-full"
                            disabled={loyaltyInfo?.points < reward.pointsCost}
                            onClick={() => {
                              setSelectedReward(reward)
                              setIsRedeemDialogOpen(true)
                            }}
                          >
                            {loyaltyInfo?.points >= reward.pointsCost ? (
                              <>
                                <Gift className="mr-2 h-4 w-4" />
                                Redeem Reward
                              </>
                            ) : (
                              <>
                                <Award className="mr-2 h-4 w-4" />
                                {reward.pointsCost - loyaltyInfo?.points} more points needed
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                {!loyaltyInfo || !loyaltyInfo.pointsHistory ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : loyaltyInfo.pointsHistory.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center">
                    <p className="text-muted-foreground">No points history yet</p>
                    <p className="text-sm text-muted-foreground">Book a service to start earning points</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loyaltyInfo.pointsHistory.map((history, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full p-2 ${history.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                            {history.amount > 0 ? (
                              <Award className="h-4 w-4 text-green-600" />
                            ) : (
                              <Gift className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{history.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.date).toLocaleDateString()} at{" "}
                              {new Date(history.date).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${history.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {history.amount > 0 ? "+" : ""}
                          {history.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="redeemed" className="mt-0">
                {!loyaltyInfo || !loyaltyInfo.rewards ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : loyaltyInfo.rewards.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center">
                    <p className="text-muted-foreground">No redeemed rewards yet</p>
                    <p className="text-sm text-muted-foreground">Redeem your points for rewards</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loyaltyInfo.rewards.map((reward, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 p-2">
                            <Gift className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{reward.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Redeemed on {new Date(reward.redeemedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{reward.cost} points</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedReward.name}</h3>
                <Badge variant="secondary">{selectedReward.pointsCost} points</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{selectedReward.description}</p>

              {selectedReward.expirationDays && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Valid for {selectedReward.expirationDays} days after redemption</span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Points Balance:</span>
              <span className="font-bold">{loyaltyInfo?.points || 0}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-medium">Points to Redeem:</span>
              <span className="font-bold text-red-500">-{selectedReward?.pointsCost || 0}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-1">
              <span className="text-sm font-medium">Remaining Balance:</span>
              <span className="font-bold">{(loyaltyInfo?.points || 0) - (selectedReward?.pointsCost || 0)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRedeemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRedeemReward}>Confirm Redemption</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to get tier level
function getTierLevel(tier: string): number {
  switch (tier) {
    case "platinum":
      return 4
    case "gold":
      return 3
    case "silver":
      return 2
    case "bronze":
    default:
      return 1
  }
}
