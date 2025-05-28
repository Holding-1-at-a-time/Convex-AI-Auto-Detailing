import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ConvexClientProvider } from "@/components/convex-provider"
import { color } from "framer-motion"

export const metadata: Metadata = {
  title: "AutoDetailAI - AI-Powered Auto Detailing Assistant",
  description:
    "Get expert recommendations, predictive maintenance insights, and personalized detailing plans for your vehicle.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <html lang="en"
        className="light"
        suppressHydrationWarning={true}
      >
        <body>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html >
    </>
  )
}
