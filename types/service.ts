import type { Id } from "@/convex/_generated/dataModel"

export interface ServicePackage {
  _id: Id<"servicePackages">
  businessId: Id<"businessProfiles">
  name: string
  description: string
  price: number
  duration: number // in minutes
  category?: string
  imageUrl?: string
  isActive: boolean
  features?: string[]
  createdAt: string
  updatedAt?: string
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string
  icon?: string
}

export interface ServiceFormData {
  name: string
  description: string
  price: number
  duration: number
  category?: string
  imageUrl?: string
  features?: string[]
  isActive: boolean
}
