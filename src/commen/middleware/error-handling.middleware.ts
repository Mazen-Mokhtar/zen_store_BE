import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EnhancedLoggingService } from '../services/logging.service';
import { MetricsCollector, ErrorMetric } from './metrics.middleware';
import {
  getErrorHandlingConfig,
  ErrorHandlingConfigUtils,
} from '../../config/error-handling.config';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  timestamp: Date;
  correlationId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    correlationId?: string;
  };
  meta?: {
    version: string;
    environment: string;
  };
}

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  private metricsCollector = MetricsCollector.getInstance();

  constructor(private loggingService: EnhancedLoggingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Set up error handling for unhandled promise rejections
    const originalSend = res.send;
    const originalJson = res.json;
    const middleware = this; // Capture middleware instance

    // Store error formatting function on response for other middleware to use
    res['formatError'] = (body: any) => {
      if (res.statusCode >= 400) {
        return middleware.formatErrorResponse(body, req, res.statusCode);
      }
      return body;
    };

    // Don't override response methods - let other middleware handle it
    // Error formatting will be handled by exception filters

    // Set up timeout handling
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const context = middleware.buildErrorContext(req);
        middleware.handleTimeout(req, res, context);
      }
    }, 30000); // 30 second timeout

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    // Handle uncaught errors in the request pipeline
    const domain = require('domain');
    const requestDomain = domain.create();

    requestDomain.on('error', (error: Error) => {
      const context = middleware.buildErrorContext(req);
      middleware.handleUncaughtError(error, req, res, context);
    });

    requestDomain.run(() => {
      next();
    });
  }

  private formatErrorResponse(
    body: any,
    req: Request,
    statusCode: number,
  ): ErrorResponse {
    const requestId = req['requestId'] || this.generateRequestId();
    const correlationId = req.headers['x-correlation-id'] as string;

    // If body is already a properly formatted error response, return it
    if (
      body &&
      typeof body === 'object' &&
      body.success === false &&
      body.error
    ) {
      return body;
    }

    // Extract error information
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = undefined;

    if (typeof body === 'string') {
      errorMessage = body;
    } else if (body && typeof body === 'object') {
      if (body.message) {
        errorMessage = body.message;
      }
      if (body.error) {
        errorMessage = body.error;
      }
      if (body.code) {
        errorCode = body.code;
      }
      if (body.details) {
        errorDetails = body.details;
      }
    }

    // Map HTTP status codes to error codes
    errorCode = this.mapStatusCodeToErrorCode(statusCode, errorCode);

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        requestId,
        correlationId,
      },
      meta: {
        version: process.env.API_VERSION || 'v1',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  private handleTimeout(
    req: Request,
    res: Response,
    context: ErrorContext,
  ): void {
    const error = new Error('Request timeout');

    this.loggingService.error('Request timeout', error, {
      ...context,
      timeout: '30s',
      statusCode: HttpStatus.REQUEST_TIMEOUT,
    });

    const config = getErrorHandlingConfig();

    this.metricsCollector.recordRequest(
      req.method,
      req.url,
      HttpStatus.REQUEST_TIMEOUT,
      30000,
      'Request timeout',
    );

    // Record detailed error metrics if enabled
    if (config.enableErrorMetrics) {
      const errorMetric: ErrorMetric = {
        type: 'Request timeout',
        severity: 'medium',
        category: 'timeout',
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        endpoint: req.url,
        timestamp: new Date(),
      };

      this.metricsCollector.recordError(errorMetric);
    }

    if (!res.headersSent) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout - the server took too long to respond',
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
          correlationId: context.correlationId,
        },
        meta: {
          version: process.env.API_VERSION || 'v1',
          environment: process.env.NODE_ENV || 'development',
        },
      };

      res.status(HttpStatus.REQUEST_TIMEOUT).json(errorResponse);
    }
  }

  private handleUncaughtError(
    error: Error,
    req: Request,
    res: Response,
    context: ErrorContext,
  ): void {
    this.loggingService.error('Uncaught error in request pipeline', error, {
      ...context,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      stack: error.stack,
    });

    const config = getErrorHandlingConfig();

    this.metricsCollector.recordRequest(
      req.method,
      req.url,
      HttpStatus.INTERNAL_SERVER_ERROR,
      Date.now() - (req['startTime'] || Date.now()),
      error.message,
    );

    // Record detailed error metrics if enabled
    if (config.enableErrorMetrics) {
      const errorMetric: ErrorMetric = {
        type: error.name || 'UncaughtError',
        severity: ErrorHandlingConfigUtils.getErrorSeverity(error),
        category: ErrorHandlingConfigUtils.getErrorCategory(error),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        endpoint: req.url,
        timestamp: new Date(),
      };

      this.metricsCollector.recordError(errorMetric);
    }

    if (!res.headersSent) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'production'
              ? 'An internal server error occurred'
              : error.message,
          details:
            process.env.NODE_ENV === 'production'
              ? undefined
              : {
                  stack: error.stack,
                  name: error.name,
                },
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
          correlationId: context.correlationId,
        },
        meta: {
          version: process.env.API_VERSION || 'v1',
          environment: process.env.NODE_ENV || 'development',
        },
      };

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  private buildErrorContext(req: Request): ErrorContext {
    return {
      requestId: req['requestId'],
      userId: (req as any).user?.id,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      timestamp: new Date(),
      correlationId: req.headers['x-correlation-id'] as string,
    };
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  private mapStatusCodeToErrorCode(
    statusCode: number,
    defaultCode: string,
  ): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      406: 'NOT_ACCEPTABLE',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      410: 'GONE',
      411: 'LENGTH_REQUIRED',
      412: 'PRECONDITION_FAILED',
      413: 'PAYLOAD_TOO_LARGE',
      414: 'URI_TOO_LONG',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      416: 'RANGE_NOT_SATISFIABLE',
      417: 'EXPECTATION_FAILED',
      418: 'IM_A_TEAPOT',
      421: 'MISDIRECTED_REQUEST',
      422: 'UNPROCESSABLE_ENTITY',
      423: 'LOCKED',
      424: 'FAILED_DEPENDENCY',
      425: 'TOO_EARLY',
      426: 'UPGRADE_REQUIRED',
      428: 'PRECONDITION_REQUIRED',
      429: 'TOO_MANY_REQUESTS',
      431: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
      451: 'UNAVAILABLE_FOR_LEGAL_REASONS',
      500: 'INTERNAL_SERVER_ERROR',
      501: 'NOT_IMPLEMENTED',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
      505: 'HTTP_VERSION_NOT_SUPPORTED',
      506: 'VARIANT_ALSO_NEGOTIATES',
      507: 'INSUFFICIENT_STORAGE',
      508: 'LOOP_DETECTED',
      510: 'NOT_EXTENDED',
      511: 'NETWORK_AUTHENTICATION_REQUIRED',
    };

    return statusCodeMap[statusCode] || defaultCode;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Error handling utilities
export class ErrorUtils {
  static isOperationalError(error: any): boolean {
    return error.isOperational === true;
  }

  static isTrustedError(error: any): boolean {
    return error.isTrusted === true;
  }

  static sanitizeError(error: any, includeStack = false): any {
    const sanitized: any = {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status || error.statusCode,
    };

    if (includeStack && error.stack) {
      sanitized.stack = error.stack;
    }

    // Remove sensitive information
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];

    const removeSensitiveData = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = removeSensitiveData(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return removeSensitiveData(sanitized);
  }
}
