import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { ValidationError } from 'class-validator';
import { Error as MongooseError } from 'mongoose';
import { MetricsCollector } from '../middleware/metrics.middleware';
import { EnhancedLoggingService } from '../services/logging.service';
import {
  errorHandlingConfig,
  ErrorHandlingConfigUtils,
  ErrorSeverity,
  ErrorCategory,
} from '../../config/error-handling.config';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any;
  requestId?: string;
  version?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private metricsCollector = MetricsCollector.getInstance();
  private config = errorHandlingConfig;

  constructor(private loggingService: EnhancedLoggingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    // Record metrics
    if (this.config.enableErrorMetrics) {
      this.recordErrorMetrics(request, errorResponse.statusCode, exception);
    }

    // Send notifications for critical errors
    this.handleErrorNotifications(exception, request);

    // Sanitize error response for client
    const sanitizedResponse = this.sanitizeErrorResponse(errorResponse);

    // Send response
    response.status(errorResponse.statusCode).json(sanitizedResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = this.generateRequestId();
    const version = (request.headers['api-version'] as string) || 'v1';

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, {
        timestamp,
        path,
        method,
        requestId,
        version,
      });
    }

    if (this.isMongoError(exception)) {
      return this.handleMongoError(exception, {
        timestamp,
        path,
        method,
        requestId,
        version,
      });
    }

    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, {
        timestamp,
        path,
        method,
        requestId,
        version,
      });
    }

    // Handle unknown errors
    return this.handleUnknownError(exception, {
      timestamp,
      path,
      method,
      requestId,
      version,
    });
  }

  private handleHttpException(
    exception: HttpException,
    context: any,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let details: any;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || exception.message;
      details = {
        error: responseObj.error,
        statusCode: status,
        ...responseObj,
      };
    } else {
      message = exceptionResponse || exception.message;
    }

    return {
      statusCode: status,
      timestamp: context.timestamp,
      path: context.path,
      method: context.method,
      message,
      error: exception.name,
      details: this.sanitizeDetails(details, status),
      requestId: context.requestId,
      version: context.version,
    };
  }

  private handleMongoError(exception: MongoError, context: any): ErrorResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';
    let details: any = {};

    switch (exception.code) {
      case 11000: // Duplicate key error
        statusCode = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        details = {
          type: 'DUPLICATE_KEY',
          field: this.extractDuplicateField(exception.message),
        };
        break;
      case 121: // Document validation failed
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Document validation failed';
        details = {
          type: 'VALIDATION_ERROR',
          validationErrors: exception.message,
        };
        break;
      default:
        details = {
          type: 'DATABASE_ERROR',
          code: exception.code,
        };
    }

    return {
      statusCode,
      timestamp: context.timestamp,
      path: context.path,
      method: context.method,
      message,
      error: 'MongoError',
      details: this.sanitizeDetails(details, statusCode),
      requestId: context.requestId,
      version: context.version,
    };
  }

  private handleValidationError(
    exception: ValidationError[],
    context: any,
  ): ErrorResponse {
    const validationErrors = exception.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
    }));

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: context.timestamp,
      path: context.path,
      method: context.method,
      message: 'Validation failed',
      error: 'ValidationError',
      details: {
        type: 'VALIDATION_ERROR',
        errors: validationErrors,
      },
      requestId: context.requestId,
      version: context.version,
    };
  }

  private handleUnknownError(exception: unknown, context: any): ErrorResponse {
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    const errorName =
      exception instanceof Error ? exception.name : 'UnknownError';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: context.timestamp,
      path: context.path,
      method: context.method,
      message: 'Internal server error',
      error: errorName,
      details: this.sanitizeDetails(
        {
          type: 'INTERNAL_ERROR',
          originalMessage: message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
      requestId: context.requestId,
      version: context.version,
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    if (!this.config.enableErrorLogging) {
      return;
    }

    const { statusCode, requestId, path, method } = errorResponse;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip;
    const userId = (request as any).user?.id;
    const correlationId = Array.isArray(request.headers['x-correlation-id'])
      ? request.headers['x-correlation-id'][0]
      : request.headers['x-correlation-id'];

    const logContext = {
      requestId,
      correlationId,
      path,
      method,
      statusCode,
      userAgent,
      ip,
      userId,
      timestamp: errorResponse.timestamp,
      severity: ErrorHandlingConfigUtils.getErrorSeverity(exception),
      category: ErrorHandlingConfigUtils.getErrorCategory(exception),
    };

    const formattedError = ErrorHandlingConfigUtils.formatErrorForLogging(
      exception,
      logContext,
    );

    if (exception instanceof HttpException) {
      const severity = ErrorHandlingConfigUtils.getErrorSeverity(exception);

      if (
        severity === ErrorSeverity.CRITICAL ||
        severity === ErrorSeverity.HIGH
      ) {
        this.loggingService.error(
          `HTTP Exception: ${exception.message}`,
          exception,
          logContext,
        );
      } else {
        this.loggingService.warn(
          `HTTP Exception: ${exception.message}`,
          logContext,
        );
      }
    } else if (exception instanceof MongoError) {
      this.loggingService.error(
        `Database Error: ${exception.message}`,
        exception,
        {
          ...logContext,
          code: exception.code,
          category: ErrorCategory.DATABASE,
        },
      );
    } else if (exception instanceof MongooseError.ValidationError) {
      this.loggingService.warn(`Validation Error: ${exception.message}`, {
        ...logContext,
        errors: exception.errors,
        category: ErrorCategory.VALIDATION,
      });
    } else {
      this.loggingService.error(
        `Unexpected Error: ${(exception as Error).message}`,
        exception as Error,
        { ...logContext, category: ErrorCategory.SYSTEM },
      );
    }
  }

  private recordErrorMetrics(
    request: Request,
    statusCode: number,
    exception: unknown,
  ): void {
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown error';
    const severity = ErrorHandlingConfigUtils.getErrorSeverity(exception);
    const category = ErrorHandlingConfigUtils.getErrorCategory(exception);

    this.metricsCollector.recordRequest(
      request.method,
      endpoint,
      statusCode,
      0, // Response time will be calculated elsewhere
      errorMessage,
    );

    // Record additional error metrics
    this.metricsCollector.recordError({
      type: exception instanceof Error ? exception.constructor.name : 'Unknown',
      severity,
      category,
      statusCode,
      endpoint,
      timestamp: new Date(),
    });
  }

  private handleErrorNotifications(exception: unknown, request: Request): void {
    if (!ErrorHandlingConfigUtils.shouldNotify(exception, this.config)) {
      return;
    }

    const severity = ErrorHandlingConfigUtils.getErrorSeverity(exception);
    const category = ErrorHandlingConfigUtils.getErrorCategory(exception);

    // Log critical error for notification systems to pick up
    this.loggingService.error(
      `CRITICAL ERROR NOTIFICATION: ${(exception as Error).message}`,
      exception as Error,
      {
        severity,
        category,
        requiresNotification: true,
        method: request.method,
        url: request.originalUrl || request.url,
        userId: (request as any).user?.id,
        requestId: (request as any).requestId,
      },
    );
  }

  private sanitizeErrorResponse(errorResponse: any): any {
    if (!this.config.sanitizeSensitiveData) {
      return errorResponse;
    }

    return ErrorHandlingConfigUtils.sanitizeErrorForClient(
      errorResponse,
      this.config,
    );
  }

  private sanitizeDetails(details: any, statusCode: number): any {
    if (!details) return undefined;

    // In production, hide sensitive information for server errors
    if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
      return {
        type: details.type || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      };
    }

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    const sanitized = { ...details };

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

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractDuplicateField(message: string): string {
    const match = message.match(/index: (.+?) dup key/);
    return match ? match[1] : 'unknown';
  }

  private isMongoError(exception: unknown): exception is MongoError {
    return exception instanceof Error && exception.name === 'MongoError';
  }

  private isValidationError(
    exception: unknown,
  ): exception is ValidationError[] {
    return (
      Array.isArray(exception) &&
      exception.every((item) => item instanceof ValidationError)
    );
  }
}

/**
 * Custom HTTP exceptions for specific business logic errors
 */
export class BusinessLogicException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly details?: any,
  ) {
    super(
      {
        message,
        error: 'Business Logic Error',
        errorCode,
        details,
      },
      statusCode,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    super(
      {
        message: `${resource} not found${identifier ? ` with identifier: ${identifier}` : ''}`,
        error: 'Resource Not Found',
        resource,
        identifier,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ValidationException extends HttpException {
  constructor(errors: ValidationError[]) {
    const formattedErrors = errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
    }));

    super(
      {
        message: 'Validation failed',
        error: 'Validation Error',
        errors: formattedErrors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
