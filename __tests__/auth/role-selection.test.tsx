import { render, screen, fireEvent, waitFor } from "../utils/test-utils"
import { jest } from "@jest/globals"
import RoleSelectionPage from "@/app/role-selection/page"
import { mockUser, mockClerkUser, mockConvexMutation } from "../utils/test-utils"

// Mock next/navigation
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe("Role Selection Page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClerkUser({ ...mockUser, publicMetadata: {} }) // User without role
  })

  it("renders role selection options", () => {
    render(<RoleSelectionPage />)

    expect(screen.getByText("Welcome to AutoDetailAI")).toBeInTheDocument()
    expect(screen.getByText("I'm a Customer")).toBeInTheDocument()
    expect(screen.getByText("I'm a Business Owner")).toBeInTheDocument()
  })

  it("handles customer role selection", async () => {
    const mockCreateUser = jest.fn().mockResolvedValue("user_123")
    const mockUpdate = jest.fn().mockResolvedValue({})
    mockConvexMutation(mockCreateUser)
    mockClerkUser({ ...mockUser, update: mockUpdate, publicMetadata: {} })

    render(<RoleSelectionPage />)

    const customerButton = screen.getByText("Continue as Customer")
    fireEvent.click(customerButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        publicMetadata: {
          role: "customer",
          onboardingComplete: false,
        },
      })
    })

    expect(mockCreateUser).toHaveBeenCalledWith({
      clerkId: mockUser.id,
      email: mockUser.primaryEmailAddress.emailAddress,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: "customer",
    })

    expect(mockPush).toHaveBeenCalledWith("/customer/onboarding")
  })

  it("handles business role selection", async () => {
    const mockCreateUser = jest.fn().mockResolvedValue("user_123")
    const mockUpdate = jest.fn().mockResolvedValue({})
    mockConvexMutation(mockCreateUser)
    mockClerkUser({ ...mockUser, update: mockUpdate, publicMetadata: {} })

    render(<RoleSelectionPage />)

    const businessButton = screen.getByText("Continue as Business")
    fireEvent.click(businessButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        publicMetadata: {
          role: "business",
          onboardingComplete: false,
        },
      })
    })

    expect(mockCreateUser).toHaveBeenCalledWith({
      clerkId: mockUser.id,
      email: mockUser.primaryEmailAddress.emailAddress,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: "business",
    })

    expect(mockPush).toHaveBeenCalledWith("/business/onboarding")
  })

  it("shows loading state during submission", async () => {
    const mockCreateUser = jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
    mockConvexMutation(mockCreateUser)
    mockClerkUser({ ...mockUser, update: jest.fn().mockResolvedValue({}), publicMetadata: {} })

    render(<RoleSelectionPage />)

    const customerButton = screen.getByText("Continue as Customer")
    fireEvent.click(customerButton)

    // Should show loading spinner
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("handles errors during role selection", async () => {
    const mockCreateUser = jest.fn().mockRejectedValue(new Error("Failed to create user"))
    const mockUpdate = jest.fn().mockRejectedValue(new Error("Failed to update user"))
    mockConvexMutation(mockCreateUser)
    mockClerkUser({ ...mockUser, update: mockUpdate, publicMetadata: {} })

    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    render(<RoleSelectionPage />)

    const customerButton = screen.getByText("Continue as Customer")
    fireEvent.click(customerButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Error setting user role:", expect.any(Error))
    })

    consoleSpy.mockRestore()
  })
})
