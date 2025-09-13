export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Cleanup MongoDB Memory Server
    const mongoServer = (global as any).__MONGO_SERVER__;
    if (mongoServer) {
      console.log('📦 Stopping MongoDB Memory Server...');
      await mongoServer.stop();
      console.log('✅ MongoDB Memory Server stopped');
    }

    // Cleanup Redis connection
    const redisClient = (global as any).__REDIS_CLIENT__;
    if (redisClient) {
      console.log('🔴 Closing Redis connection...');
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    }

    // Clear global variables
    delete (global as any).__MONGO_SERVER__;
    delete (global as any).__REDIS_CLIENT__;

    console.log('✅ Global test environment cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup global test environment:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}
