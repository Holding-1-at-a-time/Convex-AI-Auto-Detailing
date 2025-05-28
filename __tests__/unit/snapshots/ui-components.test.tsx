import { render } from "@/test-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingAnimation } from "@/components/loading-animation"

describe("UI Component Snapshots", () => {
  it("Button renders correctly", () => {
    const { container } = render(<Button>Click Me</Button>)
    expect(container).toMatchSnapshot()
  })

  it("Card renders correctly", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>Card Content</CardContent>
      </Card>,
    )
    expect(container).toMatchSnapshot()
  })

  it("Input renders correctly", () => {
    const { container } = render(<Input placeholder="Enter text" />)
    expect(container).toMatchSnapshot()
  })

  it("LoadingAnimation renders correctly", () => {
    const { container } = render(<LoadingAnimation progress={50} />)
    expect(container).toMatchSnapshot()
  })
})
