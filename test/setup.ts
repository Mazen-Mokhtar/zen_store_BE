import { config } from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Suppress console logs during tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up any global resources
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Common test utilities
export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  distinct: jest.fn(),
  populate: jest.fn(),
  exec: jest.fn(),
});

export const createMockModel = () => {
  const mockModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue(dto),
    toObject: jest.fn().mockReturnValue(dto),
    toJSON: jest.fn().mockReturnValue(dto),
  }));

  Object.assign(mockModel, createMockRepository());
  return mockModel;
};

// Database test utilities
export class DatabaseTestUtils {
  private static mongoServer: MongoMemoryServer;

  static async setupInMemoryDatabase(): Promise<string> {
    this.mongoServer = await MongoMemoryServer.create();
    return this.mongoServer.getUri();
  }

  static async teardownInMemoryDatabase(): Promise<void> {
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }
}

// Mock services
export const createMockService = (methods: string[]) => {
  const mockService = {};
  methods.forEach((method) => {
    mockService[method] = jest.fn();
  });
  return mockService;
};

// HTTP test utilities
export const createMockRequest = (overrides = {}) => ({
  user: { id: 'test-user-id', email: 'test@example.com' },
  headers: {},
  query: {},
  params: {},
  body: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
};

// Authentication test utilities
export const createMockAuthGuard = (shouldPass = true) => {
  return {
    canActivate: jest.fn().mockReturnValue(shouldPass),
  };
};

export const createMockRoleGuard = (shouldPass = true) => {
  return {
    canActivate: jest.fn().mockReturnValue(shouldPass),
  };
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  _id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestGame = (overrides = {}) => ({
  _id: 'test-game-id',
  name: 'Test Game',
  description: 'Test game description',
  price: 29.99,
  category: 'action',
  isActive: true,
  isPopular: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestPackage = (overrides = {}) => ({
  _id: 'test-package-id',
  name: 'Test Package',
  description: 'Test package description',
  price: 19.99,
  gameId: 'test-game-id',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestOrder = (overrides = {}) => ({
  _id: 'test-order-id',
  userId: 'test-user-id',
  items: [],
  totalAmount: 0,
  status: 'pending',
  paymentStatus: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Async test utilities
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const expectAsync = async (
  fn: () => Promise<any>,
  expectedError?: any,
) => {
  try {
    await fn();
    if (expectedError) {
      throw new Error('Expected function to throw an error');
    }
  } catch (error) {
    if (expectedError) {
      expect(error).toEqual(expectedError);
    } else {
      throw error;
    }
  }
};
