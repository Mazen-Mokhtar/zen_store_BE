type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly';

export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableElastic: boolean;
  maxFileSize: string;
  maxFiles: number;
  datePattern: string;
  format: 'json' | 'simple' | 'combined';
  enableColors: boolean;
  enableTimestamp: boolean;
  enableMetadata: boolean;
  enableStackTrace: boolean;
  enableSanitization: boolean;
  sensitiveFields: string[];
  retention: {
    days: number;
    maxSize: string;
  };
  performance: {
    enableSlowQueryLogging: boolean;
    slowQueryThreshold: number;
    enableMemoryLogging: boolean;
    memoryThreshold: number;
  };
  security: {
    enableSecurityLogging: boolean;
    enableAuditLogging: boolean;
    enableFailedLoginLogging: boolean;
    maxFailedAttempts: number;
  };
  business: {
    enableBusinessLogging: boolean;
    enableTransactionLogging: boolean;
    enableUserActionLogging: boolean;
  };
  external: {
    elasticsearch?: {
      host: string;
      port: number;
      index: string;
      username?: string;
      password?: string;
    };
    logstash?: {
      host: string;
      port: number;
    };
    sentry?: {
      dsn: string;
      environment: string;
    };
  };
}

export const getLoggingConfig = (): LoggingConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const isTesting = environment === 'test';

  const baseConfig: LoggingConfig = {
    level:
      (process.env.LOG_LEVEL as LogLevel) || (isProduction ? 'info' : 'debug'),
    enableConsole: !isTesting,
    enableFile: true,
    enableDatabase: isProduction,
    enableElastic: isProduction && !!process.env.ELASTICSEARCH_HOST,
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
    datePattern: 'YYYY-MM-DD',
    format: isProduction ? 'json' : 'simple',
    enableColors: isDevelopment,
    enableTimestamp: true,
    enableMetadata: true,
    enableStackTrace: !isProduction,
    enableSanitization: true,
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
      'bankAccount',
      'apiKey',
      'privateKey',
      'accessToken',
      'refreshToken',
      'sessionId',
    ],
    retention: {
      days: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
      maxSize: process.env.LOG_MAX_SIZE || '1gb',
    },
    performance: {
      enableSlowQueryLogging: true,
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
      enableMemoryLogging: isProduction,
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '500'), // MB
    },
    security: {
      enableSecurityLogging: true,
      enableAuditLogging: isProduction,
      enableFailedLoginLogging: true,
      maxFailedAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5'),
    },
    business: {
      enableBusinessLogging: true,
      enableTransactionLogging: isProduction,
      enableUserActionLogging: isProduction,
    },
    external: {},
  };

  // Configure external logging services
  if (process.env.ELASTICSEARCH_HOST) {
    baseConfig.external.elasticsearch = {
      host: process.env.ELASTICSEARCH_HOST,
      port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
      index: process.env.ELASTICSEARCH_INDEX || 'zenstore-logs',
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    };
  }

  if (process.env.LOGSTASH_HOST) {
    baseConfig.external.logstash = {
      host: process.env.LOGSTASH_HOST,
      port: parseInt(process.env.LOGSTASH_PORT || '5000'),
    };
  }

  if (process.env.SENTRY_DSN) {
    baseConfig.external.sentry = {
      dsn: process.env.SENTRY_DSN,
      environment: environment,
    };
  }

  return baseConfig;
};

export const loggingConfig = getLoggingConfig();

// Log level hierarchy for reference
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

// Environment-specific configurations
export const ENVIRONMENT_CONFIGS = {
  development: {
    level: 'debug' as LogLevel,
    enableConsole: true,
    enableFile: true,
    enableDatabase: false,
    format: 'simple' as const,
    enableColors: true,
    enableStackTrace: true,
  },
  test: {
    level: 'error' as LogLevel,
    enableConsole: false,
    enableFile: false,
    enableDatabase: false,
    format: 'simple' as const,
    enableColors: false,
    enableStackTrace: false,
  },
  staging: {
    level: 'info' as LogLevel,
    enableConsole: true,
    enableFile: true,
    enableDatabase: true,
    format: 'json' as const,
    enableColors: false,
    enableStackTrace: true,
  },
  production: {
    level: 'info' as LogLevel,
    enableConsole: false,
    enableFile: true,
    enableDatabase: true,
    format: 'json' as const,
    enableColors: false,
    enableStackTrace: false,
  },
} as const;

// Utility functions
export class LoggingConfigUtils {
  static getConfigForEnvironment(env: string): Partial<LoggingConfig> {
    return (
      ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] ||
      ENVIRONMENT_CONFIGS.development
    );
  }

  static isLogLevelEnabled(
    currentLevel: LogLevel,
    targetLevel: LogLevel,
  ): boolean {
    return LOG_LEVELS[currentLevel] >= LOG_LEVELS[targetLevel];
  }

  static sanitizeSensitiveData(data: any, sensitiveFields: string[]): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSensitiveData(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  static formatLogMessage(
    level: LogLevel,
    message: string,
    metadata?: any,
  ): string {
    const timestamp = new Date().toISOString();
    const formattedMetadata = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedMetadata}`;
  }

  static shouldLogToExternal(level: LogLevel, config: LoggingConfig): boolean {
    const criticalLevels: LogLevel[] = ['error', 'warn'];
    return (
      criticalLevels.includes(level) &&
      (config.enableElastic || config.enableDatabase)
    );
  }

  static getLogFilePath(
    type: 'error' | 'combined' | 'access' | 'security' | 'business',
  ): string {
    const baseDir = process.env.LOG_DIR || './logs';
    const date = new Date().toISOString().split('T')[0];
    return `${baseDir}/${type}-${date}.log`;
  }

  static createLogRotationConfig() {
    return {
      filename: this.getLogFilePath('combined'),
      datePattern: loggingConfig.datePattern,
      maxSize: loggingConfig.maxFileSize,
      maxFiles: loggingConfig.maxFiles,
      zippedArchive: true,
      auditFile: `${process.env.LOG_DIR || './logs'}/audit.json`,
    };
  }
}

// Export default configuration
export default loggingConfig;
