# Testing Guide

## Overview

This project uses a comprehensive testing strategy including unit tests, integration tests, and end-to-end tests.

## Test Structure

\`\`\`
__tests__/
├── unit/           # Unit tests for individual components and functions
├── integration/    # Integration tests for feature flows
├── performance/    # Performance and load tests
├── utils/          # Test utilities and helpers
└── mocks/          # Mock data and handlers

e2e/               # End-to-end tests using Playwright
\`\`\`

## Running Tests

### All Tests
\`\`\`bash
npm test
\`\`\`

### Unit Tests Only
\`\`\`bash
npm run test:unit
\`\`\`

### Integration Tests Only
\`\`\`bash
npm run test:integration
\`\`\`

### E2E Tests
\`\`\`bash
npm run test:e2e
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

### Coverage Report
\`\`\`bash
npm run test:coverage
\`\`\`

## Writing Tests

### Unit Tests

Unit tests should focus on testing individual components or functions in isolation.

\`\`\`typescript
import { render, screen } from '@/test-utils'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
\`\`\`

### Integration Tests

Integration tests should test complete user flows.

\`\`\`typescript
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { UserFlow } from '@/features/user-flow'

describe('User Flow', () => {
  it('completes the entire flow', async () => {
    render(<UserFlow />)
    
    // Step 1
    fireEvent.click(screen.getByText('Start'))
    
    // Step 2
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument()
    })
    
    // Continue...
  })
})
\`\`\`

### E2E Tests

E2E tests should test the application as a real user would use it.

\`\`\`typescript
import { test, expect } from '@playwright/test'

test('user can complete task', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Get Started')
  await expect(page).toHaveURL('/dashboard')
})
\`\`\`

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Mock External Dependencies**: Use MSW for API mocking
4. **Test User Behavior**: Focus on testing what users do, not implementation details
5. **Keep Tests Independent**: Each test should be able to run in isolation
6. **Use Test Utilities**: Leverage the custom render function and test factories

## Debugging Tests

### VSCode Debugging

Add this configuration to `.vscode/launch.json`:

\`\`\`json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--watchAll=false"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
\`\`\`

### Playwright Debugging

\`\`\`bash
# Run with UI mode
npm run test:e2e:ui

# Debug a specific test
npx playwright test --debug
\`\`\`

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Before production deployments

See `.github/workflows/ci.yml` for the complete pipeline configuration.
