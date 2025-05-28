// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware((auth, req) => {
  const { userId, sessionClaims } = auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;

  if (userId && !onboardingComplete && !req.nextUrl.pathname.startsWith("/onboarding")) {
    return Response.redirect(new URL("/onboarding", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
