"use client"

import type React from "react"

import { ClerkProvider } from "@clerk/nextjs"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"
import { dark } from "@clerk/themes"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "hsl(var(--primary))",
          colorTextOnPrimaryBackground: "white",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={() => ({ isAuthenticated: true })}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
