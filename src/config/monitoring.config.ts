export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    collection: {
      interval: number; // milliseconds
      retention: {
        requests: number; // number of requests to keep
        errors: number; // number of errors to keep
        performance: number; // number of performance metrics to keep
      };
    };
    thresholds: {
      errorRate: {
        warning: number; // percentage
        critical: number; // percentage
      };
      responseTime: {
        warning: number; // milliseconds
        critical: number; // milliseconds
      };
      memoryUsage: {
        warning: number; // percentage
        critical: number; // percentage
      };
      cpuUsage: {
        warning: number; // percentage
        critical: number; // percentage
      };
    };
  };
  alerts: {
    enabled: boolean;
    channels: {
      email: {
        enabled: boolean;
        recipients: string[];
        smtp: {
          host: string;
          port: number;
          secure: boolean;
          auth: {
            user: string;
            pass: string;
          };
        };
      };
      slack: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
        username: string;
      };
      webhook: {
        enabled: boolean;
        url: string;
        headers: Record<string, string>;
        timeout: number;
      };
    };
    rules: {
      errorRate: {
        enabled: boolean;
        threshold: number;
        duration: number; // minutes
        cooldown: number; // minutes
      };
      responseTime: {
        enabled: boolean;
        threshold: number;
        duration: number;
        cooldown: number;
      };
      healthCheck: {
        enabled: boolean;
        failureCount: number;
        cooldown: number;
      };
    };
  };
  dashboard: {
    enabled: boolean;
    refreshInterval: number; // seconds
    charts: {
      requests: boolean;
      errors: boolean;
      performance: boolean;
      health: boolean;
    };
  };
  external: {
    prometheus: {
      enabled: boolean;
      endpoint: string;
      pushGateway?: {
        url: string;
        jobName: string;
      };
    };
    grafana: {
      enabled: boolean;
      dashboardUrl?: string;
    };
    newRelic: {
      enabled: boolean;
      licenseKey?: string;
      appName?: string;
    };
    datadog: {
      enabled: boolean;
      apiKey?: string;
      site?: string;
    };
  };
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // minutes
  };
  enabled: boolean;
  cooldown: number; // minutes
  channels: string[];
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels?: string[];
  unit?: string;
}

// Environment-specific configurations
const DEVELOPMENT_CONFIG: MonitoringConfig = {
  enabled: true,
  metrics: {
    enabled: true,
    collection: {
      interval: 30000, // 30 seconds
      retention: {
        requests: 1000,
        errors: 500,
        performance: 200,
      },
    },
    thresholds: {
      errorRate: {
        warning: 15,
        critical: 25,
      },
      responseTime: {
        warning: 3000,
        critical: 8000,
      },
      memoryUsage: {
        warning: 80,
        critical: 90,
      },
      cpuUsage: {
        warning: 80,
        critical: 90,
      },
    },
  },
  alerts: {
    enabled: false, // Disabled in development
    channels: {
      email: {
        enabled: false,
        recipients: [],
        smtp: {
          host: 'localhost',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: '',
          },
        },
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#dev-alerts',
        username: 'ZenStore Bot',
      },
      webhook: {
        enabled: false,
        url: '',
        headers: {},
        timeout: 5000,
      },
    },
    rules: {
      errorRate: {
        enabled: false,
        threshold: 20,
        duration: 5,
        cooldown: 15,
      },
      responseTime: {
        enabled: false,
        threshold: 5000,
        duration: 5,
        cooldown: 15,
      },
      healthCheck: {
        enabled: false,
        failureCount: 3,
        cooldown: 10,
      },
    },
  },
  dashboard: {
    enabled: true,
    refreshInterval: 30,
    charts: {
      requests: true,
      errors: true,
      performance: true,
      health: true,
    },
  },
  external: {
    prometheus: {
      enabled: false,
      endpoint: '/metrics',
    },
    grafana: {
      enabled: false,
    },
    newRelic: {
      enabled: false,
    },
    datadog: {
      enabled: false,
    },
  },
};

const PRODUCTION_CONFIG: MonitoringConfig = {
  enabled: true,
  metrics: {
    enabled: true,
    collection: {
      interval: 60000, // 1 minute
      retention: {
        requests: 10000,
        errors: 5000,
        performance: 2000,
      },
    },
    thresholds: {
      errorRate: {
        warning: 5,
        critical: 10,
      },
      responseTime: {
        warning: 2000,
        critical: 5000,
      },
      memoryUsage: {
        warning: 70,
        critical: 85,
      },
      cpuUsage: {
        warning: 70,
        critical: 85,
      },
    },
  },
  alerts: {
    enabled: true,
    channels: {
      email: {
        enabled: true,
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        },
      },
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#alerts',
        username: 'ZenStore Monitor',
      },
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        url: process.env.ALERT_WEBHOOK_URL || '',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.ALERT_WEBHOOK_TOKEN
            ? `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
            : '',
        },
        timeout: 10000,
      },
    },
    rules: {
      errorRate: {
        enabled: true,
        threshold: 5,
        duration: 5,
        cooldown: 30,
      },
      responseTime: {
        enabled: true,
        threshold: 3000,
        duration: 5,
        cooldown: 30,
      },
      healthCheck: {
        enabled: true,
        failureCount: 2,
        cooldown: 15,
      },
    },
  },
  dashboard: {
    enabled: true,
    refreshInterval: 60,
    charts: {
      requests: true,
      errors: true,
      performance: true,
      health: true,
    },
  },
  external: {
    prometheus: {
      enabled: !!process.env.PROMETHEUS_ENABLED,
      endpoint: '/metrics',
      pushGateway: process.env.PROMETHEUS_PUSH_GATEWAY
        ? {
            url: process.env.PROMETHEUS_PUSH_GATEWAY,
            jobName: process.env.PROMETHEUS_JOB_NAME || 'zenstore-api',
          }
        : undefined,
    },
    grafana: {
      enabled: !!process.env.GRAFANA_DASHBOARD_URL,
      dashboardUrl: process.env.GRAFANA_DASHBOARD_URL,
    },
    newRelic: {
      enabled: !!process.env.NEW_RELIC_LICENSE_KEY,
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      appName: process.env.NEW_RELIC_APP_NAME || 'ZenStore API',
    },
    datadog: {
      enabled: !!process.env.DATADOG_API_KEY,
      apiKey: process.env.DATADOG_API_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
    },
  },
};

const STAGING_CONFIG: MonitoringConfig = {
  ...PRODUCTION_CONFIG,
  alerts: {
    ...PRODUCTION_CONFIG.alerts,
    enabled: true,
    channels: {
      ...PRODUCTION_CONFIG.alerts.channels,
      email: {
        ...PRODUCTION_CONFIG.alerts.channels.email,
        recipients:
          process.env.STAGING_ALERT_EMAIL_RECIPIENTS?.split(',') || [],
      },
      slack: {
        ...PRODUCTION_CONFIG.alerts.channels.slack,
        channel: process.env.STAGING_SLACK_CHANNEL || '#staging-alerts',
      },
    },
    rules: {
      ...PRODUCTION_CONFIG.alerts.rules,
      errorRate: {
        ...PRODUCTION_CONFIG.alerts.rules.errorRate,
        threshold: 10, // More lenient in staging
      },
      responseTime: {
        ...PRODUCTION_CONFIG.alerts.rules.responseTime,
        threshold: 5000, // More lenient in staging
      },
    },
  },
};

const ENVIRONMENT_CONFIGS = {
  development: DEVELOPMENT_CONFIG,
  staging: STAGING_CONFIG,
  production: PRODUCTION_CONFIG,
};

export function getMonitoringConfig(): MonitoringConfig {
  const env =
    (process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS) || 'development';
  return ENVIRONMENT_CONFIGS[env] || DEVELOPMENT_CONFIG;
}

// Predefined metric definitions
export const STANDARD_METRICS: MetricDefinition[] = [
  {
    name: 'http_requests_total',
    type: MetricType.COUNTER,
    description: 'Total number of HTTP requests',
    labels: ['method', 'endpoint', 'status_code'],
  },
  {
    name: 'http_request_duration_seconds',
    type: MetricType.HISTOGRAM,
    description: 'HTTP request duration in seconds',
    labels: ['method', 'endpoint'],
    unit: 'seconds',
  },
  {
    name: 'http_errors_total',
    type: MetricType.COUNTER,
    description: 'Total number of HTTP errors',
    labels: ['type', 'severity', 'category'],
  },
  {
    name: 'system_memory_usage_percent',
    type: MetricType.GAUGE,
    description: 'System memory usage percentage',
    unit: 'percent',
  },
  {
    name: 'system_cpu_usage_percent',
    type: MetricType.GAUGE,
    description: 'System CPU usage percentage',
    unit: 'percent',
  },
  {
    name: 'database_connections_active',
    type: MetricType.GAUGE,
    description: 'Number of active database connections',
  },
  {
    name: 'cache_hits_total',
    type: MetricType.COUNTER,
    description: 'Total number of cache hits',
    labels: ['cache_type'],
  },
  {
    name: 'cache_misses_total',
    type: MetricType.COUNTER,
    description: 'Total number of cache misses',
    labels: ['cache_type'],
  },
];

// Predefined alert rules
export const STANDARD_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Error rate is above acceptable threshold',
    severity: AlertSeverity.CRITICAL,
    condition: {
      metric: 'error_rate_percent',
      operator: 'gt',
      threshold: 10,
      duration: 5,
    },
    enabled: true,
    cooldown: 30,
    channels: ['email', 'slack'],
  },
  {
    id: 'slow_response_time',
    name: 'Slow Response Time',
    description: 'Average response time is too high',
    severity: AlertSeverity.WARNING,
    condition: {
      metric: 'avg_response_time_ms',
      operator: 'gt',
      threshold: 3000,
      duration: 5,
    },
    enabled: true,
    cooldown: 15,
    channels: ['slack'],
  },
  {
    id: 'health_check_failure',
    name: 'Health Check Failure',
    description: 'Health check is failing',
    severity: AlertSeverity.CRITICAL,
    condition: {
      metric: 'health_check_status',
      operator: 'eq',
      threshold: 0,
      duration: 2,
    },
    enabled: true,
    cooldown: 10,
    channels: ['email', 'slack', 'webhook'],
  },
  {
    id: 'high_memory_usage',
    name: 'High Memory Usage',
    description: 'Memory usage is above threshold',
    severity: AlertSeverity.WARNING,
    condition: {
      metric: 'memory_usage_percent',
      operator: 'gt',
      threshold: 80,
      duration: 10,
    },
    enabled: true,
    cooldown: 20,
    channels: ['slack'],
  },
];

export class MonitoringConfigUtils {
  static isMetricEnabled(metricName: string): boolean {
    const config = getMonitoringConfig();
    return config.enabled && config.metrics.enabled;
  }

  static isAlertEnabled(alertId: string): boolean {
    const config = getMonitoringConfig();
    return config.enabled && config.alerts.enabled;
  }

  static getMetricThreshold(
    metricType: string,
    level: 'warning' | 'critical',
  ): number {
    const config = getMonitoringConfig();
    const thresholds = config.metrics.thresholds;

    switch (metricType) {
      case 'errorRate':
        return thresholds.errorRate[level];
      case 'responseTime':
        return thresholds.responseTime[level];
      case 'memoryUsage':
        return thresholds.memoryUsage[level];
      case 'cpuUsage':
        return thresholds.cpuUsage[level];
      default:
        return level === 'warning' ? 80 : 90;
    }
  }

  static shouldSendAlert(
    metricType: string,
    value: number,
  ): { shouldAlert: boolean; severity: AlertSeverity } {
    const warningThreshold = this.getMetricThreshold(metricType, 'warning');
    const criticalThreshold = this.getMetricThreshold(metricType, 'critical');

    if (value >= criticalThreshold) {
      return { shouldAlert: true, severity: AlertSeverity.CRITICAL };
    } else if (value >= warningThreshold) {
      return { shouldAlert: true, severity: AlertSeverity.WARNING };
    }

    return { shouldAlert: false, severity: AlertSeverity.INFO };
  }

  static getEnabledChannels(): string[] {
    const config = getMonitoringConfig();
    const channels: string[] = [];

    if (config.alerts.channels.email.enabled) {
      channels.push('email');
    }
    if (config.alerts.channels.slack.enabled) {
      channels.push('slack');
    }
    if (config.alerts.channels.webhook.enabled) {
      channels.push('webhook');
    }

    return channels;
  }

  static formatMetricValue(value: number, unit?: string): string {
    if (unit === 'percent') {
      return `${value.toFixed(1)}%`;
    } else if (unit === 'seconds') {
      return `${value.toFixed(3)}s`;
    } else if (unit === 'milliseconds') {
      return `${Math.round(value)}ms`;
    }
    return value.toString();
  }

  static validateConfig(config: MonitoringConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.alerts.enabled) {
      if (
        config.alerts.channels.email.enabled &&
        !config.alerts.channels.email.recipients.length
      ) {
        errors.push('Email alerts enabled but no recipients configured');
      }

      if (
        config.alerts.channels.slack.enabled &&
        !config.alerts.channels.slack.webhookUrl
      ) {
        errors.push('Slack alerts enabled but no webhook URL configured');
      }

      if (
        config.alerts.channels.webhook.enabled &&
        !config.alerts.channels.webhook.url
      ) {
        errors.push('Webhook alerts enabled but no URL configured');
      }
    }

    if (
      config.external.prometheus.enabled &&
      !config.external.prometheus.endpoint
    ) {
      errors.push('Prometheus enabled but no endpoint configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export the configuration instance
export const monitoringConfig = getMonitoringConfig();
