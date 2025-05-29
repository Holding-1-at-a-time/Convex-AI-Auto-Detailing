import type { Id } from "@/convex/_generated/dataModel"

export interface ServiceBundle {
  _id: Id<"serviceBundles">
  businessId: Id<"businessProfiles">
  name: string
  description: string
  serviceIds: Id<"servicePackages">[]
  discountType: "percentage" | "fixed"
  discountValue: number
  totalPrice: number
  totalDuration: number
  imageUrl?: string
  isActive: boolean
  validFrom?: string
  validUntil?: string
  maxRedemptions?: number
  currentRedemptions: number
  createdAt: string
  updatedAt?: string
}

export interface ServiceBundleFormData {
  name: string
  description: string
  serviceIds: string[]
  discountType: "percentage" | "fixed"
  discountValue: number
  imageUrl?: string
  isActive: boolean
  validFrom?: string
  validUntil?: string
  maxRedemptions?: number
}

export interface BundleService {
  service: {
    _id: Id<"servicePackages">
    name: string
    price: number
    duration: number
  }
  quantity: number
}
