import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export default clerkMiddleware((auth, req) => {
  const { userId, sessionClaims } = auth()
  const role = sessionClaims?.metadata?.role
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete
  const path = req.nextUrl.pathname

  // If user is not logged in, allow access to public routes
  if (!userId) {
    // If trying to access protected routes, redirect to sign-in
    if (path.startsWith("/business/") || path.startsWith("/customer/") || path === "/dashboard") {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }
    return NextResponse.next()
  }

  // Handle role-specific routing
  if (userId) {
    // If role is not set and not on role selection page, redirect to role selection
    if (!role && !path.startsWith("/role-selection")) {
      return NextResponse.redirect(new URL("/role-selection", req.url))
    }

    // If onboarding is not complete and not on onboarding pages, redirect to appropriate onboarding
    if (role && !onboardingComplete && !path.startsWith(`/${role}/onboarding`) && !path.startsWith("/role-selection")) {
      return NextResponse.redirect(new URL(`/${role}/onboarding`, req.url))
    }

    // Prevent business users from accessing customer routes and vice versa
    if (role === "business" && path.startsWith("/customer/")) {
      return NextResponse.redirect(new URL("/business/dashboard", req.url))
    }

    if (role === "customer" && path.startsWith("/business/")) {
      return NextResponse.redirect(new URL("/customer/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
