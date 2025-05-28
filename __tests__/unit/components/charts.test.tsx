import type React from "react"
import { render } from "@/test-utils"
import { BarChart, LineChart } from "@/components/charts"

// Mock Recharts components
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Bar: ({ dataKey, fill, name }: { dataKey: string; fill: string; name: string }) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill} data-name={name} />
  ),
  Line: ({ type, dataKey, stroke, name }: { type: string; dataKey: string; stroke: string; name: string }) => (
    <div data-testid="line" data-type={type} data-key={dataKey} data-stroke={stroke} data-name={name} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="cartesian-grid" data-dash={strokeDasharray} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
}))

describe("Chart Components", () => {
  const mockData = [
    { month: "Jan", count: 10, score: 85 },
    { month: "Feb", count: 15, score: 90 },
    { month: "Mar", count: 8, score: 82 },
  ]

  describe("BarChart", () => {
    it("renders with correct props", () => {
      const { getByTestId } = render(<BarChart data={mockData} xAxis="month" yAxis="count" title="Test Bar Chart" />)

      expect(getByTestId("responsive-container")).toBeInTheDocument()
      expect(getByTestId("bar-chart")).toBeInTheDocument()
      expect(getByTestId("x-axis")).toHaveAttribute("data-key", "month")
      expect(getByTestId("y-axis")).toBeInTheDocument()
      expect(getByTestId("bar")).toHaveAttribute("data-key", "count")
      expect(getByTestId("bar")).toHaveAttribute("data-name", "Test Bar Chart")
    })
  })

  describe("LineChart", () => {
    it("renders with correct props", () => {
      const { getByTestId } = render(<LineChart data={mockData} xAxis="month" yAxis="score" title="Test Line Chart" />)

      expect(getByTestId("responsive-container")).toBeInTheDocument()
      expect(getByTestId("line-chart")).toBeInTheDocument()
      expect(getByTestId("x-axis")).toHaveAttribute("data-key", "month")
      expect(getByTestId("y-axis")).toBeInTheDocument()
      expect(getByTestId("line")).toHaveAttribute("data-key", "score")
      expect(getByTestId("line")).toHaveAttribute("data-name", "Test Line Chart")
      expect(getByTestId("line")).toHaveAttribute("data-type", "monotone")
    })
  })
})
