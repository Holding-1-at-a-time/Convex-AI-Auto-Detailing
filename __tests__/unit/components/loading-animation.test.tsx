import { render, screen } from "@/test-utils"
import { LoadingAnimation } from "@/components/loading-animation"

describe("LoadingAnimation", () => {
  it("renders with correct progress", () => {
    render(<LoadingAnimation progress={50} />)

    expect(screen.getByText("Loading experience... 50%")).toBeInTheDocument()
  })

  it("renders progress bar with correct width", () => {
    const { container } = render(<LoadingAnimation progress={75} />)

    const progressBar = container.querySelector(".bg-blue-600")
    expect(progressBar).toHaveStyle({ width: "75%" })
  })

  it("handles 0% progress", () => {
    render(<LoadingAnimation progress={0} />)

    expect(screen.getByText("Loading experience... 0%")).toBeInTheDocument()
  })

  it("handles 100% progress", () => {
    render(<LoadingAnimation progress={100} />)

    expect(screen.getByText("Loading experience... 100%")).toBeInTheDocument()
  })

  it("has spinning animation element", () => {
    const { container } = render(<LoadingAnimation progress={50} />)

    const spinner = container.querySelector(".border-blue-600")
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass("rounded-full")
  })
})
