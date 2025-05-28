import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

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
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
