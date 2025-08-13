import { Module, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from './User/user.module';
import { GameModuleAdmin } from './modules/SuperAdmin/game/game.module';
import { GameModule } from './modules/game/game.module';
import { SuperAdminPackagesModule } from './modules/SuperAdmin/packages/packages.module';
import { PackagesModule } from './modules/packages/packages.module';
import { categoryModule } from './modules/category/category.module';
import { OrderModule } from './modules/order/order.module';
import { RateLimitMiddleware, AuthRateLimitMiddleware } from './commen/middleware/rate-limit.middleware';
import { HelmetMiddleware } from './commen/middleware/helmet.middleware';
import { SanitizationMiddleware } from './commen/middleware/sanitization.middleware';
import { CsrfMiddleware } from './commen/middleware/csrf.middleware';
import { SecurityModule } from './commen/security/security.module';

@Module({
  imports: [
    // Connect to MongoDB with secure options
    MongooseModule.forRoot(process.env.DB_URL as string, {
      // Enable SSL for secure connection
      // ssl: process.env.NODE_ENV === 'production',
      // Prevent potential NoSQL injection by sanitizing inputs
      sanitizeFilter: true,
    }),
    EventEmitterModule.forRoot(),
    SecurityModule,
    AuthModule,
    UserModule,
    GameModuleAdmin,
    GameModule,
    SuperAdminPackagesModule,
    PackagesModule,
    categoryModule,
    OrderModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply helmet middleware to all routes
    consumer.apply(HelmetMiddleware).forRoutes('*');
    
    // Apply sanitization middleware to all routes
    consumer.apply(SanitizationMiddleware).forRoutes('*');
    
    // Apply general rate limiting to all routes
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    
    // Apply CSRF protection to all routes
    consumer.apply(CsrfMiddleware).forRoutes('*');
    
    // Apply stricter rate limiting to authentication routes
    consumer.apply(AuthRateLimitMiddleware).forRoutes(
      { path: 'auth/login', method: RequestMethod.POST },
      { path: 'auth/signup', method: RequestMethod.POST },
      { path: 'auth/forget-password', method: RequestMethod.POST },
      { path: 'auth/confirm-forget-password', method: RequestMethod.POST },
      { path: 'auth/reset-password', method: RequestMethod.POST },
    );
  }
}
