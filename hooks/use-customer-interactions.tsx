"use client"

import { useState, useCallback, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "@/hooks/use-toast"

interface UseCustomerInteractionsOptions {
  customerId?: string
  businessId?: Id<"businessProfiles">
  includeRecommendations?: boolean
  includeLoyalty?: boolean
}

interface CustomerInsights {
  totalAppointments: number
  totalSpent: number
  averageRating: number
  favoriteServices: string[]
  lastVisit: Date | null
  loyaltyPoints: number
  membershipTier: string
  recommendedServices: any[]
  upcomingAppointments: any[]
  appointmentHistory: any[]
}

/**
 * Custom hook for managing customer interactions and insights
 *
 * Features:
 * - Customer profile management
 * - Appointment history tracking
 * - Service recommendations
 * - Loyalty program integration
 * - Personalized insights
 *
 * @param options - Configuration options for customer interactions
 * @returns Customer data and interaction functions
 */
export function useCustomerInteractions(options: UseCustomerInteractionsOptions = {}) {
  const { customerId, businessId, includeRecommendations = true, includeLoyalty = true } = options
  const { user } = useUser()

  // Use current user if no customerId provided
  const effectiveCustomerId = customerId || user?.id

  // State management
  const [selectedVehicle, setSelectedVehicle] = useState<Id<"vehicles"> | null>(null)
  const [preferenceCategory, setPreferenceCategory] = useState<string>("all")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Convex queries
  const customerProfile = useQuery(
    api.customerProfiles.getByUserId,
    effectiveCustomerId ? { userId: effectiveCustomerId } : "skip",
  )

  const customerVehicles = useQuery(
    api.vehicles.getByCustomerId,
    effectiveCustomerId ? { customerId: effectiveCustomerId } : "skip",
  )

  const appointmentHistory = useQuery(
    api.appointments.getCustomerAppointments,
    effectiveCustomerId ? { customerId: effectiveCustomerId, limit: 50 } : "skip",
  )

  const upcomingAppointments = useQuery(
    api.appointments.getUpcomingCustomerAppointments,
    effectiveCustomerId ? { customerId: effectiveCustomerId } : "skip",
  )

  const serviceRecommendations = useQuery(
    api.recommendations.getPersonalizedRecommendations,
    includeRecommendations && effectiveCustomerId ? { customerId: effectiveCustomerId, limit: 5 } : "skip",
  )

  const loyaltyData = useQuery(
    api.loyalty.getCustomerLoyaltyData,
    includeLoyalty && effectiveCustomerId ? { customerId: effectiveCustomerId } : "skip",
  )

  const customerFeedback = useQuery(
    api.feedback.getCustomerFeedback,
    effectiveCustomerId ? { customerId: effectiveCustomerId, limit: 10 } : "skip",
  )

  // Mutations
  const updateCustomerProfile = useMutation(api.customerProfiles.updateCustomerProfile)
  const addVehicle = useMutation(api.vehicles.addVehicle)
  const updateVehicle = useMutation(api.vehicles.updateVehicle)
  const deleteVehicle = useMutation(api.vehicles.deleteVehicle)
  const trackInteraction = useMutation(api.recommendations.trackInteraction)
  const redeemLoyaltyPoints = useMutation(api.loyalty.redeemPoints)

  /**
   * Calculate comprehensive customer insights
   */
  const customerInsights = useMemo((): CustomerInsights => {
    const completedAppointments = appointmentHistory?.filter((apt) => apt.status === "completed") || []

    const totalSpent = completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)

    const ratings = customerFeedback?.map((feedback) => feedback.rating).filter(Boolean) || []
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

    const serviceFrequency = completedAppointments.reduce(
      (acc, apt) => {
        const serviceName = apt.serviceName || "Unknown"
        acc[serviceName] = (acc[serviceName] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const favoriteServices = Object.entries(serviceFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([service]) => service)

    const lastVisit = completedAppointments.length > 0 ? new Date(completedAppointments[0].date) : null

    return {
      totalAppointments: appointmentHistory?.length || 0,
      totalSpent,
      averageRating: Math.round(averageRating * 10) / 10,
      favoriteServices,
      lastVisit,
      loyaltyPoints: loyaltyData?.points || 0,
      membershipTier: loyaltyData?.tier || "Bronze",
      recommendedServices: serviceRecommendations || [],
      upcomingAppointments: upcomingAppointments || [],
      appointmentHistory: appointmentHistory || [],
    }
  }, [appointmentHistory, customerFeedback, loyaltyData, serviceRecommendations, upcomingAppointments])

  /**
   * Get customer preferences by category
   */
  const customerPreferences = useMemo(() => {
    if (!customerProfile?.preferences) return {}

    if (preferenceCategory === "all") {
      return customerProfile.preferences
    }

    return {
      [preferenceCategory]: customerProfile.preferences[preferenceCategory],
    }
  }, [customerProfile?.preferences, preferenceCategory])

  /**
   * Update customer profile information
   */
  const handleUpdateProfile = useCallback(
    async (updates: Partial<any>) => {
      if (!effectiveCustomerId) return false

      setIsUpdatingProfile(true)
      try {
        await updateCustomerProfile({
          userId: effectiveCustomerId,
          ...updates,
        })

        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        })

        return true
      } catch (error) {
        console.error("Error updating profile:", error)
        toast({
          title: "Update Failed",
          description: "Unable to update profile. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsUpdatingProfile(false)
      }
    },
    [effectiveCustomerId, updateCustomerProfile],
  )

  /**
   * Add a new vehicle
   */
  const handleAddVehicle = useCallback(
    async (vehicleData: any) => {
      if (!effectiveCustomerId) return null

      try {
        const vehicleId = await addVehicle({
          userId: effectiveCustomerId,
          ...vehicleData,
        })

        toast({
          title: "Vehicle Added",
          description: "Your vehicle has been added successfully.",
        })

        return vehicleId
      } catch (error) {
        console.error("Error adding vehicle:", error)
        toast({
          title: "Add Failed",
          description: "Unable to add vehicle. Please try again.",
          variant: "destructive",
        })
        return null
      }
    },
    [effectiveCustomerId, addVehicle],
  )

  /**
   * Update existing vehicle
   */
  const handleUpdateVehicle = useCallback(
    async (vehicleId: Id<"vehicles">, updates: any) => {
      try {
        await updateVehicle({
          vehicleId,
          ...updates,
        })

        toast({
          title: "Vehicle Updated",
          description: "Your vehicle information has been updated.",
        })

        return true
      } catch (error) {
        console.error("Error updating vehicle:", error)
        toast({
          title: "Update Failed",
          description: "Unable to update vehicle. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [updateVehicle],
  )

  /**
   * Delete a vehicle
   */
  const handleDeleteVehicle = useCallback(
    async (vehicleId: Id<"vehicles">) => {
      try {
        await deleteVehicle({ vehicleId })

        toast({
          title: "Vehicle Removed",
          description: "Your vehicle has been removed from your profile.",
        })

        // Clear selection if deleted vehicle was selected
        if (selectedVehicle === vehicleId) {
          setSelectedVehicle(null)
        }

        return true
      } catch (error) {
        console.error("Error deleting vehicle:", error)
        toast({
          title: "Delete Failed",
          description: "Unable to remove vehicle. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [deleteVehicle, selectedVehicle],
  )

  /**
   * Track customer interaction for recommendations
   */
  const handleTrackInteraction = useCallback(
    async (serviceId: Id<"servicePackages">, interactionType: string) => {
      if (!effectiveCustomerId) return

      try {
        await trackInteraction({
          customerId: effectiveCustomerId,
          serviceId,
          interactionType,
        })
      } catch (error) {
        console.error("Error tracking interaction:", error)
        // Don't show error toast for tracking failures
      }
    },
    [effectiveCustomerId, trackInteraction],
  )

  /**
   * Redeem loyalty points
   */
  const handleRedeemPoints = useCallback(
    async (points: number, rewardType: string) => {
      if (!effectiveCustomerId) return false

      try {
        const result = await redeemLoyaltyPoints({
          customerId: effectiveCustomerId,
          points,
          rewardType,
        })

        toast({
          title: "Points Redeemed",
          description: `You've successfully redeemed ${points} points for ${rewardType}.`,
        })

        return result
      } catch (error) {
        console.error("Error redeeming points:", error)
        toast({
          title: "Redemption Failed",
          description: "Unable to redeem points. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [effectiveCustomerId, redeemLoyaltyPoints],
  )

  /**
   * Get customer tier benefits
   */
  const tierBenefits = useMemo(() => {
    const tier = customerInsights.membershipTier.toLowerCase()

    const benefits = {
      bronze: ["5% discount on services", "Birthday month special offer"],
      silver: ["10% discount on services", "Priority booking", "Free car wash monthly"],
      gold: ["15% discount on services", "Priority booking", "Free detailing quarterly", "Concierge service"],
      platinum: [
        "20% discount on services",
        "VIP booking",
        "Free monthly detailing",
        "Personal detailer",
        "Exclusive events",
      ],
    }

    return benefits[tier as keyof typeof benefits] || benefits.bronze
  }, [customerInsights.membershipTier])

  /**
   * Calculate next tier progress
   */
  const nextTierProgress = useMemo(() => {
    const currentSpent = customerInsights.totalSpent
    const tiers = {
      bronze: { min: 0, max: 500 },
      silver: { min: 500, max: 1500 },
      gold: { min: 1500, max: 3000 },
      platinum: { min: 3000, max: Number.POSITIVE_INFINITY },
    }

    const currentTier = customerInsights.membershipTier.toLowerCase()
    const tierInfo = tiers[currentTier as keyof typeof tiers]

    if (!tierInfo || tierInfo.max === Number.POSITIVE_INFINITY) {
      return { progress: 100, remaining: 0, nextTier: null }
    }

    const progress = ((currentSpent - tierInfo.min) / (tierInfo.max - tierInfo.min)) * 100
    const remaining = tierInfo.max - currentSpent

    const nextTierName = Object.keys(tiers).find((tier) => tiers[tier as keyof typeof tiers].min === tierInfo.max)

    return {
      progress: Math.min(100, Math.max(0, progress)),
      remaining: Math.max(0, remaining),
      nextTier: nextTierName,
    }
  }, [customerInsights.totalSpent, customerInsights.membershipTier])

  return {
    // State
    isUpdatingProfile,
    selectedVehicle,
    preferenceCategory,

    // Data
    customerProfile,
    customerVehicles: customerVehicles || [],
    customerInsights,
    customerPreferences,
    tierBenefits,
    nextTierProgress,

    // Actions
    updateProfile: handleUpdateProfile,
    addVehicle: handleAddVehicle,
    updateVehicle: handleUpdateVehicle,
    deleteVehicle: handleDeleteVehicle,
    trackInteraction: handleTrackInteraction,
    redeemPoints: handleRedeemPoints,

    // Selection
    setSelectedVehicle,
    setPreferenceCategory,

    // Utilities
    isDataLoading: !customerProfile,
    hasVehicles: (customerVehicles?.length || 0) > 0,
    hasUpcomingAppointments: (upcomingAppointments?.length || 0) > 0,
    canRedeemPoints: (loyaltyData?.points || 0) >= 100, // Minimum redemption threshold
  }
}
