import { setupServer } from "msw/node"
import { handlers } from "./handlers"
import { beforeAll, afterEach, afterAll } from "vitest"

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }))

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
