import { render, screen } from "@/test-utils"
import HomePage from "@/app/home/page"

describe("HomePage", () => {
  it("renders hero section with title and description", () => {
    render(<HomePage />)

    expect(screen.getByText("AI-Powered Auto Detailing Assistant")).toBeInTheDocument()
    expect(screen.getByText(/Get expert recommendations, predictive maintenance insights/)).toBeInTheDocument()
  })

  it("renders call-to-action buttons", () => {
    render(<HomePage />)

    const chatButton = screen.getByRole("link", { name: /Chat with Assistant/i })
    expect(chatButton).toBeInTheDocument()
    expect(chatButton).toHaveAttribute("href", "/chat")

    const dashboardButton = screen.getByRole("link", { name: /View Dashboard/i })
    expect(dashboardButton).toBeInTheDocument()
    expect(dashboardButton).toHaveAttribute("href", "/dashboard")
  })

  it("renders features section with cards", () => {
    render(<HomePage />)

    expect(screen.getByText("Key Features")).toBeInTheDocument()
    expect(screen.getByText("Predictive Analytics")).toBeInTheDocument()
    expect(screen.getByText("Personalized Plans")).toBeInTheDocument()
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument()
  })

  it("renders hero image", () => {
    render(<HomePage />)

    const heroImage = screen.getByAltText("AI Auto Detailing")
    expect(heroImage).toBeInTheDocument()
    expect(heroImage).toHaveAttribute("src", "/ai-car-detailing.png")
  })

  it("uses SiteLayout component", () => {
    render(<HomePage />)

    // Check for SiteLayout elements
    expect(screen.getByText("AutoDetailAI")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("AI Assistant")).toBeInTheDocument()
    expect(screen.getByText("Analytics")).toBeInTheDocument()
    expect(screen.getByText(/© 2025 AutoDetailAI/)).toBeInTheDocument()
  })
})
