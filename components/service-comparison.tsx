"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react"
import Link from "next/link"

export default function ServiceComparison() {
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  // Fetch all active services
  const services = useQuery(api.services.getAllServicePackages, { activeOnly: true }) || []

  // Get selected service details
  const comparisonServices = services.filter((service) => selectedServices.includes(service._id))

  // Get all unique features from selected services
  const allFeatures = new Set<string>()
  comparisonServices.forEach((service) => {
    if (service.features) {
      service.features.forEach((feature) => allFeatures.add(feature))
    }
  })

  // Add a service to comparison
  const addService = (serviceId: string) => {
    if (selectedServices.length < 3 && !selectedServices.includes(serviceId)) {
      setSelectedServices([...selectedServices, serviceId])
    }
  }

  // Remove a service from comparison
  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((id) => id !== serviceId))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare Services</CardTitle>
        <CardDescription>Select up to 3 services to compare their features and pricing</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Service Selection */}
        <div className="mb-6">
          <Select onValueChange={addService} disabled={selectedServices.length >= 3} value="">
            <SelectTrigger>
              <SelectValue
                placeholder={selectedServices.length >= 3 ? "Maximum services selected" : "Add service to compare"}
              />
            </SelectTrigger>
            <SelectContent>
              {services
                .filter((service) => !selectedServices.includes(service._id))
                .map((service) => (
                  <SelectItem key={service._id} value={service._id}>
                    {service.name} - ${service.price.toFixed(2)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Table */}
        {comparisonServices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Feature</TableHead>
                  {comparisonServices.map((service) => (
                    <TableHead key={service._id} className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold">{service.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service._id)}
                          className="text-xs mt-1"
                        >
                          Remove
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Basic Info Rows */}
                <TableRow>
                  <TableCell className="font-medium">Price</TableCell>
                  {comparisonServices.map((service) => (
                    <TableCell key={service._id} className="text-center">
                      <div className="flex items-center justify-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {service.price.toFixed(2)}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Duration</TableCell>
                  {comparisonServices.map((service) => (
                    <TableCell key={service._id} className="text-center">
                      <div className="flex items-center justify-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {service.duration} min
                      </div>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Features Rows */}
                {Array.from(allFeatures).map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="font-medium">{feature}</TableCell>
                    {comparisonServices.map((service) => (
                      <TableCell key={service._id} className="text-center">
                        {service.features?.includes(feature) ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Action Row */}
                <TableRow>
                  <TableCell className="font-medium">Book Now</TableCell>
                  {comparisonServices.map((service) => (
                    <TableCell key={service._id} className="text-center">
                      <Button size="sm" asChild>
                        <Link href={`/customer/book?service=${service._id}`}>Book</Link>
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Select services to compare their features and pricing</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
