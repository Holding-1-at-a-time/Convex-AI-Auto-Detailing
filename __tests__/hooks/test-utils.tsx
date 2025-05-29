import type React from "react"
import { render, renderHook } from "@testing-library/react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "@/components/ui/toaster"

// Mock Convex client
const mockConvexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://test.convex.cloud")

// Mock Clerk user
const mockUser = {
  id: "user_123",
  emailAddresses: [{ emailAddress: "test@example.com" }],
  firstName: "Test",
  lastName: "User",
}

// Test wrapper component
export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey="pk_test_123">
      <ConvexProvider client={mockConvexClient}>
        {children}
        <Toaster />
      </ConvexProvider>
    </ClerkProvider>
  )
}

// Custom render function
export function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  })
}

// Custom renderHook function
export function renderHookWithProviders<T>(hook: () => T, options = {}) {
  return renderHook(hook, {
    wrapper: TestWrapper,
    ...options,
  })
}

// Mock data factories
export const createMockAppointment = (overrides = {}) => ({
  _id: "appointment_123",
  businessId: "business_123",
  customerId: "customer_123",
  serviceId: "service_123",
  vehicleId: "vehicle_123",
  date: "2024-01-15",
  startTime: "10:00",
  endTime: "11:00",
  status: "scheduled",
  notes: "Test appointment",
  price: 100,
  serviceName: "Basic Wash",
  customerName: "John Doe",
  _creationTime: Date.now(),
  ...overrides,
})

export const createMockBusinessHours = (overrides = {}) => ({
  _id: "hours_123",
  businessId: "business_123",
  businessHours: {
    monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    saturday: { isOpen: true, openTime: "10:00", closeTime: "16:00" },
    sunday: { isOpen: false, openTime: null, closeTime: null },
  },
  _creationTime: Date.now(),
  ...overrides,
})

export const createMockService = (overrides = {}) => ({
  _id: "service_123",
  businessId: "business_123",
  name: "Basic Wash",
  description: "Basic car wash service",
  duration: 60,
  price: 50,
  category: "wash",
  isActive: true,
  _creationTime: Date.now(),
  ...overrides,
})

// Mock implementations
export const mockConvexQueries = {
  "api.appointments.getAppointmentDetails": jest.fn(),
  "api.appointments.checkAvailability": jest.fn(),
  "api.appointments.getAppointmentsByDateRange": jest.fn(),
  "api.businessAvailability.getBusinessAvailability": jest.fn(),
  "api.availability.getBlockedTimeSlots": jest.fn(),
  "api.notifications.subscribeToNotifications": jest.fn(),
}

export const mockConvexMutations = {
  "api.validatedAppointments.createValidatedAppointment": jest.fn(),
  "api.validatedAppointments.updateValidatedAppointment": jest.fn(),
  "api.availability.blockTimeSlot": jest.fn(),
  "api.availability.removeBlockedTimeSlot": jest.fn(),
}

// Setup function to run before each test
export function setupMocks() {
  // Reset all mocks
  Object.values(mockConvexQueries).forEach((mock) => mock.mockReset())
  Object.values(mockConvexMutations).forEach((mock) => mock.mockReset())

  // Setup default return values
  mockConvexQueries["api.appointments.checkAvailability"].mockResolvedValue(true)
  mockConvexQueries["api.businessAvailability.getBusinessAvailability"].mockReturnValue(createMockBusinessHours())
  mockConvexQueries["api.appointments.getAppointmentsByDateRange"].mockReturnValue([])
  mockConvexQueries["api.availability.getBlockedTimeSlots"].mockReturnValue([])

  mockConvexMutations["api.validatedAppointments.createValidatedAppointment"].mockResolvedValue("appointment_123")
  mockConvexMutations["api.validatedAppointments.updateValidatedAppointment"].mockResolvedValue(undefined)
}

// Mock toast function
export const mockToast = jest.fn()

// Mock useUser hook
export const mockUseUser = jest.fn(() => ({
  user: mockUser,
  isLoaded: true,
  isSignedIn: true,
}))

// Mock date utilities
export const mockDate = new Date("2024-01-15T10:00:00Z")

// Test helpers
export const waitForNextUpdate = () => new Promise((resolve) => setTimeout(resolve, 0))

export const flushPromises = () => new Promise((resolve) => setImmediate(resolve))
