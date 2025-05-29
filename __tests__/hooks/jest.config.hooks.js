/**
 * Jest configuration specifically for hook testing
 */

module.exports = {
  displayName: "Custom Hooks",
  testMatch: ["**/__tests__/hooks/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/hooks/setup-hooks-tests.ts"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: ["hooks/**/*.{ts,tsx}", "!hooks/**/*.d.ts", "!hooks/**/index.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  maxWorkers: 4,
  testTimeout: 10000,
}
