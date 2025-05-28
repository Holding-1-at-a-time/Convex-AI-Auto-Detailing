import { clerkMiddleware } from "@clerk/nextjs/server"

export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(jpg|jpeg|png|gif|svg|ico|webp|js|css)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
