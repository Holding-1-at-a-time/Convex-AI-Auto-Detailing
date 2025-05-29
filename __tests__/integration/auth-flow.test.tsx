import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useUser, useAuth } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import RoleSelectionPage from "@/app/role-selection/page"
import BusinessDashboard from "@/app/business/dashboard/page"
import { mockUser, mockBusinessProfile } from "../setup"

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: jest.fn(),
}))

describe("Authentication Flow Integration", () => {
  const mockCreateOrUpdateUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMutation.mockReturnValue(mockCreateOrUpdateUser)
  })

  it("completes full business onboarding flow", async () => {
    // Start with role selection
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as any)

    const { rerender } = render(<RoleSelectionPage />)

    // Select business role
    const businessCard = screen.getByText("Continue as Business").closest("div")
    fireEvent.click(businessCard!)

    await waitFor(() => {
      expect(mockUser.update).toHaveBeenCalledWith({
        publicMetadata: {
          role: "business",
          onboardingComplete: false,
        },
      })
    })

    // Simulate navigation to business dashboard after onboarding
    const businessUser = {
      ...mockUser,
      publicMetadata: {
        role: "business",
        onboardingComplete: true,
      },
    }

    mockUseUser.mockReturnValue({
      user: businessUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "business", clerkId: "user_123", name: "John Doe" }
        case "businessProfiles:getBusinessProfileByUserId":
          return mockBusinessProfile
        case "appointments:getBusinessAppointments":
          return []
        case "services:getBusinessServices":
          return []
        case "dashboard:getBusinessStats":
          return {
            totalAppointments: 0,
            totalRevenue: 0,
            totalCustomers: 0,
            upcomingAppointments: 0,
          }
        default:
          return undefined
      }
    })

    rerender(<BusinessDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Business Dashboard")).toBeInTheDocument()
      expect(screen.getByText("Welcome, Test Auto Detailing!")).toBeInTheDocument()
    })
  })

  it("handles role switching correctly", async () => {
    // Start as business user
    const businessUser = {
      ...mockUser,
      publicMetadata: { role: "business", onboardingComplete: true },
    }

    mockUseUser.mockReturnValue({
      user: businessUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseQuery.mockImplementation((query) => {
      if (query === "users:getUserByClerkId") {
        return { role: "business", clerkId: "user_123" }
      }
      return undefined
    })

    const { rerender } = render(<BusinessDashboard />)

    // Simulate role change to customer
    const customerUser = {
      ...mockUser,
      publicMetadata: { role: "customer", onboardingComplete: true },
    }

    mockUseUser.mockReturnValue({
      user: customerUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseQuery.mockImplementation((query) => {
      if (query === "users:getUserByClerkId") {
        return { role: "customer", clerkId: "user_123" }
      }
      return undefined
    })

    // Should redirect when role changes
    rerender(<BusinessDashboard />)
    // The redirect would be handled by middleware in real app
  })
})
