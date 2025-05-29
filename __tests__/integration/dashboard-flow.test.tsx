import { render, screen, fireEvent, waitFor } from "../utils/test-utils"
import { jest } from "@jest/globals"
import RoleSelectionPage from "@/app/role-selection/page"
import BusinessDashboard from "@/app/business/dashboard/page"
import CustomerDashboard from "@/app/customer/dashboard/page"
import {
  mockUser,
  mockBusinessUser,
  mockBusinessProfile,
  mockCustomerProfile,
  mockClerkUser,
  mockConvexMutation,
} from "../utils/test-utils"

describe("Dashboard Integration Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Complete Business Flow", () => {
    it("completes business user journey from role selection to dashboard", async () => {
      const mockCreateUser = jest.fn().mockResolvedValue("user_123")
      const mockUpdate = jest.fn().mockResolvedValue({})
      const mockPush = jest.fn()

      jest.doMock("next/navigation", () => ({
        useRouter: () => ({ push: mockPush }),
      }))

      // 1. Role Selection
      mockClerkUser({ ...mockUser, update: mockUpdate, publicMetadata: {} })
      mockConvexMutation(mockCreateUser)

      const { rerender } = render(<RoleSelectionPage />)

      fireEvent.click(screen.getByText("Continue as Business"))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          publicMetadata: {
            role: "business",
            onboardingComplete: false,
          },
        })
      })

      expect(mockPush).toHaveBeenCalledWith("/business/onboarding")

      // 2. After onboarding completion, access dashboard
      mockClerkUser(mockBusinessUser)
      const { useQuery } = require("convex/react")
      useQuery
        .mockReturnValueOnce(mockBusinessUser)
        .mockReturnValueOnce(mockBusinessProfile)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce({ totalAppointments: 0, totalRevenue: 0, totalCustomers: 0, upcomingAppointments: 0 })

      rerender(<BusinessDashboard />)

      expect(screen.getByText("Business Dashboard")).toBeInTheDocument()
      expect(screen.getByText(`Welcome, ${mockBusinessProfile.businessName}!`)).toBeInTheDocument()
    })
  })

  describe("Complete Customer Flow", () => {
    it("completes customer user journey from role selection to dashboard", async () => {
      const mockCreateUser = jest.fn().mockResolvedValue("user_123")
      const mockUpdate = jest.fn().mockResolvedValue({})
      const mockPush = jest.fn()

      jest.doMock("next/navigation", () => ({
        useRouter: () => ({ push: mockPush }),
      }))

      // 1. Role Selection
      mockClerkUser({ ...mockUser, update: mockUpdate, publicMetadata: {} })
      mockConvexMutation(mockCreateUser)

      const { rerender } = render(<RoleSelectionPage />)

      fireEvent.click(screen.getByText("Continue as Customer"))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          publicMetadata: {
            role: "customer",
            onboardingComplete: false,
          },
        })
      })

      expect(mockPush).toHaveBeenCalledWith("/customer/onboarding")

      // 2. After onboarding completion, access dashboard
      mockClerkUser(mockUser)
      const { useQuery } = require("convex/react")
      useQuery
        .mockReturnValueOnce(mockUser)
        .mockReturnValueOnce(mockCustomerProfile)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])

      rerender(<CustomerDashboard />)

      expect(screen.getByText("Customer Dashboard")).toBeInTheDocument()
      expect(screen.getByText(`Welcome, ${mockCustomerProfile.name}!`)).toBeInTheDocument()
    })
  })

  describe("Real-time Updates", () => {
    it("updates dashboard when data changes", async () => {
      mockClerkUser(mockBusinessUser)

      const { useQuery } = require("convex/react")
      let queryCallCount = 0

      useQuery.mockImplementation(() => {
        queryCallCount++
        if (queryCallCount <= 5) {
          // Initial load
          return [
            mockBusinessUser,
            mockBusinessProfile,
            [],
            [],
            { totalAppointments: 0, totalRevenue: 0, totalCustomers: 0, upcomingAppointments: 0 },
          ][queryCallCount - 1]
        } else {
          // Updated data
          return { totalAppointments: 5, totalRevenue: 750, totalCustomers: 3, upcomingAppointments: 2 }
        }
      })

      const { rerender } = render(<BusinessDashboard />)

      // Initially shows 0 appointments
      expect(screen.getByText("0")).toBeInTheDocument()

      // Simulate data update (Convex real-time update)
      rerender(<BusinessDashboard />)

      // Should show updated data
      await waitFor(() => {
        expect(screen.getByText("5")).toBeInTheDocument()
        expect(screen.getByText("$750.00")).toBeInTheDocument()
      })
    })
  })
})
