import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  SecurityEventType,
  SecurityMonitoringService,
} from '../service/security-monitoring.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private securityMonitoringService: SecurityMonitoringService) {}

  private limiter = rateLimit({
    // Import security config
    ...(() => {
      const { SecurityConfig } = require('../config/security.config');
      return {
        windowMs: SecurityConfig.rateLimit.windowMs,
        max: SecurityConfig.rateLimit.maxRequests,
        message: { statusCode: 429, message: SecurityConfig.rateLimit.message },
      };
    })(),
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests against the rate limit
    handler: (req, res, next, options) => {
      // Report rate limit exceeded to security monitoring service
      this.securityMonitoringService.reportEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        timestamp: new Date(),
        ip: req.ip || '127.0.0.1',
        path: req.path,
        details: {
          headers: req.headers,
          method: req.method,
        },
      });

      // Send standard response
      res.status(options.statusCode).json(options.message);
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  constructor(private securityMonitoringService: SecurityMonitoringService) {}

  private authLimiter = rateLimit({
    // Import security config
    ...(() => {
      const { SecurityConfig } = require('../config/security.config');
      return {
        windowMs: SecurityConfig.authRateLimit.windowMs,
        max: SecurityConfig.authRateLimit.maxAttempts,
        message: {
          statusCode: 429,
          message: SecurityConfig.authRateLimit.message,
        },
      };
    })(),
    skipSuccessfulRequests: true, // Only count failed requests
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + email as the key to prevent multiple attempts with different emails from same IP
      // Validate and sanitize email input
      const email =
        req.body?.email && typeof req.body.email === 'string'
          ? req.body.email.toLowerCase().trim()
          : 'unknown';
      const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      return `${ip}-${email}`;
    },
    handler: (req, res, next, options) => {
      // Report potential brute force attack to security monitoring service
      this.securityMonitoringService.reportEvent({
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        timestamp: new Date(),
        ip: req.ip || '127.0.0.1',
        email:
          req.body?.email && typeof req.body.email === 'string'
            ? req.body.email.toLowerCase().trim()
            : 'unknown',
        path: req.path,
        details: {
          headers: req.headers,
          method: req.method,
        },
      });

      // Send standard response
      res.status(options.statusCode).json(options.message);
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.authLimiter(req, res, next);
  }
}
