import type { NextRequest } from "next/server"
import { clerkMiddleware } from "@clerk/nextjs/server"

// Mock Clerk middleware
jest.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: jest.fn(),
}))

const mockClerkMiddleware = clerkMiddleware as jest.MockedFunction<typeof clerkMiddleware>

describe("Middleware Access Control", () => {
  let mockAuth: any
  let mockReq: NextRequest
  let middlewareHandler: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockAuth = {
      userId: null,
      sessionClaims: null,
    }

    mockReq = {
      nextUrl: {
        pathname: "/",
      },
      url: "http://localhost:3000/",
    } as NextRequest

    // Capture the middleware handler
    mockClerkMiddleware.mockImplementation((handler) => {
      middlewareHandler = handler
      return jest.fn()
    })

    // Import middleware to register the handler
    require("@/middleware")
  })

  describe("Unauthenticated Users", () => {
    it("allows access to public routes", () => {
      mockReq.nextUrl.pathname = "/"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result).toBeUndefined() // NextResponse.next()
    })

    it("redirects to sign-in for protected routes", () => {
      mockReq.nextUrl.pathname = "/business/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/sign-in")
    })

    it("redirects to sign-in for customer routes", () => {
      mockReq.nextUrl.pathname = "/customer/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/sign-in")
    })
  })

  describe("Authenticated Users Without Role", () => {
    beforeEach(() => {
      mockAuth.userId = "user_123"
      mockAuth.sessionClaims = { metadata: {} }
    })

    it("redirects to role selection when role is not set", () => {
      mockReq.nextUrl.pathname = "/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/role-selection")
    })

    it("allows access to role selection page", () => {
      mockReq.nextUrl.pathname = "/role-selection"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result).toBeUndefined()
    })
  })

  describe("Business Users", () => {
    beforeEach(() => {
      mockAuth.userId = "user_123"
      mockAuth.sessionClaims = {
        metadata: {
          role: "business",
          onboardingComplete: true,
        },
      }
    })

    it("allows access to business routes", () => {
      mockReq.nextUrl.pathname = "/business/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result).toBeUndefined()
    })

    it("redirects to business dashboard when accessing customer routes", () => {
      mockReq.nextUrl.pathname = "/customer/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/business/dashboard")
    })

    it("redirects to onboarding when not completed", () => {
      mockAuth.sessionClaims.metadata.onboardingComplete = false
      mockReq.nextUrl.pathname = "/business/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/business/onboarding")
    })
  })

  describe("Customer Users", () => {
    beforeEach(() => {
      mockAuth.userId = "user_123"
      mockAuth.sessionClaims = {
        metadata: {
          role: "customer",
          onboardingComplete: true,
        },
      }
    })

    it("allows access to customer routes", () => {
      mockReq.nextUrl.pathname = "/customer/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result).toBeUndefined()
    })

    it("redirects to customer dashboard when accessing business routes", () => {
      mockReq.nextUrl.pathname = "/business/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/customer/dashboard")
    })

    it("redirects to onboarding when not completed", () => {
      mockAuth.sessionClaims.metadata.onboardingComplete = false
      mockReq.nextUrl.pathname = "/customer/dashboard"
      const result = middlewareHandler(mockAuth, mockReq)
      expect(result.headers.get("location")).toBe("/customer/onboarding")
    })
  })
})
