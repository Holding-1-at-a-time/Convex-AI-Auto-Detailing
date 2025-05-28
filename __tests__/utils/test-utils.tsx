import type React from "react"
import type { ReactElement } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { ThemeProvider } from "@/components/theme-provider"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "@/components/ui/toaster"

// Mock Convex client
const mockConvexClient = new ConvexReactClient("https://test.convex.cloud")

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ConvexProvider client={mockConvexClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
        <Toaster />
      </ThemeProvider>
    </ConvexProvider>
  )
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from "@testing-library/react"

// Override render method
export { customRender as render }

// Test data factories
export const createMockVehicle = (overrides = {}) => ({
  _id: "vehicle_123",
  userId: "user_123",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  color: "Silver",
  notes: "Test vehicle",
  createdAt: "2025-01-01T00:00:00.000Z",
  detailingScore: 85,
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  _id: "user_123",
  userId: "user_123",
  name: "Test User",
  email: "test@example.com",
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
})

export const createMockDetailingRecord = (overrides = {}) => ({
  _id: "record_123",
  vehicleId: "vehicle_123",
  service: "Full Detailing",
  date: "2025-01-15",
  notes: "Complete interior and exterior detailing",
  createdAt: "2025-01-15T00:00:00.000Z",
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  _id: "product_123",
  name: "Premium Car Wax",
  category: "Exterior",
  description: "High-quality carnauba wax for long-lasting protection",
  recommendedFor: ["All vehicles"],
  price: 29.99,
  brand: "AutoShine",
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
})

export const createMockConditionAssessment = (overrides = {}) => ({
  _id: "assessment_123",
  vehicleId: "vehicle_123",
  date: "2025-01-15T00:00:00.000Z",
  overallScore: 85,
  exteriorScore: 83,
  interiorScore: 87,
  notes: "Vehicle in good condition",
  createdAt: "2025-01-15T00:00:00.000Z",
  ...overrides,
})
