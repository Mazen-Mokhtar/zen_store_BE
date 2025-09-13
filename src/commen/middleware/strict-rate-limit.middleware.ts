import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  SecurityEventType,
  SecurityMonitoringService,
} from '../service/security-monitoring.service';
import { SecurityConfig } from '../config/security.config';

interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: any };
}

@Injectable()
export class StrictRateLimitMiddleware implements NestMiddleware {
  constructor(private securityMonitoringService: SecurityMonitoringService) {}

  private strictLimiter = rateLimit({
    windowMs: SecurityConfig.strictRateLimit.windowMs,
    max: SecurityConfig.strictRateLimit.maxRequests,
    message: {
      statusCode: 429,
      message: SecurityConfig.strictRateLimit.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req: AuthenticatedRequest, res, next, options) => {
      // Report strict rate limit exceeded to security monitoring service
      this.securityMonitoringService.reportEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        timestamp: new Date(),
        ip: req.ip || '127.0.0.1',
        path: req.path,
        details: {
          headers: req.headers,
          method: req.method,
          rateLimitType: 'strict',
          userAgent: req.headers['user-agent'],
        },
      });

      // Send standard response
      res.status(options.statusCode).json(options.message);
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.strictLimiter(req, res, next);
  }
}

@Injectable()
export class UploadRateLimitMiddleware implements NestMiddleware {
  constructor(private securityMonitoringService: SecurityMonitoringService) {}

  private uploadLimiter = rateLimit({
    windowMs: SecurityConfig.uploadRateLimit.windowMs,
    max: SecurityConfig.uploadRateLimit.maxUploads,
    message: {
      statusCode: 429,
      message: SecurityConfig.uploadRateLimit.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed uploads
    keyGenerator: (req: AuthenticatedRequest) => {
      // Use IP + user ID if authenticated, otherwise just IP
      const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const userId = req.user?.id || 'anonymous';
      return `${ip}-${userId}`;
    },
    handler: (req: AuthenticatedRequest, res, next, options) => {
      // Report upload rate limit exceeded
      this.securityMonitoringService.reportEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        timestamp: new Date(),
        ip: req.ip || '127.0.0.1',
        path: req.path,
        details: {
          headers: req.headers,
          method: req.method,
          rateLimitType: 'upload',
          userAgent: req.headers['user-agent'],
          userId: req.user?.id || 'anonymous',
        },
      });

      // Send standard response
      res.status(options.statusCode).json(options.message);
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.uploadLimiter(req, res, next);
  }
}
