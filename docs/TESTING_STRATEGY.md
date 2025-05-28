# Testing Strategy Documentation

## Overview

This document outlines the comprehensive testing strategy for the Convex AI Auto Detailing project. Our testing approach ensures code quality, reliability, and maintainability across all components.

## Testing Pyramid

We follow the testing pyramid approach:

\`\`\`
        /\
       /E2E\
      /-----\
     / Integ \
    /---------\
   /   Unit    \
  /-------------\
 / Static Analysis\
/------------------\
\`\`\`

### Distribution
- **Static Analysis**: 10% (TypeScript, ESLint, Prettier)
- **Unit Tests**: 60% (Component and function testing)
- **Integration Tests**: 20% (API and feature testing)
- **E2E Tests**: 10% (Critical user journeys)

## Test Categories

### 1. Static Analysis

**Tools**: TypeScript, ESLint, Prettier

**Purpose**: Catch errors before runtime

\`\`\`bash
npm run lint
npm run type-check
npm run format:check
\`\`\`

### 2. Unit Tests

**Tool**: Jest + React Testing Library

**Coverage**: 
- React Components
- Custom Hooks
- Utility Functions
- Convex Functions

**Example**:
\`\`\`typescript
describe('VehicleCard', () => {
  it('displays vehicle information correctly', () => {
    const vehicle = {
      make: 'Toyota',
      model: 'Camry',
      year: 2022
    };
    
    render(<VehicleCard vehicle={vehicle} />);
    
    expect(screen.getByText('2022 Toyota Camry')).toBeInTheDocument();
  });
});
\`\`\`

### 3. Integration Tests

**Tool**: Jest + MSW (Mock Service Worker)

**Coverage**:
- API integrations
- Convex mutations/queries
- Multi-component interactions
- Authentication flows

**Example**:
\`\`\`typescript
describe('Chat Flow Integration', () => {
  it('sends message and displays response', async () => {
    render(<ChatPage />);
    
    const input = screen.getByPlaceholderText(/ask about auto detailing/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await userEvent.type(input, 'How to remove water spots?');
    await userEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/water spots can be removed/i)).toBeInTheDocument();
    });
  });
});
\`\`\`

### 4. E2E Tests

**Tool**: Playwright

**Coverage**:
- Critical user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Performance metrics

**Example**:
\`\`\`typescript
test('complete vehicle assessment flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Enter Experience');
  await page.click('text=Chat Assistant');
  
  await page.fill('[placeholder*="Ask about"]', 'Assess my car condition');
  await page.click('[aria-label="Send"]');
  
  await expect(page.locator('text=condition assessment')).toBeVisible();
});
\`\`\`

## Testing Guidelines

### Component Testing

1. **Test user interactions**, not implementation details
2. **Use data-testid** sparingly, prefer accessible queries
3. **Mock external dependencies** (API calls, browser APIs)
4. **Test error states** and edge cases
5. **Verify accessibility** with jest-axe

### Convex Testing

1. **Test mutations and queries** independently
2. **Mock database operations** in unit tests
3. **Test error handling** and validation
4. **Verify indexes** are used correctly
5. **Test real-time subscriptions** with integration tests

### Performance Testing

1. **Measure bundle sizes** with each build
2. **Monitor render performance** with React DevTools
3. **Test loading states** and lazy loading
4. **Verify image optimization** and caching
5. **Check memory leaks** in long-running operations

## Test Data Management

### Fixtures

Location: `__tests__/fixtures/`

\`\`\`typescript
// vehicles.fixtures.ts
export const mockVehicle = {
  _id: 'vehicle_123',
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  userId: 'user_123',
  detailingScore: 85
};
\`\`\`

### Factories

Location: `__tests__/factories/`

\`\`\`typescript
// vehicle.factory.ts
export const createVehicle = (overrides = {}) => ({
  _id: generateId(),
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  ...overrides
});
\`\`\`

### Seed Data

For E2E tests, use consistent seed data:

\`\`\`typescript
// e2e/seed-data.ts
export const seedDatabase = async () => {
  await createUser({ email: 'test@example.com' });
  await createVehicle({ userId: 'test_user' });
  await createDetailingRecord({ vehicleId: 'test_vehicle' });
};
\`\`\`

## Continuous Testing

### Pre-commit Hooks

\`\`\`bash
# .husky/pre-commit
npm run lint-staged
npm run type-check
\`\`\`

### Pre-push Hooks

\`\`\`bash
# .husky/pre-push
npm run test:unit
\`\`\`

### CI Pipeline

All tests run on:
- Pull requests
- Pushes to main/develop
- Scheduled (nightly full suite)

## Test Reporting

### Coverage Reports

- **Format**: LCOV, HTML
- **Location**: `coverage/`
- **Thresholds**: 70% minimum
- **Integration**: Codecov

### Test Results

- **Format**: JUnit XML
- **Location**: `test-results/`
- **Integration**: GitHub Actions

### Performance Reports

- **Tool**: Lighthouse CI
- **Metrics**: Core Web Vitals
- **Storage**: Lighthouse CI Server

## Debugging Tests

### Local Debugging

\`\`\`bash
# Run tests in watch mode
npm run test:watch

# Debug specific test
npm run test:debug -- --testNamePattern="should render"

# Run with coverage
npm run test:coverage
\`\`\`

### CI Debugging

1. **Download artifacts** from failed runs
2. **Use act** to run GitHub Actions locally
3. **Enable debug logging** with `ACTIONS_STEP_DEBUG=true`
4. **Add console.logs** temporarily for investigation

## Test Maintenance

### Regular Tasks

1. **Weekly**: Review and update flaky tests
2. **Monthly**: Update test dependencies
3. **Quarterly**: Review test coverage gaps
4. **Yearly**: Refactor test architecture

### Deprecation Strategy

When removing features:
1. Mark tests as `.skip` with deprecation note
2. Remove after one release cycle
3. Update documentation

## Anti-Patterns to Avoid

1. **Testing implementation details**
   \`\`\`typescript
   // Bad
   expect(component.state.isOpen).toBe(true);
   
   // Good
   expect(screen.getByRole('dialog')).toBeVisible();
   \`\`\`

2. **Excessive mocking**
   \`\`\`typescript
   // Bad
   jest.mock('entire-module');
   
   // Good
   jest.mock('external-api-call');
   \`\`\`

3. **Brittle selectors**
   \`\`\`typescript
   // Bad
   page.click('.btn-primary-2xl-new');
   
   // Good
   page.click('button[aria-label="Submit"]');
   \`\`\`

## Resources

- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
