import { render, screen, waitFor } from "@testing-library/react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import CustomerDashboard from "@/app/customer/dashboard/page"
import { mockCustomerUser, mockCustomerProfile, mockAppointments } from "../setup"

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

const mockRedirect = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

describe("CustomerDashboard", () => {
  const mockVehicles = [
    {
      _id: "vehicle_1",
      userId: "user_123",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      color: "Blue",
      licensePlate: "ABC123",
    },
  ]

  const mockRecommendedServices = [
    {
      _id: "service_1",
      name: "Ceramic Coating",
      description: "Long-lasting paint protection",
      price: 300,
      duration: 240,
      rating: 4.8,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUser.mockReturnValue({
      user: mockCustomerUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)
  })

  it("renders loading state when user is not loaded", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    } as any)

    render(<CustomerDashboard />)
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("redirects when user is not logged in", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any)

    render(<CustomerDashboard />)
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in")
  })

  it("redirects when user is not a customer", () => {
    const businessUser = { ...mockCustomerUser, publicMetadata: { role: "business" } }
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

    render(<CustomerDashboard />)
    expect(mockRedirect).toHaveBeenCalledWith("/role-selection")
  })

  it("renders customer dashboard with appointments", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "customer", clerkId: "user_123", name: "John Doe" }
        case "customerProfiles:getCustomerProfileByUserId":
          return mockCustomerProfile
        case "appointments:getCustomerAppointments":
          return mockAppointments.map((apt) => ({
            ...apt,
            serviceName: apt.serviceType,
            businessName: "Test Auto Detailing",
            time: apt.startTime,
            duration: 60,
          }))
        case "customerProfiles:getCustomerVehicles":
          return mockVehicles
        case "recommendations:getRecommendedServices":
          return mockRecommendedServices
        default:
          return undefined
      }
    })

    render(<CustomerDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Customer Dashboard")).toBeInTheDocument()
      expect(screen.getByText("Welcome, John Doe!")).toBeInTheDocument()
    })

    // Check appointments tab
    expect(screen.getByText("Your Appointments")).toBeInTheDocument()
    expect(screen.getByText("Basic Wash")).toBeInTheDocument()
    expect(screen.getByText("Test Auto Detailing")).toBeInTheDocument()
  })

  it("renders vehicles tab with vehicle list", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "customer", clerkId: "user_123" }
        case "customerProfiles:getCustomerProfileByUserId":
          return mockCustomerProfile
        case "appointments:getCustomerAppointments":
          return []
        case "customerProfiles:getCustomerVehicles":
          return mockVehicles
        case "recommendations:getRecommendedServices":
          return []
        default:
          return undefined
      }
    })

    render(<CustomerDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Your Vehicles")).toBeInTheDocument()
      expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument()
      expect(screen.getByText("Blue")).toBeInTheDocument()
      expect(screen.getByText("License: ABC123")).toBeInTheDocument()
    })
  })

  it("renders recommended services tab", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "customer", clerkId: "user_123" }
        case "customerProfiles:getCustomerProfileByUserId":
          return mockCustomerProfile
        case "appointments:getCustomerAppointments":
          return []
        case "customerProfiles:getCustomerVehicles":
          return []
        case "recommendations:getRecommendedServices":
          return mockRecommendedServices
        default:
          return undefined
      }
    })

    render(<CustomerDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Recommended Services")).toBeInTheDocument()
      expect(screen.getByText("Ceramic Coating")).toBeInTheDocument()
      expect(screen.getByText("$300.00")).toBeInTheDocument()
      expect(screen.getByText("4.8")).toBeInTheDocument()
    })
  })

  it("shows empty states when no data", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "customer", clerkId: "user_123" }
        case "customerProfiles:getCustomerProfileByUserId":
          return mockCustomerProfile
        case "appointments:getCustomerAppointments":
          return []
        case "customerProfiles:getCustomerVehicles":
          return []
        case "recommendations:getRecommendedServices":
          return []
        default:
          return undefined
      }
    })

    render(<CustomerDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No appointments scheduled")).toBeInTheDocument()
      expect(screen.getByText("No vehicles added yet")).toBeInTheDocument()
      expect(screen.getByText("No recommended services available")).toBeInTheDocument()
    })
  })
})
