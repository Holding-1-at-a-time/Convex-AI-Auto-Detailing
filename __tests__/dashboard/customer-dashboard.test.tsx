import { render, screen, fireEvent } from "../utils/test-utils"
import { jest } from "@jest/globals"
import CustomerDashboard from "@/app/customer/dashboard/page"
import {
  mockUser,
  mockCustomerProfile,
  mockAppointment,
  mockVehicle,
  mockService,
  mockClerkUser,
} from "../utils/test-utils"

describe("Customer Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClerkUser(mockUser)
  })

  it("renders dashboard with customer data", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser) // getUserByClerkId
      .mockReturnValueOnce(mockCustomerProfile) // getCustomerProfileByUserId
      .mockReturnValueOnce([mockAppointment]) // getCustomerAppointments
      .mockReturnValueOnce([mockVehicle]) // getCustomerVehicles
      .mockReturnValueOnce([mockService]) // getRecommendedServices

    render(<CustomerDashboard />)

    expect(screen.getByText("Customer Dashboard")).toBeInTheDocument()
    expect(screen.getByText(`Welcome, ${mockCustomerProfile.name}!`)).toBeInTheDocument()
  })

  it("displays customer appointments", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([{ ...mockAppointment, serviceName: "Premium Detail" }])
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    expect(screen.getByText("Your Appointments")).toBeInTheDocument()
    expect(screen.getByText("Premium Detail")).toBeInTheDocument()
  })

  it("displays customer vehicles", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    // Click on Vehicles tab
    fireEvent.click(screen.getByText("My Vehicles"))

    expect(screen.getByText("Your Vehicles")).toBeInTheDocument()
    expect(screen.getByText(`${mockVehicle.year} ${mockVehicle.make} ${mockVehicle.model}`)).toBeInTheDocument()
    expect(screen.getByText(mockVehicle.color)).toBeInTheDocument()
  })

  it("displays recommended services", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    // Click on Recommended Services tab
    fireEvent.click(screen.getByText("Recommended Services"))

    expect(screen.getByText("Recommended Services")).toBeInTheDocument()
    expect(screen.getByText(mockService.name)).toBeInTheDocument()
    expect(screen.getByText(mockService.description)).toBeInTheDocument()
  })

  it("handles empty appointments state", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([]) // Empty appointments
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    expect(screen.getByText("No appointments scheduled")).toBeInTheDocument()
    expect(screen.getByText("Book an Appointment")).toBeInTheDocument()
  })

  it("handles empty vehicles state", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([]) // Empty vehicles
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    // Click on Vehicles tab
    fireEvent.click(screen.getByText("My Vehicles"))

    expect(screen.getByText("No vehicles added yet")).toBeInTheDocument()
    expect(screen.getByText("Add Vehicle")).toBeInTheDocument()
  })

  it("handles empty recommended services state", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([]) // Empty services

    render(<CustomerDashboard />)

    // Click on Recommended Services tab
    fireEvent.click(screen.getByText("Recommended Services"))

    expect(screen.getByText("No recommended services available")).toBeInTheDocument()
    expect(screen.getByText("Browse All Services")).toBeInTheDocument()
  })

  it("navigates to book appointment with service pre-selected", () => {
    const { useQuery } = require("convex/react")
    useQuery
      .mockReturnValueOnce(mockUser)
      .mockReturnValueOnce(mockCustomerProfile)
      .mockReturnValueOnce([mockAppointment])
      .mockReturnValueOnce([mockVehicle])
      .mockReturnValueOnce([mockService])

    render(<CustomerDashboard />)

    // Click on Recommended Services tab
    fireEvent.click(screen.getByText("Recommended Services"))

    const bookNowButton = screen.getByText("Book Now")
    expect(bookNowButton.closest("a")).toHaveAttribute("href", `/customer/book?service=${mockService._id}`)
  })

  it("redirects non-customer users", () => {
    const mockRedirect = jest.fn()
    jest.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }))

    mockClerkUser({ ...mockUser, publicMetadata: { role: "business" } })

    const { useQuery } = require("convex/react")
    useQuery.mockReturnValue({ role: "business" })

    render(<CustomerDashboard />)

    expect(mockRedirect).toHaveBeenCalledWith("/role-selection")
  })
})
