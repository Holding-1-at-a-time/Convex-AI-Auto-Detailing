"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/loading-spinner"
import { BarChart, LineChart, PieChart } from "@/components/charts"
import type { Id } from "@/convex/_generated/dataModel"

interface ServiceStatisticsProps {
  businessId: Id<"businessProfiles">
  period?: "week" | "month" | "year"
}

export default function ServiceStatistics({ businessId, period = "month" }: ServiceStatisticsProps) {
  // Get service statistics
  const statistics = useQuery(api.analytics.getServiceStatistics, { businessId, period })

  // Get service bookings over time
  const bookingTrends = useQuery(api.analytics.getServiceBookingTrends, { businessId, period })

  // Get service revenue breakdown
  const revenueBreakdown = useQuery(api.analytics.getServiceRevenueBreakdown, { businessId, period })

  // Loading state
  if (!statistics || !bookingTrends || !revenueBreakdown) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Performance</CardTitle>
        <CardDescription>Analytics and insights about your service offerings</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bookings">
          <TabsList className="mb-4">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="popularity">Popularity</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <div className="h-80">
              <BarChart
                data={bookingTrends.data}
                index="date"
                categories={bookingTrends.categories}
                colors={["blue", "green", "purple", "orange", "red"]}
                valueFormatter={(value) => `${value} bookings`}
              />
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="h-80">
              <LineChart
                data={revenueBreakdown.timeline}
                index="date"
                categories={revenueBreakdown.services}
                colors={["blue", "green", "purple", "orange", "red"]}
                valueFormatter={(value) => `$${value}`}
              />
            </div>
          </TabsContent>

          <TabsContent value="popularity">
            <div className="h-80">
              <PieChart
                data={statistics.servicePopularity}
                category="value"
                index="name"
                valueFormatter={(value) => `${value}%`}
                colors={["blue", "green", "purple", "orange", "red"]}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
