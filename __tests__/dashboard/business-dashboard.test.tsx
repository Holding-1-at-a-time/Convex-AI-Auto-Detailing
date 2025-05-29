import { render, screen, fireEvent } from "../utils/test-utils"
import { jest } from "@jest/globals"
import BusinessDashboard from "@/app/business/dashboard/page"
import {
  mockBusinessUser,
  mockBusinessProfile,
  mockAppointment,
  mockService,
  mockDashboardStats,
  mockClerkUser,
} from "../utils/test-utils"

// Mock next/navigation
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  redirect: jest.fn(),
}))

describe("Business Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClerkUser(mockBusinessUser)
  })

  it("renders dashboard with business data", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser) // getUserByClerkId
      .mockReturnValueOnce(mockBusinessProfile) // getBusinessProfileByUserId
      .mockReturnValueOnce([mockAppointment]) // getBusinessAppointments
      .mockReturnValueOnce([mockService]) // getBusinessServices
      .mockReturnValueOnce(mockDashboardStats) // getBusinessStats

    render(<BusinessDashboard />)

    expect(screen.getByText("Business Dashboard")).toBeInTheDocument()
    expect(screen.getByText(`Welcome, ${mockBusinessProfile.businessName}!`)).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument() // Total appointments
    expect(screen.getByText("$3750.00")).toBeInTheDocument() // Total revenue
    expect(screen.getByText("15")).toBeInTheDocument() // Total customers
    expect(screen.getByText("8")).toBeInTheDocument() // Upcoming appointments
  })

  it("displays upcoming appointments", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockService])
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument()
    expect(screen.getByText(mockAppointment.customerName)).toBeInTheDocument()
    expect(screen.getByText(mockAppointment.serviceName)).toBeInTheDocument()
  })

  it("displays services management", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockService])
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    // Click on Services tab
    fireEvent.click(screen.getByText("Services"))

    expect(screen.getByText("Your Services")).toBeInTheDocument()
    expect(screen.getByText(mockService.name)).toBeInTheDocument()
    expect(screen.getByText(mockService.description)).toBeInTheDocument()
    expect(screen.getByText(`$${mockService.price.toFixed(2)}`)).toBeInTheDocument()
  })

  it("handles empty appointments state", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([]) // Empty appointments
      .mockReturnValueOnce([mockService])
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    expect(screen.getByText("No upcoming appointments")).toBeInTheDocument()
    expect(screen.getByText("Schedule Appointment")).toBeInTheDocument()
  })

  it("handles empty services state", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([]) // Empty services
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    // Click on Services tab
    fireEvent.click(screen.getByText("Services"))

    expect(screen.getByText("No services added yet")).toBeInTheDocument()
    expect(screen.getByText("Add Service")).toBeInTheDocument()
  })

  it("redirects non-business users", () => {
    const mockRedirect = jest.fn()
    jest.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }))

    mockClerkUser({ ...mockBusinessUser, publicMetadata: { role: "customer" } })

    const { useQuery } = require("convex/react")
    useQuery.mockReturnValue({ role: "customer" })

    render(<BusinessDashboard />)

    expect(mockRedirect).toHaveBeenCalledWith("/role-selection")
  })

  it("shows loading state when data is loading", () => {
    const { useQuery } = require("convex/react")
    useQuery.mockReturnValue(undefined) // Loading state

    mockClerkUser({ ...mockBusinessUser, isLoaded: false })

    render(<BusinessDashboard />)

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("navigates to appointment details", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockService])
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    const viewDetailsButton = screen.getByText("View Details")
    expect(viewDetailsButton.closest("a")).toHaveAttribute("href", `/business/appointments/${mockAppointment._id}`)
  })

  it("navigates to new appointment creation", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockBusinessUser)
      .mockReturnValueOnce(mockBusinessProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockService])
      .mockReturnValueOnce(mockDashboardStats)

    render(<BusinessDashboard />)

    const newAppointmentButton = screen.getByText("New Appointment")
    expect(newAppointmentButton.closest("a")).toHaveAttribute("href", "/business/appointments/new")
  })
})
