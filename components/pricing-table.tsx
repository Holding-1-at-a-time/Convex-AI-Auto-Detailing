"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollAnimation } from "@/components/scroll-animation"
import { Skeleton } from "@/components/skeleton"

interface PricingTier {
  name: string
  price: number
  description: string
  features: {
    text: string
    included: boolean
  }[]
  popular?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: 49,
    description: "Perfect for small detailing businesses just getting started",
    features: [
      { text: "AI Assistant", included: true },
      { text: "Appointment Scheduling", included: true },
      { text: "Customer Management", included: true },
      { text: "Basic Analytics", included: true },
      { text: "Email Support", included: true },
      { text: "Advanced Analytics", included: false },
      { text: "Inventory Management", included: false },
      { text: "Marketing Tools", included: false },
    ],
  },
  {
    name: "Professional",
    price: 99,
    description: "Ideal for growing detailing businesses with multiple staff",
    features: [
      { text: "AI Assistant", included: true },
      { text: "Appointment Scheduling", included: true },
      { text: "Customer Management", included: true },
      { text: "Basic Analytics", included: true },
      { text: "Priority Support", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Inventory Management", included: true },
      { text: "Marketing Tools", included: false },
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 199,
    description: "For established businesses with multiple locations",
    features: [
      { text: "AI Assistant", included: true },
      { text: "Appointment Scheduling", included: true },
      { text: "Customer Management", included: true },
      { text: "Basic Analytics", included: true },
      { text: "24/7 Support", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Inventory Management", included: true },
      { text: "Marketing Tools", included: true },
    ],
  },
]

export function PricingTable() {
  const [isLoading, setIsLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const getDiscountedPrice = (price: number) => {
    return isYearly ? Math.round(price * 0.8) : price
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-center mb-8">
          <Skeleton className="h-10 w-64 rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-primary/20">
              <CardHeader>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-center mb-8">
        <div className="bg-card/50 p-1 rounded-full flex items-center">
          <button
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              !isYearly ? "bg-primary text-white" : "text-secondary-100 hover:text-white",
            )}
            onClick={() => setIsYearly(false)}
          >
            Monthly
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              isYearly ? "bg-primary text-white" : "text-secondary-100 hover:text-white",
            )}
            onClick={() => setIsYearly(true)}
          >
            Yearly <span className="text-xs opacity-75">(20% off)</span>
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {pricingTiers.map((tier, index) => (
          <ScrollAnimation key={index} animation="fade-in-up" delay={index * 0.1}>
            <Card
              className={cn(
                "border border-primary/20 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 relative overflow-hidden h-full flex flex-col",
                tier.popular ? "border-primary/50 shadow-lg shadow-primary/10" : "",
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-white text-xs font-bold px-3 py-1 rotate-45 translate-x-2 -translate-y-1 shadow-md">
                    POPULAR
                  </div>
                </div>
              )}
              <CardHeader>
                <div className="text-lg font-medium text-secondary-100">{tier.name}</div>
                <div className="flex items-baseline mt-2">
                  <span className="text-4xl font-bold text-white">${getDiscountedPrice(tier.price)}</span>
                  <span className="ml-1 text-secondary-100">/month</span>
                </div>
                <p className="text-sm text-secondary-300 mt-2">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-secondary-100" : "text-secondary-400"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={cn(
                    "w-full",
                    tier.popular
                      ? "bg-primary hover:bg-primary-600 text-white animate-glow-pulse"
                      : "bg-card hover:bg-primary/20 text-primary border border-primary",
                  )}
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          </ScrollAnimation>
        ))}
      </div>
      <div className="text-center mt-6 text-sm text-secondary-300">
        All plans include a 14-day free trial. No credit card required.
      </div>
    </div>
  )
}
