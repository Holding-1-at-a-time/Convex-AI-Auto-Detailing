"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ScrollAnimation } from "@/components/scroll-animation"
import { Sparkles, Shield, Zap, Clock, Calendar, TrendingUp, Users } from "lucide-react"
import { TestimonialCarousel } from "@/components/testimonial-carousel"
import { FAQAccordion } from "@/components/faq-accordion"
import { PricingTable } from "@/components/pricing-table"
import { AnimatedCounter } from "@/components/animated-counter"
import { AnimatedBackground } from "@/components/animated-background"
import { useParallax } from "@/hooks/use-parallax"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const scrollY = useParallax()

  useEffect(() => {
    // Simulate initial page loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center flex-col gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <div className="text-primary font-medium animate-pulse">Loading AutoDetailAI...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      <AnimatedBackground />
      <SiteHeader />
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80 z-0"></div>

          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float"
              style={{ animationDelay: "0s", transform: `translateY(${scrollY * 0.1}px)` }}
            ></div>
            <div
              className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float"
              style={{ animationDelay: "1s", transform: `translateY(${scrollY * -0.15}px)` }}
            ></div>
            <div
              className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float"
              style={{ animationDelay: "2s", transform: `translateY(${scrollY * 0.05}px)` }}
            ></div>
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-6">
                <ScrollAnimation animation="fade-in-right">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl gradient-text">
                    AI-Powered Auto Detailing Assistant
                  </h1>
                </ScrollAnimation>
                <ScrollAnimation animation="fade-in-right" delay={0.2}>
                  <p className="text-secondary-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed max-w-[600px]">
                    Get expert recommendations, predictive maintenance insights, and personalized detailing plans for
                    your vehicle.
                  </p>
                </ScrollAnimation>
                <ScrollAnimation animation="fade-in-up" delay={0.4}>
                  <div className="flex flex-col gap-3 min-[400px]:flex-row">
                    <a href="#pricing">
                      <Button
                        size="lg"
                        className="w-full min-[400px]:w-auto bg-primary hover:bg-primary-600 text-white animate-glow-pulse group transition-all duration-300"
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-300">
                          Get Started Now
                        </span>
                      </Button>
                    </a>
                  </div>
                </ScrollAnimation>
              </div>
              <ScrollAnimation animation="fade-in-left" delay={0.3}>
                <div
                  className="hero-glow rounded-xl overflow-hidden"
                  style={{ transform: `translateY(${scrollY * -0.1}px)` }}
                >
                  <img
                    src="/ai-car-detailing.png"
                    alt="AI Auto Detailing"
                    className="mx-auto aspect-video object-cover sm:w-full lg:order-last rounded-xl shadow-lg"
                  />
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 md:py-24 bg-card/30 relative">
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50"
            style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          ></div>
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="fade-in-down">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 neon-text">
                Save Time & Boost Efficiency
              </h2>
            </ScrollAnimation>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <ScrollAnimation animation="scale-in" delay={0.1}>
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text mb-2">
                    <AnimatedCounter end={68} suffix="%" />
                  </div>
                  <p className="text-secondary-100">Reduction in Administrative Work</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation animation="scale-in" delay={0.2}>
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text mb-2">
                    <AnimatedCounter end={12.5} prefix="+" suffix=" hrs" decimalPlaces={1} />
                  </div>
                  <p className="text-secondary-100">Time Saved Weekly</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation animation="scale-in" delay={0.3}>
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text mb-2">
                    <AnimatedCounter end={42} suffix="%" />
                  </div>
                  <p className="text-secondary-100">Increase in Booking Efficiency</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation animation="scale-in" delay={0.4}>
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text mb-2">
                    <AnimatedCounter end={3.2} prefix="$" suffix="K" decimalPlaces={1} />
                  </div>
                  <p className="text-secondary-100">Average Monthly Savings</p>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card/50 relative">
          <div
            className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-30"
            style={{ transform: `translateY(${scrollY * -0.05}px)` }}
          ></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <ScrollAnimation animation="fade-in-up">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl neon-text">
                    Key Features
                  </h2>
                  <p className="max-w-[900px] text-secondary-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Our AI-powered assistant provides comprehensive auto detailing support
                  </p>
                </div>
              </ScrollAnimation>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-8">
              {/* Feature Card 1 */}
              <ScrollAnimation animation="fade-in-up" delay={0.1}>
                <Card className="bg-card/80 border-primary/20 card-3d h-full group">
                  <CardHeader className="pb-2">
                    <Zap className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                    <CardTitle className="text-primary">Predictive Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-secondary-100">
                      Anticipate maintenance needs based on vehicle data, usage patterns, and environmental factors.
                    </p>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              {/* Feature Card 2 */}
              <ScrollAnimation animation="fade-in-up" delay={0.2}>
                <Card className="bg-card/80 border-primary/20 card-3d h-full group">
                  <CardHeader className="pb-2">
                    <Sparkles className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                    <CardTitle className="text-primary">Personalized Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-secondary-100">
                      Get customized detailing recommendations based on your vehicle's specific needs and your
                      preferences.
                    </p>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              {/* Feature Card 3 */}
              <ScrollAnimation animation="fade-in-up" delay={0.3}>
                <Card className="bg-card/80 border-primary/20 card-3d h-full group">
                  <CardHeader className="pb-2">
                    <Shield className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                    <CardTitle className="text-primary">Knowledge Base</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-secondary-100">
                      Access a comprehensive database of detailing techniques, products, and solutions for various
                      issues.
                    </p>
                  </CardContent>
                </Card>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Time-Saving Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative">
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="fade-in-down">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 gradient-text">
                Time-Saving Features
              </h2>
            </ScrollAnimation>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <ScrollAnimation animation="fade-in-right">
                  <div className="space-y-8">
                    <div className="flex gap-4 items-start group">
                      <div className="bg-primary/20 p-3 rounded-lg group-hover:bg-primary/30 transition-colors duration-300">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                          Automated Scheduling
                        </h3>
                        <p className="text-secondary-100">
                          Save <span className="text-primary font-medium">5+ hours weekly</span> with AI-powered
                          appointment scheduling that prevents double-bookings and optimizes your calendar.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start group">
                      <div className="bg-primary/20 p-3 rounded-lg group-hover:bg-primary/30 transition-colors duration-300">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                          Smart Reminders
                        </h3>
                        <p className="text-secondary-100">
                          Reduce no-shows by <span className="text-primary font-medium">78%</span> with automated
                          reminders and follow-ups that keep your schedule full and clients informed.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start group">
                      <div className="bg-primary/20 p-3 rounded-lg group-hover:bg-primary/30 transition-colors duration-300">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                          Business Analytics
                        </h3>
                        <p className="text-secondary-100">
                          Make data-driven decisions in{" "}
                          <span className="text-primary font-medium">minutes, not hours</span>, with real-time insights
                          into your business performance and customer trends.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start group">
                      <div className="bg-primary/20 p-3 rounded-lg group-hover:bg-primary/30 transition-colors duration-300">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                          Customer Management
                        </h3>
                        <p className="text-secondary-100">
                          Increase customer retention by <span className="text-primary font-medium">42%</span> with
                          personalized service recommendations and automated follow-ups.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              </div>
              <div className="order-1 md:order-2">
                <ScrollAnimation animation="fade-in-left">
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{ transform: `translateY(${scrollY * 0.05}px)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 opacity-70 mix-blend-overlay"></div>
                    <img
                      src="/business-owner-saving-time.png"
                      alt="Time-saving features"
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-card/30 relative">
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50"
            style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          ></div>
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="fade-in-up">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 neon-text">
                What Our Customers Say
              </h2>
            </ScrollAnimation>
            <ScrollAnimation animation="fade-in-up" delay={0.2}>
              <TestimonialCarousel />
            </ScrollAnimation>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 relative">
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="fade-in-up">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-4 gradient-text">
                Simple, Transparent Pricing
              </h2>
              <p className="text-center text-secondary-100 max-w-[800px] mx-auto mb-12">
                Choose the plan that's right for your business. All plans include core features with no hidden fees.
              </p>
            </ScrollAnimation>
            <ScrollAnimation animation="fade-in-up" delay={0.2}>
              <PricingTable />
            </ScrollAnimation>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-card/30 relative">
          <div
            className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-30"
            style={{ transform: `translateY(${scrollY * -0.05}px)` }}
          ></div>
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="fade-in-up">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-4 neon-text">
                Frequently Asked Questions
              </h2>
              <p className="text-center text-secondary-100 max-w-[800px] mx-auto mb-12">
                Find answers to common questions about our platform and services.
              </p>
            </ScrollAnimation>
            <ScrollAnimation animation="fade-in-up" delay={0.2}>
              <FAQAccordion />
            </ScrollAnimation>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-card/50 relative">
          <div className="container px-4 md:px-6 relative">
            <ScrollAnimation animation="scale-in">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2 max-w-[800px]">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
                    Ready to Transform Your Auto Detailing Business?
                  </h2>
                  <p className="text-secondary-100 md:text-xl/relaxed">
                    Join thousands of professionals using our AI assistant to deliver exceptional service
                  </p>
                </div>
                <ScrollAnimation animation="fade-in-up" delay={0.2}>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <a href="#pricing">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-primary hover:bg-primary-600 text-white animate-glow-pulse group transition-all duration-300"
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-300">
                          Get Started Now
                        </span>
                      </Button>
                    </a>
                  </div>
                </ScrollAnimation>
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
