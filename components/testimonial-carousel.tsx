"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"

interface Testimonial {
  id: number
  name: string
  role: string
  company: string
  content: string
  rating: number
  image: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Owner",
    company: "Pristine Auto Spa",
    content:
      "AutoDetailAI has completely transformed our business. We've increased bookings by 40% and reduced scheduling conflicts to almost zero. The AI recommendations have helped us upsell premium services effectively.",
    rating: 5,
    image: "/professional-woman-portrait.png",
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    role: "Manager",
    company: "Elite Detailing",
    content:
      "The time-saving features are incredible. What used to take us hours of administrative work now happens automatically. Our team can focus on what they do best - detailing cars to perfection.",
    rating: 5,
    image: "/professional-man-portrait.png",
  },
  {
    id: 3,
    name: "David Chen",
    role: "Founder",
    company: "Shine Supreme",
    content:
      "The customer insights from AutoDetailAI have been invaluable. We've been able to tailor our services based on data and feedback, resulting in a 35% increase in repeat business.",
    rating: 4,
    image: "/asian-man-business-portrait.png",
  },
]

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  const nextTestimonial = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setActiveIndex((current) => (current - 1 + testimonials.length) % testimonials.length)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-5" />
                  ))}
                </div>
                <Skeleton className="h-6 w-40 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-secondary-100">
          {activeIndex + 1} of {testimonials.length} testimonials
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevTestimonial}
            className="p-2 rounded-full bg-card hover:bg-primary/20 transition-colors duration-200"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={nextTestimonial}
            className="p-2 rounded-full bg-card hover:bg-primary/20 transition-colors duration-200"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="w-full flex-shrink-0">
              <Card className="bg-card/80 border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={testimonial.image || "/placeholder.svg"}
                        alt={testimonial.name}
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-secondary-100 italic mb-4">"{testimonial.content}"</p>
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-5 h-5",
                              i < testimonial.rating ? "text-primary fill-primary" : "text-gray-400",
                            )}
                          />
                        ))}
                      </div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-secondary-300">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-4 gap-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === activeIndex ? "bg-primary w-6" : "bg-primary/30",
            )}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
