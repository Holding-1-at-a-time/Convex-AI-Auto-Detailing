import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useUser, useAuth } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import RoleSelectionPage from "@/app/role-selection/page"
import { mockUser } from "../setup"

// Mock the hooks
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

// Mock router
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe("RoleSelectionPage", () => {
  const mockCreateOrUpdateUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as any)
    mockUseMutation.mockReturnValue(mockCreateOrUpdateUser)
  })

  it("renders role selection options", () => {
    render(<RoleSelectionPage />)

    expect(screen.getByText("Welcome to AutoDetailAI")).toBeInTheDocument()
    expect(screen.getByText("I'm a Customer")).toBeInTheDocument()
    expect(screen.getByText("I'm a Business Owner")).toBeInTheDocument()
  })

  it("shows loading spinner when user is not loaded", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    } as any)

    render(<RoleSelectionPage />)
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("handles customer role selection", async () => {
    render(<RoleSelectionPage />)

    const customerCard = screen.getByText("Continue as Customer").closest("div")
    fireEvent.click(customerCard!)

    await waitFor(() => {
      expect(mockUser.update).toHaveBeenCalledWith({
        publicMetadata: {
          role: "customer",
          onboardingComplete: false,
        },
      })
    })

    expect(mockCreateOrUpdateUser).toHaveBeenCalledWith({
      clerkId: "user_123",
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "customer",
    })

    expect(mockPush).toHaveBeenCalledWith("/customer/onboarding")
  })

  it("handles business role selection", async () => {
    render(<RoleSelectionPage />)

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

    expect(mockCreateOrUpdateUser).toHaveBeenCalledWith({
      clerkId: "user_123",
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "business",
    })

    expect(mockPush).toHaveBeenCalledWith("/business/onboarding")
  })

  it("handles errors during role selection", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()
    mockUser.update.mockRejectedValue(new Error("Update failed"))

    render(<RoleSelectionPage />)

    const customerCard = screen.getByText("Continue as Customer").closest("div")
    fireEvent.click(customerCard!)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Error setting user role:", expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it("disables interaction during submission", async () => {
    render(<RoleSelectionPage />)

    const customerCard = screen.getByText("Continue as Customer").closest("div")
    fireEvent.click(customerCard!)

    // Should show loading state
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })
})
