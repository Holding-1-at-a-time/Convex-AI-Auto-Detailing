import type { Id } from "@/convex/_generated/dataModel"

/**
 * Represents an available time slot for booking
 */
export interface AvailableTimeSlot {
  startTime: string
  endTime: string
  available: boolean
  staffId?: Id<"staff">
  staffName?: string
  businessId: Id<"businessProfiles">
}

/**
 * Form data structure for booking appointments
 */
export interface BookingFormData {
  serviceId: Id<"servicePackages">
  vehicleId?: Id<"vehicles">
  businessId: Id<"businessProfiles">
  date: string
  startTime: string
  endTime: string
  notes?: string
  staffId?: Id<"staff">
}

/**
 * Detailed appointment information with related data
 */
export interface DetailedAppointment {
  _id: Id<"appointments">
  customerId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  vehicleId?: Id<"vehicles">
  vehicleInfo?: {
    make: string
    model: string
    year: number
    color?: string
    licensePlate?: string
  }
  businessId: Id<"businessProfiles">
  businessName: string
  staffId?: Id<"staff">
  staffName?: string
  date: string
  startTime: string
  endTime: string
  serviceId: Id<"servicePackages">
  serviceName: string
  serviceDescription?: string
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show"
  price: number
  duration: number
  notes?: string
  cancellationReason?: string
  createdAt: string
  updatedAt?: string
}

/**
 * Business availability configuration
 */
export interface BusinessHours {
  [key: string]: {
    isOpen: boolean
    openTime?: string
    closeTime?: string
    breaks?: Array<{
      startTime: string
      endTime: string
      reason?: string
    }>
  }
}

/**
 * Blocked time slot information
 */
export interface BlockedTimeSlot {
  _id: Id<"blockedTimeSlots">
  businessId: Id<"businessProfiles">
  date: string
  startTime: string
  endTime: string
  reason?: string
  isRecurring?: boolean
  recurringPattern?: "daily" | "weekly" | "monthly"
  createdAt: string
}

/**
 * Service package with enhanced details
 */
export interface EnhancedServicePackage {
  _id: Id<"servicePackages">
  name: string
  description?: string
  category: string
  services: string[]
  price: number
  duration: number
  active: boolean
  businessId?: Id<"businessProfiles">
  imageUrl?: string
  popularityRank?: number
  requirements?: string[]
  addOns?: Array<{
    name: string
    price: number
    duration?: number
  }>
}

/**
 * Appointment statistics for business dashboard
 */
export interface AppointmentStats {
  totalAppointments: number
  todayAppointments: number
  upcomingAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  totalRevenue: number
  averageRating: number
  repeatCustomers: number
}
