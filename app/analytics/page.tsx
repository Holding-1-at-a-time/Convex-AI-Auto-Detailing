"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BarChart, LineChart } from "@/components/charts"

export default function AnalyticsPage() {
  // This would be replaced with actual Convex queries
  const analyticsData = useQuery(api.analytics.getAnalyticsData) || {
    detailingFrequency: [
      { month: "Jan", count: 2 },
      { month: "Feb", count: 3 },
      { month: "Mar", count: 1 },
      { month: "Apr", count: 4 },
      { month: "May", count: 2 },
      { month: "Jun", count: 3 },
      { month: "Jul", count: 5 },
      { month: "Aug", count: 2 },
      { month: "Sep", count: 3 },
      { month: "Oct", count: 4 },
      { month: "Nov", count: 2 },
      { month: "Dec", count: 3 },
    ],
    conditionTrends: [
      { month: "Jan", score: 75 },
      { month: "Feb", score: 78 },
      { month: "Mar", score: 72 },
      { month: "Apr", score: 80 },
      { month: "May", score: 85 },
      { month: "Jun", score: 82 },
      { month: "Jul", score: 88 },
      { month: "Aug", score: 85 },
      { month: "Sep", score: 82 },
      { month: "Oct", score: 86 },
      { month: "Nov", score: 90 },
      { month: "Dec", score: 85 },
    ],
    productUsage: [
      { product: "Wax", count: 12 },
      { product: "Interior Cleaner", count: 18 },
      { product: "Wheel Cleaner", count: 8 },
      { product: "Glass Cleaner", count: 15 },
      { product: "Leather Conditioner", count: 6 },
    ],
    predictiveInsights: [
      {
        insight:
          "Wax application will be needed in approximately 2 weeks based on current weather patterns and last application date.",
      },
      { insight: "Interior cleaning frequency should increase during summer months due to higher dust accumulation." },
      {
        insight:
          "Based on your driving patterns, wheel cleaning should be performed every 2 weeks for optimal maintenance.",
      },
    ],
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Predictive Analytics</h1>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Condition Trends</TabsTrigger>
          <TabsTrigger value="frequency">Detailing Frequency</TabsTrigger>
          <TabsTrigger value="products">Product Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Condition Trends</CardTitle>
              <CardDescription>Track how your vehicle's condition has changed over time</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[400px]">
                <LineChart
                  data={analyticsData.conditionTrends}
                  xAxis="month"
                  yAxis="score"
                  title="Vehicle Condition Score"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailing Frequency</CardTitle>
              <CardDescription>How often you've detailed your vehicle</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[400px]">
                <BarChart
                  data={analyticsData.detailingFrequency}
                  xAxis="month"
                  yAxis="count"
                  title="Detailing Sessions"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Usage</CardTitle>
              <CardDescription>Which products you use most frequently</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[400px]">
                <BarChart data={analyticsData.productUsage} xAxis="product" yAxis="count" title="Usage Count" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Predictive Insights</CardTitle>
          <CardDescription>Machine learning predictions based on your vehicle data and usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analyticsData.predictiveInsights.map((item, index) => (
              <li key={index} className="border-b pb-2">
                <p>{item.insight}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
