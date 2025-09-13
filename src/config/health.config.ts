export interface HealthConfig {
  endpoints: {
    health: string;
    ready: string;
    live: string;
    metrics: string;
  };
  checks: {
    database: {
      enabled: boolean;
      timeout: number;
    };
    redis: {
      enabled: boolean;
      timeout: number;
    };
    memory: {
      enabled: boolean;
      maxUsagePercent: number;
    };
    disk: {
      enabled: boolean;
      maxUsagePercent: number;
    };
    external: {
      enabled: boolean;
      services: Array<{
        name: string;
        url: string;
        timeout: number;
        method: 'GET' | 'POST' | 'HEAD';
      }>;
    };
  };
  thresholds: {
    responseTime: {
      warning: number;
      critical: number;
    };
    errorRate: {
      warning: number;
      critical: number;
    };
    memory: {
      warning: number;
      critical: number;
    };
  };
  monitoring: {
    metricsRetention: number; // in milliseconds
    slowRequestThreshold: number;
    errorLogRetention: number;
  };
}

export const healthConfig: HealthConfig = {
  endpoints: {
    health: '/health',
    ready: '/health/ready',
    live: '/health/live',
    metrics: '/health/metrics',
  },
  checks: {
    database: {
      enabled: true,
      timeout: 5000, // 5 seconds
    },
    redis: {
      enabled: true,
      timeout: 3000, // 3 seconds
    },
    memory: {
      enabled: true,
      maxUsagePercent: 90,
    },
    disk: {
      enabled: true,
      maxUsagePercent: 85,
    },
    external: {
      enabled: process.env.NODE_ENV === 'production',
      services: [
        {
          name: 'Payment Gateway',
          url:
            process.env.PAYMENT_GATEWAY_HEALTH_URL ||
            'https://api.stripe.com/v1/charges',
          timeout: 5000,
          method: 'HEAD',
        },
        // Add more external services as needed
      ],
    },
  },
  thresholds: {
    responseTime: {
      warning: 1000, // 1 second
      critical: 3000, // 3 seconds
    },
    errorRate: {
      warning: 5, // 5%
      critical: 10, // 10%
    },
    memory: {
      warning: 80, // 80%
      critical: 90, // 90%
    },
  },
  monitoring: {
    metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
    slowRequestThreshold: 2000, // 2 seconds
    errorLogRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

/**
 * Get health configuration based on environment
 */
export function getHealthConfig(): HealthConfig {
  const env = process.env.NODE_ENV || 'development';

  // Development overrides
  if (env === 'development') {
    return {
      ...healthConfig,
      checks: {
        ...healthConfig.checks,
        external: {
          ...healthConfig.checks.external,
          enabled: false, // Disable external checks in development
        },
      },
      thresholds: {
        ...healthConfig.thresholds,
        responseTime: {
          warning: 2000, // More lenient in development
          critical: 5000,
        },
      },
    };
  }

  // Test environment overrides
  if (env === 'test') {
    return {
      ...healthConfig,
      checks: {
        ...healthConfig.checks,
        database: {
          ...healthConfig.checks.database,
          timeout: 1000, // Faster timeouts for tests
        },
        redis: {
          ...healthConfig.checks.redis,
          timeout: 1000,
        },
        external: {
          ...healthConfig.checks.external,
          enabled: false, // Disable external checks in tests
        },
      },
    };
  }

  // Production configuration (default)
  return healthConfig;
}

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  DOWN = 'down',
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  details?: any;
  timestamp: string;
  responseTime?: number;
}

/**
 * Service health check interface
 */
export interface ServiceHealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  details?: any;
  responseTime: number;
  timestamp: string;
}

/**
 * Overall health summary
 */
export interface HealthSummary {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  services: ServiceHealthCheck[];
  metrics?: any;
}
