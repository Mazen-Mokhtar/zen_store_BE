import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

export const RedisConfig = CacheModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    try {
      // Try to connect to Redis
      const store = await redisStore({
        socket: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT') || '6379') || 6379,
        },
        password: configService.get('REDIS_PASSWORD'),
        database: parseInt(configService.get('REDIS_DB') || '0') || 0,
      });
      console.log('✅ Redis connected successfully');
      return {
        store: () => store,
        ttl: 300, // 5 minutes default TTL
        max: 1000, // Maximum number of items in cache
      };
    } catch (error) {
      console.warn('⚠️ Redis connection failed, falling back to memory cache:', error.message);
      // Fallback to memory cache
      return {
        ttl: 300, // 5 minutes default TTL
        max: 1000, // Maximum number of items in cache
      };
    }
  },
  inject: [ConfigService],
});

export const CacheKeys = {
  GAMES_BY_CATEGORY: (categoryId: string, page?: number, limit?: number) =>
    `games:category:${categoryId}:${page || 1}:${limit || 10}`,
  GAME_BY_ID: (gameId: string) => `game:${gameId}`,
  PACKAGES_BY_GAME: (gameId: string) => `packages:game:${gameId}`,
  PACKAGE_BY_ID: (packageId: string) => `package:${packageId}`,
  CATEGORIES: 'categories:all',
  POPULAR_GAMES: (page?: number, limit?: number) =>
    `games:popular:${page || 1}:${limit || 10}`,
  STEAM_GAMES: (categoryId?: string, page?: number, limit?: number) =>
    `games:steam:${categoryId || 'all'}:${page || 1}:${limit || 10}`,
};

export const CacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};
