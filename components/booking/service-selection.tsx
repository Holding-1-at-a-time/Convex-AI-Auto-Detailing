"use client"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface ServiceSelectionProps {
  businessId?: string
  onServiceSelect: (serviceId: string, service: any) => void
  selectedServiceId?: string
}

export function ServiceSelection({ businessId, onServiceSelect, selectedServiceId }: ServiceSelectionProps) {
  const services = useQuery(api.services.getServicesByBusiness, businessId ? { businessId } : "skip")

  if (services === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No services available at this time.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select a Service</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service._id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedServiceId === service._id ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
            }`}
            onClick={() => onServiceSelect(service._id, service)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <CardDescription className="mt-1">{service.description}</CardDescription>
                </div>
                {selectedServiceId === service._id && <Badge variant="default">Selected</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration || "60"} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${service.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
