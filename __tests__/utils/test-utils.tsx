import type React from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { jest } from "@jest/globals"

// Mock data generators
export const mockUser = {
  id: "user_123",
  firstName: "John",
  lastName: "Doe",
  primaryEmailAddress: {
    emailAddress: "john.doe@example.com",
  },
  publicMetadata: {
    role: "customer",
    onboardingComplete: true,
  },
  update: jest.fn(),
}

export const mockBusinessUser = {
  ...mockUser,
  id: "user_business_123",
  firstName: "Jane",
  lastName: "Smith",
  primaryEmailAddress: {
    emailAddress: "jane.smith@business.com",
  },
  publicMetadata: {
    role: "business",
    onboardingComplete: true,
  },
}

export const mockCustomerProfile = {
  _id: "profile_123",
  userId: "user_123",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  address: "123 Main St",
  city: "Anytown",
  state: "CA",
  zipCode: "12345",
  onboardingCompleted: true,
  createdAt: "2024-01-01T00:00:00.000Z",
}

export const mockBusinessProfile = {
  _id: "business_123",
  userId: "user_business_123",
  businessName: "Premium Auto Detailing",
  businessType: "mobile",
  address: "456 Business Ave",
  city: "Business City",
  state: "CA",
  zipCode: "54321",
  phone: "+1987654321",
  email: "contact@premiumauto.com",
  servicesOffered: ["Basic Wash", "Premium Detail", "Ceramic Coating"],
  onboardingCompleted: true,
  createdAt: "2024-01-01T00:00:00.000Z",
}

export const mockAppointment = {
  _id: "appointment_123",
  customerId: "user_123",
  businessId: "business_123",
  vehicleId: "vehicle_123",
  date: "2024-02-15",
  startTime: "10:00",
  endTime: "12:00",
  serviceType: "Premium Detail",
  status: "scheduled",
  price: 150,
  notes: "Customer requested ceramic coating",
  createdAt: "2024-01-01T00:00:00.000Z",
  customerName: "John Doe",
  serviceName: "Premium Detail",
}

export const mockVehicle = {
  _id: "vehicle_123",
  userId: "user_123",
  make: "Toyota",
  model: "Camry",
  year: 2020,
  color: "Silver",
  licensePlate: "ABC123",
  vin: "1234567890ABCDEFG",
  createdAt: "2024-01-01T00:00:00.000Z",
}

export const mockService = {
  _id: "service_123",
  name: "Premium Detail",
  description: "Complete interior and exterior detailing",
  category: "premium",
  services: ["Wash", "Wax", "Interior Clean", "Tire Shine"],
  price: 150,
  duration: 120,
  active: true,
  popularityRank: 2,
  createdAt: "2024-01-01T00:00:00.000Z",
}

export const mockDashboardStats = {
  totalAppointments: 25,
  totalRevenue: 3750,
  totalCustomers: 15,
  upcomingAppointments: 8,
}

// Custom render function
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="test-wrapper">{children}</div>
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from "@testing-library/react"
export { customRender as render }

// Helper functions for setting up mocks
export const mockClerkUser = (user = mockUser) => {
  const { useUser, useAuth } = require("@clerk/nextjs")
  useUser.mockReturnValue({
    user,
    isLoaded: true,
    isSignedIn: !!user,
  })
  useAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: !!user,
    userId: user?.id,
    sessionClaims: {
      metadata: user?.publicMetadata,
    },
  })
}

export const mockConvexQuery = (mockData: any) => {
  const { useQuery } = require("convex/react")
  useQuery.mockReturnValue(mockData)
}

export const mockConvexMutation = (mockFn = jest.fn()) => {
  const { useMutation } = require("convex/react")
  useMutation.mockReturnValue(mockFn)
}
