import { config } from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createClient } from 'redis';

// Load test environment
config({ path: '.env.test' });

let mongoServer: MongoMemoryServer;
let redisClient: any;

export default async function globalSetup() {
  console.log('🚀 Setting up global test environment...');

  try {
    // Setup in-memory MongoDB
    console.log('📦 Starting MongoDB Memory Server...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'zenstore_test',
        port: 27017,
      },
    });

    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    console.log(`✅ MongoDB Memory Server started at: ${mongoUri}`);

    // Setup Redis for testing (if needed)
    if (process.env.REDIS_URL) {
      console.log('🔴 Setting up Redis for testing...');
      try {
        redisClient = createClient({
          url: process.env.REDIS_URL,
        });
        await redisClient.connect();
        console.log('✅ Redis connected successfully');
      } catch (error) {
        console.warn(
          '⚠️ Redis connection failed, continuing without Redis:',
          error.message,
        );
      }
    }

    // Set global test variables
    (global as any).__MONGO_SERVER__ = mongoServer;
    (global as any).__REDIS_CLIENT__ = redisClient;

    console.log('✅ Global test environment setup completed');
  } catch (error) {
    console.error('❌ Failed to setup global test environment:', error);
    throw error;
  }
}
