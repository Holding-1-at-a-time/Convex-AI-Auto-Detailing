import { render, screen } from "@/test-utils"
import { SiteLayout } from "@/components/site-layout"

describe("SiteLayout", () => {
  it("renders children correctly", () => {
    render(
      <SiteLayout>
        <div data-testid="test-child">Test Content</div>
      </SiteLayout>,
    )

    expect(screen.getByTestId("test-child")).toBeInTheDocument()
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("renders header with navigation links", () => {
    render(
      <SiteLayout>
        <div>Test Content</div>
      </SiteLayout>,
    )

    expect(screen.getByText("AutoDetailAI")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("AI Assistant")).toBeInTheDocument()
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders footer with copyright and links", () => {
    render(
      <SiteLayout>
        <div>Test Content</div>
      </SiteLayout>,
    )

    expect(screen.getByText(/© 2025 AutoDetailAI/)).toBeInTheDocument()
    expect(screen.getByText("Terms")).toBeInTheDocument()
    expect(screen.getByText("Privacy")).toBeInTheDocument()
  })

  it("has working navigation links", () => {
    render(
      <SiteLayout>
        <div>Test Content</div>
      </SiteLayout>,
    )

    const dashboardLink = screen.getByText("Dashboard")
    expect(dashboardLink).toHaveAttribute("href", "/dashboard")

    const assistantLink = screen.getByText("AI Assistant")
    expect(assistantLink).toHaveAttribute("href", "/chat")

    const analyticsLink = screen.getByText("Analytics")
    expect(analyticsLink).toHaveAttribute("href", "/analytics")
  })
})
