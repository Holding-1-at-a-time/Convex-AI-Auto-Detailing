import type React from "react"
import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "util"

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/test-path",
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Clerk
jest.mock("@clerk/nextjs", () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div data-testid="sign-in">Sign In Component</div>,
  SignUp: () => <div data-testid="sign-up">Sign Up Component</div>,
}))

// Mock Convex
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Convex client
jest.mock("@/convex/_generated/api", () => ({
  api: {
    users: {
      getUserByClerkId: "users:getUserByClerkId",
      createOrUpdateUser: "users:createOrUpdateUser",
      getCurrentUserRole: "users:getCurrentUserRole",
    },
    businessProfiles: {
      getBusinessProfileByUserId: "businessProfiles:getBusinessProfileByUserId",
      completeOnboarding: "businessProfiles:completeOnboarding",
    },
    customerProfiles: {
      getCustomerProfileByUserId: "customerProfiles:getCustomerProfileByUserId",
      completeOnboarding: "customerProfiles:completeOnboarding",
    },
    appointments: {
      getBusinessAppointments: "appointments:getBusinessAppointments",
      getCustomerAppointments: "appointments:getCustomerAppointments",
    },
    services: {
      getBusinessServices: "services:getBusinessServices",
      listAllServices: "services:listAllServices",
    },
    recommendations: {
      getRecommendedServices: "recommendations:getRecommendedServices",
    },
    dashboard: {
      getBusinessStats: "dashboard:getBusinessStats",
      getCustomerStats: "dashboard:getCustomerStats",
    },
  },
}))

// Global test utilities
export const mockUser = {
  id: "user_123",
  firstName: "John",
  lastName: "Doe",
  primaryEmailAddress: { emailAddress: "john@example.com" },
  publicMetadata: {},
  update: jest.fn(),
}

export const mockBusinessUser = {
  ...mockUser,
  publicMetadata: {
    role: "business",
    onboardingComplete: true,
  },
}

export const mockCustomerUser = {
  ...mockUser,
  publicMetadata: {
    role: "customer",
    onboardingComplete: true,
  },
}

export const mockBusinessProfile = {
  _id: "business_123",
  userId: "user_123",
  businessName: "Test Auto Detailing",
  businessType: "mobile",
  city: "Test City",
  state: "TS",
  zipCode: "12345",
  phone: "555-0123",
  email: "business@test.com",
  onboardingCompleted: true,
}

export const mockCustomerProfile = {
  _id: "customer_123",
  userId: "user_123",
  name: "John Doe",
  email: "john@example.com",
  onboardingCompleted: true,
}

export const mockAppointments = [
  {
    _id: "appointment_1",
    customerId: "user_123",
    date: "2024-01-15",
    startTime: "10:00",
    endTime: "11:00",
    serviceType: "Basic Wash",
    status: "scheduled",
    price: 50,
  },
  {
    _id: "appointment_2",
    customerId: "user_123",
    date: "2024-01-20",
    startTime: "14:00",
    endTime: "15:30",
    serviceType: "Premium Detail",
    status: "completed",
    price: 150,
  },
]

export const mockServices = [
  {
    _id: "service_1",
    name: "Basic Wash",
    description: "Exterior wash and dry",
    price: 50,
    duration: 60,
    category: "basic",
    active: true,
  },
  {
    _id: "service_2",
    name: "Premium Detail",
    description: "Full interior and exterior detail",
    price: 150,
    duration: 180,
    category: "premium",
    active: true,
  },
]
