import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { loggingConfig, LoggingConfig } from '../../config/logging.config';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: LogContext;
  stack?: string;
  service: string;
  environment: string;
  version: string;
}

@Injectable()
export class EnhancedLoggingService implements LoggerService {
  private readonly winston: winston.Logger;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly version: string;
  private readonly config: LoggingConfig;

  constructor(private configService: ConfigService) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'zenstore-api');
    this.environment = this.configService.get('NODE_ENV', 'development');
    this.version = this.configService.get('npm_package_version', '1.0.0');
    this.config = loggingConfig;

    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const logLevel = this.config.level;
    const logDir = this.configService.get('LOG_DIR', './logs');

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }

    // File transports
    if (this.config.enableFile) {
      // Combined logs
      transports.push(
        new winston.transports.File({
          filename: `${logDir}/combined.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // Error logs
      transports.push(
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
        version: this.version,
      },
      transports,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({ filename: `${logDir}/exceptions.log` }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: `${logDir}/rejections.log` }),
      ],
      exitOnError: false,
    });
  }

  // Removed getBaseFormats method as it's no longer needed

  // Removed getConsoleFormat method as it's no longer needed

  /**
   * Log a message with context
   */
  log(message: string, context?: LogContext): void {
    this.winston.info(message, { context });
  }

  /**
   * Log an error with context and stack trace
   */
  error(message: string, error?: Error | string, context?: LogContext): void {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { message: error };

    this.winston.error(message, {
      context,
      error: errorDetails,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  /**
   * Log a warning with context
   */
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, { context });
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, { context });
  }

  /**
   * Log verbose information
   */
  verbose(message: string, context?: LogContext): void {
    this.winston.verbose(message, { context });
  }

  /**
   * Log HTTP access information
   */
  http(message: string, context?: LogContext): void {
    this.winston.http(message, { context });
  }

  /**
   * Log business events
   */
  business(event: string, data: any, context?: LogContext): void {
    this.winston.info(`Business Event: ${event}`, {
      context: {
        ...context,
        eventType: 'business',
        eventName: event,
        eventData: data,
      },
    });
  }

  /**
   * Log security events
   */
  security(event: string, data: any, context?: LogContext): void {
    this.winston.warn(`Security Event: ${event}`, {
      context: {
        ...context,
        eventType: 'security',
        eventName: event,
        eventData: data,
        severity: 'high',
      },
    });
  }

  /**
   * Log performance metrics
   */
  performance(
    metric: string,
    value: number,
    unit: string,
    context?: LogContext,
  ): void {
    this.winston.info(`Performance Metric: ${metric}`, {
      context: {
        ...context,
        eventType: 'performance',
        metric,
        value,
        unit,
      },
    });
  }

  /**
   * Log audit trail
   */
  audit(
    action: string,
    resource: string,
    userId?: string,
    context?: LogContext,
  ): void {
    this.winston.info(`Audit: ${action} on ${resource}`, {
      context: {
        ...context,
        eventType: 'audit',
        action,
        resource,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a child logger with persistent context
   */
  child(persistentContext: LogContext): ChildLogger {
    return new ChildLogger(this, persistentContext);
  }

  /**
   * Set log levels dynamically
   */
  setLogLevel(level: LogLevel): void {
    this.winston.level = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): string {
    return this.winston.level;
  }

  /**
   * Flush all logs (useful for testing)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }
}

/**
 * Child logger with persistent context
 */
export class ChildLogger {
  constructor(
    private parent: EnhancedLoggingService,
    private persistentContext: LogContext,
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.persistentContext, ...context };
  }

  log(message: string, context?: LogContext): void {
    this.parent.log(message, this.mergeContext(context));
  }

  error(message: string, error?: Error | string, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  verbose(message: string, context?: LogContext): void {
    this.parent.verbose(message, this.mergeContext(context));
  }

  http(message: string, context?: LogContext): void {
    this.parent.http(message, this.mergeContext(context));
  }

  business(event: string, data: any, context?: LogContext): void {
    this.parent.business(event, data, this.mergeContext(context));
  }

  security(event: string, data: any, context?: LogContext): void {
    this.parent.security(event, data, this.mergeContext(context));
  }

  performance(
    metric: string,
    value: number,
    unit: string,
    context?: LogContext,
  ): void {
    this.parent.performance(metric, value, unit, this.mergeContext(context));
  }

  audit(
    action: string,
    resource: string,
    userId?: string,
    context?: LogContext,
  ): void {
    this.parent.audit(action, resource, userId, this.mergeContext(context));
  }
}

/**
 * Logging decorators
 */
export function LogExecution(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const logger = new EnhancedLoggingService(new ConfigService());
    const startTime = Date.now();

    logger.debug(`Executing ${target.constructor.name}.${propertyName}`, {
      className: target.constructor.name,
      methodName: propertyName,
      arguments: args.length,
    });

    try {
      const result = await method.apply(this, args);
      const executionTime = Date.now() - startTime;

      logger.performance(
        `${target.constructor.name}.${propertyName}`,
        executionTime,
        'ms',
        {
          className: target.constructor.name,
          methodName: propertyName,
          success: true,
        },
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error(
        `Error in ${target.constructor.name}.${propertyName}`,
        error,
        {
          className: target.constructor.name,
          methodName: propertyName,
          executionTime,
          success: false,
        },
      );

      throw error;
    }
  };

  return descriptor;
}

export function LogAudit(action: string, resource: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = new EnhancedLoggingService(new ConfigService());
      const userId = this.request?.user?.id;

      try {
        const result = await method.apply(this, args);

        logger.audit(action, resource, userId, {
          className: target.constructor.name,
          methodName: propertyName,
          success: true,
        });

        return result;
      } catch (error) {
        logger.audit(`Failed ${action}`, resource, userId, {
          className: target.constructor.name,
          methodName: propertyName,
          success: false,
          error: error.message,
        });

        throw error;
      }
    };

    return descriptor;
  };
}
