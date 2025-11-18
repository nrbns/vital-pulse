// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pulse_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1'; // Use DB 1 for tests

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock external services
jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-sid' })
    }
  }))
}));

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    messaging: () => ({
      send: jest.fn().mockResolvedValue({ success: true }),
      sendMulticast: jest.fn().mockResolvedValue({ successCount: 1 })
    }),
    initializeApp: jest.fn()
  }
}));

