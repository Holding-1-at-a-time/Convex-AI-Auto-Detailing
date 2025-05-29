import { render, screen, waitFor } from "@testing-library/react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import BusinessDashboard from "@/app/business/dashboard/page"
import { mockBusinessUser, mockBusinessProfile, mockAppointments, mockServices } from "../setup"

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

// Mock redirect
const mockRedirect = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

describe("BusinessDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUser.mockReturnValue({
      user: mockBusinessUser,
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

    render(<BusinessDashboard />)
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("redirects when user is not logged in", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any)

    render(<BusinessDashboard />)
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in")
  })

  it("redirects when user is not a business", () => {
    const customerUser = { ...mockBusinessUser, publicMetadata: { role: "customer" } }
    mockUseUser.mockReturnValue({
      user: customerUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    // Mock user details query
    mockUseQuery.mockImplementation((query) => {
      if (query === "users:getUserByClerkId") {
        return { role: "customer", clerkId: "user_123" }
      }
      return undefined
    })

    render(<BusinessDashboard />)
    expect(mockRedirect).toHaveBeenCalledWith("/role-selection")
  })

  it("renders business dashboard with stats", async () => {
    // Mock all queries
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "business", clerkId: "user_123", name: "John Doe" }
        case "businessProfiles:getBusinessProfileByUserId":
          return mockBusinessProfile
        case "appointments:getBusinessAppointments":
          return mockAppointments
        case "services:getBusinessServices":
          return mockServices
        case "dashboard:getBusinessStats":
          return {
            totalAppointments: 25,
            totalRevenue: 2500,
            totalCustomers: 15,
            upcomingAppointments: 5,
          }
        default:
          return undefined
      }
    })

    render(<BusinessDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Business Dashboard")).toBeInTheDocument()
      expect(screen.getByText("Welcome, Test Auto Detailing!")).toBeInTheDocument()
    })

    // Check stats cards
    expect(screen.getByText("25")).toBeInTheDocument() // Total appointments
    expect(screen.getByText("$2500.00")).toBeInTheDocument() // Total revenue
    expect(screen.getByText("15")).toBeInTheDocument() // Total customers
    expect(screen.getByText("5")).toBeInTheDocument() // Upcoming appointments
  })

  it("renders appointments tab with appointment list", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "business", clerkId: "user_123" }
        case "businessProfiles:getBusinessProfileByUserId":
          return mockBusinessProfile
        case "appointments:getBusinessAppointments":
          return mockAppointments.map((apt) => ({
            ...apt,
            customerName: "John Customer",
            serviceName: apt.serviceType,
            time: apt.startTime,
          }))
        case "services:getBusinessServices":
          return mockServices
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

    render(<BusinessDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument()
      expect(screen.getByText("John Customer")).toBeInTheDocument()
      expect(screen.getByText("Basic Wash")).toBeInTheDocument()
    })
  })

  it("renders services tab with service list", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "business", clerkId: "user_123" }
        case "businessProfiles:getBusinessProfileByUserId":
          return mockBusinessProfile
        case "appointments:getBusinessAppointments":
          return []
        case "services:getBusinessServices":
          return mockServices
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

    render(<BusinessDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Your Services")).toBeInTheDocument()
      expect(screen.getByText("Basic Wash")).toBeInTheDocument()
      expect(screen.getByText("Premium Detail")).toBeInTheDocument()
      expect(screen.getByText("$50.00 • 60 min")).toBeInTheDocument()
    })
  })

  it("shows empty states when no data", async () => {
    mockUseQuery.mockImplementation((query) => {
      switch (query) {
        case "users:getUserByClerkId":
          return { role: "business", clerkId: "user_123" }
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

    render(<BusinessDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No upcoming appointments")).toBeInTheDocument()
      expect(screen.getByText("No services added yet")).toBeInTheDocument()
    })
  })
})
