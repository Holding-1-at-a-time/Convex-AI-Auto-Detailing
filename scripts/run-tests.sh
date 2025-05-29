#!/bin/bash

echo "🧪 Running AutoDetailAI Test Suite"
echo "=================================="

# Run specific test suites
echo "🔐 Testing Authentication & Role Management..."
npm test -- --testPathPattern="auth"

echo "🛡️ Testing Access Control..."
npm test -- --testPathPattern="middleware"

echo "📊 Testing Business Dashboard..."
npm test -- --testPathPattern="business-dashboard"

echo "🚗 Testing Customer Dashboard..."
npm test -- --testPathPattern="customer-dashboard"

echo "🔄 Testing Convex Functions..."
npm test -- --testPathPattern="convex"

echo "🔗 Testing Integration Flow..."
npm test -- --testPathPattern="integration"

echo "📈 Generating Coverage Report..."
npm run test:coverage

echo "✅ All tests completed!"
