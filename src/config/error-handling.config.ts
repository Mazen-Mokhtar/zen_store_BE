export interface ErrorHandlingConfig {
  enableDetailedErrors: boolean;
  enableStackTrace: boolean;
  enableErrorLogging: boolean;
  enableErrorMetrics: boolean;
  enableSentryIntegration: boolean;
  enableSlackNotifications: boolean;
  enableEmailNotifications: boolean;
  sanitizeSensitiveData: boolean;
  maxErrorMessageLength: number;
  errorRetention: {
    days: number;
    maxCount: number;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxErrors: number;
  };
  notifications: {
    criticalErrors: boolean;
    highVolumeErrors: boolean;
    newErrorTypes: boolean;
    errorThreshold: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    enablePerformanceTracking: boolean;
    enableMemoryLeakDetection: boolean;
    alertThresholds: {
      errorRate: number; // percentage
      responseTime: number; // milliseconds
      memoryUsage: number; // percentage
    };
  };
  external: {
    sentry?: {
      dsn: string;
      environment: string;
      sampleRate: number;
      tracesSampleRate: number;
    };
    slack?: {
      webhookUrl: string;
      channel: string;
      username: string;
    };
    email?: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      recipients: string[];
      subject: string;
    };
  };
}

export const getErrorHandlingConfig = (): ErrorHandlingConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const isTesting = environment === 'test';

  const baseConfig: ErrorHandlingConfig = {
    enableDetailedErrors: !isProduction,
    enableStackTrace: !isProduction,
    enableErrorLogging: true,
    enableErrorMetrics: true,
    enableSentryIntegration: isProduction && !!process.env.SENTRY_DSN,
    enableSlackNotifications: isProduction && !!process.env.SLACK_WEBHOOK_URL,
    enableEmailNotifications: isProduction && !!process.env.SMTP_HOST,
    sanitizeSensitiveData: true,
    maxErrorMessageLength: isProduction ? 500 : 2000,
    errorRetention: {
      days: parseInt(process.env.ERROR_RETENTION_DAYS || '30'),
      maxCount: parseInt(process.env.ERROR_MAX_COUNT || '10000'),
    },
    rateLimiting: {
      enabled: isProduction,
      windowMs: parseInt(process.env.ERROR_RATE_LIMIT_WINDOW || '60000'), // 1 minute
      maxErrors: parseInt(process.env.ERROR_RATE_LIMIT_MAX || '100'),
    },
    notifications: {
      criticalErrors: isProduction,
      highVolumeErrors: isProduction,
      newErrorTypes: isProduction,
      errorThreshold: parseInt(
        process.env.ERROR_NOTIFICATION_THRESHOLD || '10',
      ),
    },
    monitoring: {
      enableHealthChecks: true,
      enablePerformanceTracking: isProduction,
      enableMemoryLeakDetection: isProduction,
      alertThresholds: {
        errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5.0'), // 5%
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000'), // 2 seconds
        memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '80.0'), // 80%
      },
    },
    external: {},
  };

  // Configure external services
  if (process.env.SENTRY_DSN) {
    baseConfig.external.sentry = {
      dsn: process.env.SENTRY_DSN,
      environment: environment,
      sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
      ),
    };
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    baseConfig.external.slack = {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#alerts',
      username: process.env.SLACK_USERNAME || 'ZenStore Bot',
    };
  }

  if (process.env.SMTP_HOST) {
    baseConfig.external.email = {
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      recipients: (process.env.ERROR_EMAIL_RECIPIENTS || '')
        .split(',')
        .filter(Boolean),
      subject: process.env.ERROR_EMAIL_SUBJECT || 'ZenStore API Error Alert',
    };
  }

  return baseConfig;
};

export const errorHandlingConfig = getErrorHandlingConfig();

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  NETWORK = 'network',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

// Error types mapping
export const ERROR_TYPE_MAPPING = {
  // HTTP Status Codes
  400: { severity: ErrorSeverity.LOW, category: ErrorCategory.VALIDATION },
  401: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHENTICATION,
  },
  403: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHORIZATION,
  },
  404: { severity: ErrorSeverity.LOW, category: ErrorCategory.VALIDATION },
  409: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  422: { severity: ErrorSeverity.LOW, category: ErrorCategory.VALIDATION },
  429: { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.SYSTEM },
  500: { severity: ErrorSeverity.HIGH, category: ErrorCategory.SYSTEM },
  502: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.EXTERNAL_SERVICE,
  },
  503: { severity: ErrorSeverity.HIGH, category: ErrorCategory.SYSTEM },
  504: { severity: ErrorSeverity.HIGH, category: ErrorCategory.NETWORK },

  // Database Errors
  MongoError: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.DATABASE,
  },
  ValidationError: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
  },
  CastError: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
  },
  DocumentNotFoundError: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
  },

  // Application Errors
  BusinessLogicException: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  ResourceNotFoundException: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
  },
  UnauthorizedException: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHENTICATION,
  },
  ForbiddenException: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHORIZATION,
  },
} as const;

// Environment-specific configurations
export const ENVIRONMENT_ERROR_CONFIGS = {
  development: {
    enableDetailedErrors: true,
    enableStackTrace: true,
    enableErrorLogging: true,
    enableErrorMetrics: false,
    sanitizeSensitiveData: false,
    maxErrorMessageLength: 5000,
  },
  test: {
    enableDetailedErrors: false,
    enableStackTrace: false,
    enableErrorLogging: false,
    enableErrorMetrics: false,
    sanitizeSensitiveData: true,
    maxErrorMessageLength: 1000,
  },
  staging: {
    enableDetailedErrors: true,
    enableStackTrace: true,
    enableErrorLogging: true,
    enableErrorMetrics: true,
    sanitizeSensitiveData: true,
    maxErrorMessageLength: 1000,
  },
  production: {
    enableDetailedErrors: false,
    enableStackTrace: false,
    enableErrorLogging: true,
    enableErrorMetrics: true,
    sanitizeSensitiveData: true,
    maxErrorMessageLength: 500,
  },
} as const;

// Utility functions
export class ErrorHandlingConfigUtils {
  static getConfigForEnvironment(env: string): Partial<ErrorHandlingConfig> {
    return (
      ENVIRONMENT_ERROR_CONFIGS[
        env as keyof typeof ENVIRONMENT_ERROR_CONFIGS
      ] || ENVIRONMENT_ERROR_CONFIGS.development
    );
  }

  static getErrorSeverity(error: any): ErrorSeverity {
    const statusCode = error.status || error.statusCode;
    const errorName = error.name || error.constructor?.name;

    // Check by status code first
    if (statusCode && ERROR_TYPE_MAPPING[statusCode]) {
      return ERROR_TYPE_MAPPING[statusCode].severity;
    }

    // Check by error name
    if (errorName && ERROR_TYPE_MAPPING[errorName]) {
      return ERROR_TYPE_MAPPING[errorName].severity;
    }

    // Default to medium severity
    return ErrorSeverity.MEDIUM;
  }

  static getErrorCategory(error: any): ErrorCategory {
    const statusCode = error.status || error.statusCode;
    const errorName = error.name || error.constructor?.name;

    // Check by status code first
    if (statusCode && ERROR_TYPE_MAPPING[statusCode]) {
      return ERROR_TYPE_MAPPING[statusCode].category;
    }

    // Check by error name
    if (errorName && ERROR_TYPE_MAPPING[errorName]) {
      return ERROR_TYPE_MAPPING[errorName].category;
    }

    // Default to unknown category
    return ErrorCategory.UNKNOWN;
  }

  static shouldNotify(error: any, config: ErrorHandlingConfig): boolean {
    const severity = this.getErrorSeverity(error);

    // Always notify for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Notify for high severity errors in production
    if (
      severity === ErrorSeverity.HIGH &&
      config.notifications.criticalErrors
    ) {
      return true;
    }

    return false;
  }

  static sanitizeErrorForClient(error: any, config: ErrorHandlingConfig): any {
    if (!config.sanitizeSensitiveData) {
      return error;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
      'bankAccount',
    ];

    const sanitized = { ...error };

    // Remove sensitive fields from error message
    if (sanitized.message) {
      sensitiveFields.forEach((field) => {
        const regex = new RegExp(`${field}[\s]*[:=][\s]*[^\s,}]+`, 'gi');
        sanitized.message = sanitized.message.replace(
          regex,
          `${field}: [REDACTED]`,
        );
      });
    }

    // Limit message length
    if (
      sanitized.message &&
      sanitized.message.length > config.maxErrorMessageLength
    ) {
      sanitized.message =
        sanitized.message.substring(0, config.maxErrorMessageLength) + '...';
    }

    // Remove stack trace in production
    if (!config.enableStackTrace) {
      delete sanitized.stack;
    }

    return sanitized;
  }

  static formatErrorForLogging(error: any, context?: any): any {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status || error.statusCode,
      severity: this.getErrorSeverity(error),
      category: this.getErrorCategory(error),
      timestamp: new Date().toISOString(),
      context: context || {},
      environment: process.env.NODE_ENV || 'development',
      version: process.env.API_VERSION || 'v1',
    };
  }
}

// Export default configuration
export default errorHandlingConfig;
