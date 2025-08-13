import { config } from 'dotenv';
config()
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from "express"
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './commen/filters/http-exception.filter';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Helmet middleware is applied globally in AppModule
  // No need to apply it here as it's configured in HelmetMiddleware
  
  // Use cookie parser middleware for CSRF protection
  app.use(cookieParser());
  
  // Enable CORS with secure configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  // Special middleware for Stripe webhook
  app.use("/order/webhook", express.raw({type: "application/json"}));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    transform: true, // Transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Automatically convert primitive types
    },
  }));
  
  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
