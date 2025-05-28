import { authMiddleware, redirectToSignIn } from "@clerk/nextjs"
import { NextResponse } from "next/server"

export default authMiddleware({
  publicRoutes: ["/", "/privacy", "/terms", "/api(.*)", "/_vercel(.*)"],
  afterAuth(auth, req) {
    // If the user is logged in and trying to access a protected route, allow them
    if (auth.userId && !auth.isPublicRoute) {
      return NextResponse.next()
    }

    // If the user is not logged in and trying to access a protected route, redirect them to sign in
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url })
    }

    // Allow users to access public routes
    return NextResponse.next()
  },
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
