"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"

export default function DashboardPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  // This would be replaced with actual Convex queries
  const vehicleData = useQuery(api.vehicles.getVehicleData) || {
    make: "Toyota",
    model: "Camry",
    year: 2022,
    lastDetailing: "2025-04-15",
    detailingScore: 85,
    recommendations: [
      { id: 1, title: "Wax exterior", priority: "high", dueDate: "2025-05-30" },
      { id: 2, title: "Clean interior vents", priority: "medium", dueDate: "2025-06-15" },
      { id: 3, title: "Replace cabin air filter", priority: "low", dueDate: "2025-07-01" },
    ],
    history: [
      { id: 1, date: "2025-04-15", service: "Full Detailing", notes: "Complete interior and exterior detailing" },
      { id: 2, date: "2025-03-01", service: "Wash & Wax", notes: "Basic wash and wax service" },
      { id: 3, date: "2025-02-01", service: "Interior Cleaning", notes: "Vacuum and dashboard cleaning" },
    ],
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Vehicle Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Make:</span>
                <span className="font-medium">{vehicleData.make}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{vehicleData.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year:</span>
                <span className="font-medium">{vehicleData.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Detailing:</span>
                <span className="font-medium">{vehicleData.lastDetailing}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Detailing Score</CardTitle>
            <CardDescription>Current condition of your vehicle</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="text-4xl font-bold">{vehicleData.detailingScore}/100</div>
              <Progress value={vehicleData.detailingScore} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {vehicleData.detailingScore > 80
                  ? "Excellent condition"
                  : vehicleData.detailingScore > 60
                    ? "Good condition"
                    : "Needs attention"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Maintenance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
        </TabsList>
        <TabsContent value="recommendations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailing Recommendations</CardTitle>
              <CardDescription>AI-generated recommendations based on your vehicle's condition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicleData.recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-medium">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground">Due: {rec.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "outline"
                        }
                      >
                        {rec.priority}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service History</CardTitle>
              <CardDescription>Past detailing and maintenance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicleData.history.map((item) => (
                  <div key={item.id} className="border-b pb-3">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">{item.service}</h3>
                      <span className="text-sm text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-sm">{item.notes}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
