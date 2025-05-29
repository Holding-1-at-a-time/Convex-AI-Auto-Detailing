/**
 * Setup file for hook tests
 */

import "@testing-library/jest-dom"
import { configure } from "@testing-library/react"
import { jest } from "@jest/globals"

// Configure testing library
configure({
  testIdAttribute: "data-testid",
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock scrollTo
Object.defineProperty(window, "scrollTo", {
  value: jest.fn(),
  writable: true,
})

// Suppress console warnings in tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning: ReactDOM.render is no longer supported")) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})

// Global test timeout
jest.setTimeout(10000)
