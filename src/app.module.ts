import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from './User/user.module';
import { GameModuleAdmin } from './modules/SuperAdmin/game/game.module';
import { GameModule } from './modules/game/game.module';
import { SuperAdminPackagesModule } from './modules/SuperAdmin/packages/packages.module';
import { PackagesModule } from './modules/packages/packages.module';
import { categoryModule } from './modules/category/category.module';
import { OrderModule } from './modules/order/order.module';
import {
  RateLimitMiddleware,
  AuthRateLimitMiddleware,
} from './commen/middleware/rate-limit.middleware';
import {
  StrictRateLimitMiddleware,
  UploadRateLimitMiddleware,
} from './commen/middleware/strict-rate-limit.middleware';
import { HelmetMiddleware } from './commen/middleware/helmet.middleware';
import { SanitizationMiddleware } from './commen/middleware/sanitization.middleware';
import { CsrfMiddleware } from './commen/middleware/csrf.middleware';
import { SecurityModule } from './commen/security/security.module';
import { ApiVersionInterceptor } from './commen/interceptors/api-version.interceptor';
import { ApiVersionGuard } from './commen/Guards/api-version.guard';
import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MetricsMiddleware } from './commen/middleware/metrics.middleware';
import { ErrorHandlingMiddleware } from './commen/middleware/error-handling.middleware';
import { LoggingInterceptor } from './commen/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './commen/filters/global-exception.filter';
import { EnhancedLoggingService } from './commen/services/logging.service';
import { MonitoringService } from './commen/services/monitoring.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    // Connect to MongoDB with optimized connection pooling
    MongooseModule.forRoot(process.env.DB_URL as string, {
      // Enable SSL for secure connection
      // ssl: process.env.NODE_ENV === 'production',
      // Prevent potential NoSQL injection by sanitizing inputs
      sanitizeFilter: true,
      // Connection pooling optimization
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      connectTimeoutMS: 10000, // How long to wait for a connection to be established
      // Buffer commands when connection is lost
      bufferCommands: false, // Disable mongoose buffering
      // Heartbeat frequency
      heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
    }),
    EventEmitterModule.forRoot(),
    SecurityModule,
    HealthModule,
    MonitoringModule,
    AuthModule,
    UserModule,
    GameModuleAdmin,
    GameModule,
    SuperAdminPackagesModule,
    PackagesModule,
    categoryModule,
    OrderModule,
  ],
  controllers: [],
  providers: [
    EnhancedLoggingService,
    MonitoringService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiVersionInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply error handling middleware first, then metrics middleware
    consumer.apply(ErrorHandlingMiddleware).forRoutes('*');
    consumer.apply(MetricsMiddleware).forRoutes('*');

    // Apply helmet middleware to all routes
    consumer.apply(HelmetMiddleware).forRoutes('*');

    // Apply sanitization middleware to all routes
    consumer.apply(SanitizationMiddleware).forRoutes('*');

    // Apply general rate limiting to all routes
    consumer.apply(RateLimitMiddleware).forRoutes('*');

    // Apply CSRF protection to all routes
    consumer.apply(CsrfMiddleware).forRoutes('*');

    // Apply stricter rate limiting to authentication routes
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/signup', method: RequestMethod.POST },
        { path: 'auth/forget-password', method: RequestMethod.POST },
        { path: 'auth/confirm-forget-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
      );

    // Apply strict rate limiting to sensitive operations
    consumer
      .apply(StrictRateLimitMiddleware)
      .forRoutes(
        { path: 'auth/freeze-account', method: RequestMethod.POST },
        { path: 'order/create', method: RequestMethod.POST },
        { path: 'order/cancel', method: RequestMethod.POST },
        { path: 'user/update-profile', method: RequestMethod.PUT },
        { path: 'user/change-password', method: RequestMethod.POST },
      );

    // Apply upload rate limiting to file upload endpoints
    consumer
      .apply(UploadRateLimitMiddleware)
      .forRoutes(
        { path: 'game/upload', method: RequestMethod.POST },
        { path: 'packages/upload', method: RequestMethod.POST },
        { path: 'user/upload-avatar', method: RequestMethod.POST },
      );
  }
}
