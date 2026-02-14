// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'file:./test.db'

// Mock AWS SDK to avoid requiring real credentials in tests
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  InvokeModelCommand: jest.fn(),
}))

// Suppress console errors during tests (optional - remove if you want to see them)
// global.console.error = jest.fn()

// Add custom matchers if needed
expect.extend({
  // Custom matchers can be added here
})
