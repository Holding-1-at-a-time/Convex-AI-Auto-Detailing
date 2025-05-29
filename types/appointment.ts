export interface AppointmentSlot {
  startTime: string
  endTime: string
  available: boolean
  staffId?: string
  staffName?: string
}

export interface BookingFormData {
  serviceId: string
  vehicleId?: string
  date: string
  startTime: string
  endTime: string
  notes?: string
}

export interface AppointmentWithDetails {
  _id: string
  customerId: string
  customerName: string
  vehicleId?: string
  vehicleInfo?: {
    make: string
    model: string
    year: string
    color?: string
  }
  businessId: string
  staffId?: string
  staffName?: string
  date: string
  startTime: string
  endTime: string
  serviceType: string
  serviceName: string
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled"
  price?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface ServicePackageWithDetails {
  _id: string
  name: string
  description?: string
  category: string
  services: string[]
  price: number
  duration: number
  active: boolean
  popularityRank?: number
}
