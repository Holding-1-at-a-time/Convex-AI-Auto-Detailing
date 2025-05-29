import type { NextRequest } from "next/server"
import { jest } from "@jest/globals"

// Mock @clerk/nextjs/server
const mockAuth = jest.fn()
const mockClerkMiddleware = jest.fn()

jest.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (callback: Function) => {
    mockClerkMiddleware.mockImplementation(callback)
    return mockClerkMiddleware
  },
}))

// Mock NextResponse
const mockRedirect = jest.fn()
const mockNext = jest.fn()

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
  },
}))

// Import the actual middleware after mocking
import middleware from "@/middleware"

describe("Middleware Access Control", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNext.mockReturnValue({ status: 200 })
    mockRedirect.mockReturnValue({ status: 302 })
  })

  const createMockRequest = (pathname: string) => {
    return {
      nextUrl: {
        pathname,
      },
      url: `http://localhost:3000${pathname}`,
    } as NextRequest
  }

  it("allows unauthenticated users to access public routes", () => {
    const req = createMockRequest("/")
    const mockAuthData = { userId: null, sessionClaims: null }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    const result = mockClerkMiddleware(mockAuthData, req)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("redirects unauthenticated users from protected routes", () => {
    const req = createMockRequest("/business/dashboard")
    const mockAuthData = { userId: null, sessionClaims: null }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockRedirect).toHaveBeenCalledWith(new URL("/sign-in", req.url))
  })

  it("redirects users without roles to role selection", () => {
    const req = createMockRequest("/dashboard")
    const mockAuthData = {
      userId: "user_123",
      sessionClaims: { metadata: {} },
    }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockRedirect).toHaveBeenCalledWith(new URL("/role-selection", req.url))
  })

  it("redirects users with incomplete onboarding", () => {
    const req = createMockRequest("/business/dashboard")
    const mockAuthData = {
      userId: "user_123",
      sessionClaims: {
        metadata: { role: "business", onboardingComplete: false },
      },
    }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockRedirect).toHaveBeenCalledWith(new URL("/business/onboarding", req.url))
  })

  it("prevents business users from accessing customer routes", () => {
    const req = createMockRequest("/customer/dashboard")
    const mockAuthData = {
      userId: "user_123",
      sessionClaims: {
        metadata: { role: "business", onboardingComplete: true },
      },
    }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockRedirect).toHaveBeenCalledWith(new URL("/business/dashboard", req.url))
  })

  it("prevents customer users from accessing business routes", () => {
    const req = createMockRequest("/business/dashboard")
    const mockAuthData = {
      userId: "user_123",
      sessionClaims: {
        metadata: { role: "customer", onboardingComplete: true },
      },
    }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockRedirect).toHaveBeenCalledWith(new URL("/customer/dashboard", req.url))
  })

  it("allows authenticated users with complete onboarding to access their routes", () => {
    const req = createMockRequest("/business/dashboard")
    const mockAuthData = {
      userId: "user_123",
      sessionClaims: {
        metadata: { role: "business", onboardingComplete: true },
      },
    }

    mockClerkMiddleware.mockImplementation((auth, req) => {
      return middleware(mockAuthData, req)
    })

    mockClerkMiddleware(mockAuthData, req)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
