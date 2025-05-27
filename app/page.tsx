import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteLayout } from "@/components/site-layout"

export default function Home() {
  return (
    <SiteLayout>
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                AI-Powered Auto Detailing Assistant
              </h1>
              <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Get expert recommendations, predictive maintenance insights, and personalized detailing plans for your
                vehicle.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/chat">
                  <Button size="lg" className="w-full min-[400px]:w-auto">
                    Chat with Assistant
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="w-full min-[400px]:w-auto">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
            <img
              src="/ai-car-detailing.png"
              alt="AI Auto Detailing"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
            />
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Key Features</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our AI-powered assistant provides comprehensive auto detailing support
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Predictive Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Anticipate maintenance needs based on vehicle data, usage patterns, and environmental factors.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Personalized Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Get customized detailing recommendations based on your vehicle's specific needs and your preferences.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Access a comprehensive database of detailing techniques, products, and solutions for various issues.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
