# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment. The pipeline automates testing, building, and deploying the application to ensure code quality and reliability.

## CI Pipeline

The CI pipeline runs on every push to the `main` and `develop` branches, as well as on pull requests to these branches.

### Workflow Steps

1. **Lint**: Checks code style and quality using ESLint and Prettier
2. **Type Check**: Verifies TypeScript types
3. **Unit Tests**: Runs Jest unit tests
4. **Integration Tests**: Runs Jest integration tests
5. **E2E Tests**: Runs Playwright end-to-end tests in multiple browsers
6. **Build**: Builds the Next.js application
7. **Security Scan**: Performs security audits using npm audit and Snyk
8. **Lighthouse**: Runs performance tests using Lighthouse CI

### Environment Variables

The CI pipeline requires the following environment variables:

- `NEXT_PUBLIC_CONVEX_URL`: The URL for the Convex backend
- `CI`: Set to `true` to indicate the code is running in a CI environment

### Test Coverage

The CI pipeline enforces a minimum test coverage threshold of 70% for:
- Branches
- Functions
- Lines
- Statements

Coverage reports are uploaded to Codecov for visualization and tracking.

## CD Pipeline

The CD pipeline automatically deploys the application to Vercel.

### Preview Deployments

For pull requests, the pipeline creates preview deployments:

1. Tests the code using the CI pipeline
2. Deploys to a preview environment on Vercel
3. Comments on the PR with the preview URL

### Production Deployments

For pushes to the `main` branch, the pipeline deploys to production:

1. Tests the code using the CI pipeline
2. Deploys to the production environment on Vercel
3. Creates a GitHub release
4. Runs post-deployment tests to verify the deployment

### Environment Variables

The CD pipeline requires the following environment variables:

- `VERCEL_TOKEN`: API token for Vercel
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

## Setting Up CI Environment Variables

### GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add the following secrets:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `SNYK_TOKEN` (optional, for security scanning)

### CI Environment Variable

The `CI` environment variable is automatically set to `true` in GitHub Actions environments. You don't need to set this manually.

For local development, you can set it in your `.env.local` file:

\`\`\`
CI=true
\`\`\`

Or when running commands:

\`\`\`bash
CI=true npm test
\`\`\`

## Workflow Files

- `.github/workflows/ci.yml`: Main CI workflow
- `.github/workflows/deploy.yml`: Deployment workflow

## Monitoring and Notifications

The pipeline sends notifications for:

- Failed workflows
- Successful deployments
- Security vulnerabilities

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**:
   - Check for environment-specific code
   - Ensure all dependencies are properly installed
   - Verify test timeouts are sufficient for CI environment

2. **Deployment failures**:
   - Check Vercel logs for specific errors
   - Verify environment variables are correctly set
   - Check build output for warnings or errors

3. **Security scan failures**:
   - Review npm audit output
   - Update vulnerable dependencies
   - Add exceptions for false positives if necessary

### Getting Help

If you encounter issues with the CI/CD pipeline:

1. Check the GitHub Actions logs for detailed error messages
2. Review the documentation for the specific tool causing issues
3. Contact the development team for assistance

## Running CI Locally

You can run most CI checks locally before pushing:

### Pre-push Validation

\`\`\`bash
# Run all checks
npm run ci:local

# Or run individual checks
npm run lint
npm run type-check
npm run test
npm run build
\`\`\`

### Simulating CI Environment

To simulate the CI environment locally:

\`\`\`bash
# Set CI environment variable
export CI=true

# Run tests in CI mode
npm run test:ci

# Run E2E tests with CI configuration
npm run test:e2e:ci
\`\`\`

## Performance Benchmarks

The CI pipeline enforces the following performance benchmarks:

### Lighthouse Scores
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 90

### Build Metrics
- Build time: < 5 minutes
- Bundle size: < 500KB (gzipped)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s

## Branch Protection Rules

The following branch protection rules are enforced:

### Main Branch
- Require PR reviews (at least 1)
- Require status checks to pass
- Require branches to be up to date
- Include administrators
- Restrict who can push

### Required Status Checks
- lint
- type-check
- unit-tests
- integration-tests
- e2e-tests (all browsers)
- build
- security-scan

## Rollback Procedures

If a deployment causes issues in production:

### Immediate Rollback

1. Go to Vercel Dashboard
2. Navigate to the project
3. Click on "Deployments"
4. Find the last known good deployment
5. Click "..." menu and select "Promote to Production"

### Git Rollback

\`\`\`bash
# Revert the last commit
git revert HEAD
git push origin main

# Or revert to a specific commit
git revert <commit-hash>
git push origin main
\`\`\`

## Maintenance Windows

Deployments to production should ideally happen during:

- **Weekdays**: 10 AM - 4 PM (to ensure team availability)
- **Avoid**: Fridays after 3 PM
- **Emergency fixes**: Can be deployed anytime with proper notification

## Monitoring Post-Deployment

After deployment, monitor:

1. **Application Metrics**:
   - Error rates
   - Response times
   - User activity

2. **Infrastructure Metrics**:
   - CPU usage
   - Memory consumption
   - Request throughput

3. **Business Metrics**:
   - User engagement
   - Feature adoption
   - Conversion rates

## CI/CD Best Practices

1. **Keep workflows fast**: Parallelize where possible
2. **Cache dependencies**: Use GitHub Actions cache
3. **Fail fast**: Run quick checks first
4. **Clear feedback**: Provide actionable error messages
5. **Regular updates**: Keep dependencies and actions updated

## Future Improvements

Planned enhancements to the CI/CD pipeline:

1. **Automated dependency updates**: Using Dependabot
2. **Visual regression testing**: Automated screenshot comparisons
3. **Performance budgets**: Automated performance regression detection
4. **Deployment slots**: Blue-green deployments for zero-downtime
5. **Automated rollbacks**: Based on error thresholds

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
