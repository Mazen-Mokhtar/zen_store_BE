import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  EnhancedLoggingService,
  LogContext,
} from '../services/logging.service';
import { MetricsCollector } from '../middleware/metrics.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private metricsCollector = MetricsCollector.getInstance();

  constructor(private loggingService: EnhancedLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Generate request ID if not present
    const requestId = this.generateRequestId();
    request['requestId'] = requestId;

    // Extract request context
    const logContext: LogContext = this.extractRequestContext(
      request,
      requestId,
    );

    // Log incoming request
    this.logIncomingRequest(request, logContext);

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        this.logSuccessfulResponse(
          request,
          response,
          data,
          responseTime,
          logContext,
        );
        this.recordMetrics(request, response.statusCode, responseTime, true);
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        this.logErrorResponse(
          request,
          response,
          error,
          responseTime,
          logContext,
        );
        this.recordMetrics(
          request,
          response.statusCode || 500,
          responseTime,
          false,
          error,
        );
        throw error;
      }),
    );
  }

  private extractRequestContext(
    request: Request,
    requestId: string,
  ): LogContext {
    const user = (request as any).user;

    return {
      requestId,
      method: request.method,
      url: request.originalUrl || request.url,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      userId: user?.id,
      sessionId: user?.sessionId,
      correlationId: request.headers['x-correlation-id'] as string,
      apiVersion: (request.headers['api-version'] as string) || 'v1',
      contentType: request.headers['content-type'],
      contentLength: request.headers['content-length'],
      referer: request.headers['referer'],
      origin: request.headers['origin'],
    };
  }

  private logIncomingRequest(request: Request, context: LogContext): void {
    const { method, url, userAgent, ip, userId } = context;

    // Log basic request info
    this.loggingService.http(`Incoming ${method} ${url}`, {
      ...context,
      body: this.sanitizeRequestBody(request.body),
      query: request.query,
      params: request.params,
    });

    // Log security-relevant requests
    if (this.isSecurityRelevant(request)) {
      this.loggingService.security(
        'Security-relevant request',
        {
          method,
          url,
          userAgent,
          ip,
          userId,
        },
        context,
      );
    }

    // Log business events for specific endpoints
    if (this.isBusinessEvent(request)) {
      this.loggingService.business(
        this.getBusinessEventName(request),
        {
          endpoint: url,
          method,
          userId,
        },
        context,
      );
    }
  }

  private logSuccessfulResponse(
    request: Request,
    response: Response,
    data: any,
    responseTime: number,
    context: LogContext,
  ): void {
    const { method, url } = context;
    const statusCode = response.statusCode;

    this.loggingService.http(
      `${method} ${url} - ${statusCode} - ${responseTime}ms`,
      {
        ...context,
        statusCode,
        responseTime,
        responseSize: this.getResponseSize(data),
        success: true,
      },
    );

    // Log performance metrics for slow requests
    if (responseTime > 1000) {
      this.loggingService.performance(
        'Slow request detected',
        responseTime,
        'ms',
        {
          ...context,
          statusCode,
          threshold: 1000,
        },
      );
    }

    // Log business success events
    if (
      this.isBusinessEvent(request) &&
      this.isSuccessfulBusinessEvent(statusCode)
    ) {
      this.loggingService.business(
        `${this.getBusinessEventName(request)} completed`,
        {
          statusCode,
          responseTime,
          userId: context.userId,
        },
        context,
      );
    }
  }

  private logErrorResponse(
    request: Request,
    response: Response,
    error: any,
    responseTime: number,
    context: LogContext,
  ): void {
    const { method, url } = context;
    const statusCode = error.status || error.statusCode || 500;

    this.loggingService.error(
      `${method} ${url} - ${statusCode} - ${responseTime}ms - ${error.message}`,
      error,
      {
        ...context,
        statusCode,
        responseTime,
        errorName: error.name,
        errorCode: error.code,
        success: false,
      },
    );

    // Log security incidents
    if (this.isSecurityIncident(error, statusCode)) {
      this.loggingService.security(
        'Security incident detected',
        {
          error: error.message,
          statusCode,
          method,
          url,
          userAgent: context.userAgent,
          ip: context.ip,
        },
        context,
      );
    }

    // Log business failure events
    if (this.isBusinessEvent(request)) {
      this.loggingService.business(
        `${this.getBusinessEventName(request)} failed`,
        {
          error: error.message,
          statusCode,
          responseTime,
          userId: context.userId,
        },
        context,
      );
    }
  }

  private recordMetrics(
    request: Request,
    statusCode: number,
    responseTime: number,
    success: boolean,
    error?: any,
  ): void {
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const errorMessage = error ? error.message : undefined;

    this.metricsCollector.recordRequest(
      request.method,
      endpoint,
      statusCode,
      responseTime,
      errorMessage,
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
      'email', // Optionally sanitize email
    ];

    const sanitized = { ...body };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          result[key] = '[SANITIZED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private getResponseSize(data: any): number {
    if (!data) return 0;

    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private isSecurityRelevant(request: Request): boolean {
    const securityEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/reset-password',
      '/auth/change-password',
      '/admin',
    ];

    return securityEndpoints.some((endpoint) =>
      request.url.toLowerCase().includes(endpoint),
    );
  }

  private isSecurityIncident(error: any, statusCode: number): boolean {
    // Log security incidents for:
    // - Unauthorized access attempts
    // - Forbidden access
    // - Too many requests (rate limiting)
    // - Authentication failures
    return [
      401, // Unauthorized
      403, // Forbidden
      429, // Too Many Requests
    ].includes(statusCode);
  }

  private isBusinessEvent(request: Request): boolean {
    const businessEndpoints = [
      '/orders',
      '/games',
      '/packages',
      '/payments',
      '/users',
      '/coupons',
    ];

    return businessEndpoints.some((endpoint) =>
      request.url.toLowerCase().includes(endpoint),
    );
  }

  private getBusinessEventName(request: Request): string {
    const { method, url } = request;

    // Extract business event name based on endpoint and method
    if (url.includes('/orders')) {
      switch (method) {
        case 'POST':
          return 'Order Created';
        case 'PUT':
        case 'PATCH':
          return 'Order Updated';
        case 'DELETE':
          return 'Order Cancelled';
        case 'GET':
          return 'Order Viewed';
        default:
          return 'Order Action';
      }
    }

    if (url.includes('/games')) {
      switch (method) {
        case 'POST':
          return 'Game Added';
        case 'PUT':
        case 'PATCH':
          return 'Game Updated';
        case 'DELETE':
          return 'Game Removed';
        case 'GET':
          return 'Game Viewed';
        default:
          return 'Game Action';
      }
    }

    if (url.includes('/payments')) {
      switch (method) {
        case 'POST':
          return 'Payment Processed';
        case 'GET':
          return 'Payment Viewed';
        default:
          return 'Payment Action';
      }
    }

    return 'Business Action';
  }

  private isSuccessfulBusinessEvent(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 300;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
