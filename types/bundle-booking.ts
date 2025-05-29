import type { Id } from "@/convex/_generated/dataModel"

export interface BundleBookingFormProps {
  bundleId: Id<"serviceBundles">
  businessId: Id<"businessProfiles"> // Business offering the bundle
  onBookingComplete?: (appointmentId: Id<"appointments">) => void
}

export interface BundleBookingFormData {
  bundleId: Id<"serviceBundles">
  businessId: Id<"businessProfiles">
  vehicleId?: Id<"vehicles">
  date: string
  startTime: string
  endTime: string
  notes?: string
  staffId?: string // If a specific staff member is assigned to the slot for the whole bundle
}

export interface BundleDetailsForBooking {
  _id: Id<"serviceBundles">
  name: string
  description: string
  services: Array<{
    _id: Id<"servicePackages">
    name: string
    duration: number
    price: number
  }>
  totalPrice: number
  totalDuration: number
  imageUrl?: string
  businessId: Id<"businessProfiles">
}
