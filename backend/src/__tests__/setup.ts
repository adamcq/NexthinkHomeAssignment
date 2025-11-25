// Jest setup file for test environment
import { jest } from '@jest/globals';

// Increase timeout for API tests
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.PORT = '3000';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests
  log: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
