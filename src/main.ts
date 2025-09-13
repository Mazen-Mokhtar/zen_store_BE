import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './commen/filters/http-exception.filter';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { useContainer } from 'class-validator';
import compression from 'compression';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable class-validator to use NestJS dependency injection
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Helmet middleware is applied globally in AppModule
  // No need to apply it here as it's configured in HelmetMiddleware

  // Use cookie parser middleware for CSRF protection
  app.use(cookieParser());

  // Enable response compression (gzip/brotli)
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress responses if the client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
      },
      level: 6, // Compression level (1-9, 6 is default)
      threshold: 1024, // Only compress responses larger than 1KB
    }),
  );

  // Enable CORS with secure configuration
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Configure Express body parser limits for large file uploads
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // Special middleware for Stripe webhook
  app.use('/order/webhook', express.raw({ type: 'application/json' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert primitive types
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Setup Swagger documentation
  setupSwagger(app);

  // Configure server timeout for large file uploads
  const server = await app.listen(process.env.PORT ?? 3000);
  server.setTimeout(10 * 60 * 1000); // 10 minutes timeout for large file uploads

  // Log application startup information
  const port = process.env.PORT ?? 3000;
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`📄 OpenAPI JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();
