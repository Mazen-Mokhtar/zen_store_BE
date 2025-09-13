import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EnhancedLoggingService } from './logging.service';
import {
  MetricsCollector,
  ErrorMetric,
} from '../middleware/metrics.middleware';
import {
  getMonitoringConfig,
  MonitoringConfig,
  AlertSeverity,
  AlertRule,
  STANDARD_ALERT_RULES,
  MonitoringConfigUtils,
} from '../../config/monitoring.config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import * as os from 'os';
import * as process from 'process';

export interface Alert {
  id: string;
  rule: AlertRule;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  uptime: number;
  timestamp: Date;
}

export interface MonitoringReport {
  timestamp: Date;
  system: SystemMetrics;
  application: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      errorRate: number;
      averageResponseTime: number;
    };
    errors: {
      total: number;
      recent: ErrorMetric[];
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    health: {
      status: 'healthy' | 'warning' | 'critical';
      checks: Record<string, any>;
    };
  };
  alerts: {
    active: Alert[];
    recent: Alert[];
  };
}

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private config: MonitoringConfig;
  private metricsCollector: MetricsCollector;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private monitoringInterval: NodeJS.Timeout;
  private emailTransporter: nodemailer.Transporter;
  private systemMetricsHistory: SystemMetrics[] = [];
  private readonly maxHistorySize = 1000;

  constructor(private readonly logger: EnhancedLoggingService) {
    this.config = getMonitoringConfig();
    this.metricsCollector = MetricsCollector.getInstance();
    this.initializeEmailTransporter();
  }

  async onModuleInit() {
    if (this.config.enabled) {
      this.logger.log('Starting monitoring service', {
        component: 'MonitoringService',
        config: {
          metricsEnabled: this.config.metrics.enabled,
          alertsEnabled: this.config.alerts.enabled,
          interval: this.config.metrics.collection.interval,
        },
      });

      this.startMonitoring();
    }
  }

  async onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.logger.log('Monitoring service stopped', {
        component: 'MonitoringService',
      });
    }
  }

  private initializeEmailTransporter(): void {
    if (this.config.alerts.channels.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: this.config.alerts.channels.email.smtp.host,
          port: this.config.alerts.channels.email.smtp.port,
          secure: this.config.alerts.channels.email.smtp.secure,
          auth: this.config.alerts.channels.email.smtp.auth,
        });
      } catch (error) {
        this.logger.error(
          'Failed to initialize email transporter: ' + (error as Error).message,
        );
      }
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectAndAnalyzeMetrics();
    }, this.config.metrics.collection.interval);

    // Initial collection
    this.collectAndAnalyzeMetrics();
  }

  private async collectAndAnalyzeMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const systemMetrics = this.collectSystemMetrics();
      this.systemMetricsHistory.push(systemMetrics);

      // Keep history size manageable
      if (this.systemMetricsHistory.length > this.maxHistorySize) {
        this.systemMetricsHistory = this.systemMetricsHistory.slice(
          -this.maxHistorySize,
        );
      }

      // Collect application metrics
      const appMetrics = this.metricsCollector.getMetrics();
      const healthStatus = this.metricsCollector.getHealthStatus();

      // Analyze metrics and trigger alerts if needed
      await this.analyzeMetricsAndTriggerAlerts(
        systemMetrics,
        appMetrics,
        healthStatus,
      );

      this.logger.debug('Metrics collected and analyzed', {
        component: 'MonitoringService',
        systemMetrics: {
          memoryUsage: systemMetrics.memory.percentage,
          cpuUsage: systemMetrics.cpu.usage,
        },
        appMetrics: {
          totalRequests: appMetrics.totalRequests,
          errorRate: this.metricsCollector.getErrorRate(),
          avgResponseTime: appMetrics.averageResponseTime,
        },
      });
    } catch (error) {
      this.logger.error(
        'Error during metrics collection: ' + (error as Error).message,
      );
    }
  }

  private collectSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (100 * totalIdle) / totalTick;
  }

  private async analyzeMetricsAndTriggerAlerts(
    systemMetrics: SystemMetrics,
    appMetrics: any,
    healthStatus: any,
  ): Promise<void> {
    if (!this.config.alerts.enabled) {
      return;
    }

    const currentTime = new Date();
    const errorRate = this.metricsCollector.getErrorRate();
    const avgResponseTime = appMetrics.averageResponseTime;

    // Check error rate
    if (this.config.alerts.rules.errorRate.enabled) {
      await this.checkMetricThreshold(
        'error_rate',
        errorRate,
        this.config.alerts.rules.errorRate.threshold,
        'Error rate is above threshold',
        currentTime,
      );
    }

    // Check response time
    if (this.config.alerts.rules.responseTime.enabled) {
      await this.checkMetricThreshold(
        'response_time',
        avgResponseTime,
        this.config.alerts.rules.responseTime.threshold,
        'Average response time is above threshold',
        currentTime,
      );
    }

    // Check memory usage
    await this.checkMetricThreshold(
      'memory_usage',
      systemMetrics.memory.percentage,
      this.config.metrics.thresholds.memoryUsage.warning,
      'Memory usage is above threshold',
      currentTime,
    );

    // Check CPU usage
    await this.checkMetricThreshold(
      'cpu_usage',
      systemMetrics.cpu.usage,
      this.config.metrics.thresholds.cpuUsage.warning,
      'CPU usage is above threshold',
      currentTime,
    );

    // Check health status
    if (
      this.config.alerts.rules.healthCheck.enabled &&
      healthStatus.status !== 'healthy'
    ) {
      await this.triggerAlert(
        {
          id: 'health_check_failure',
          name: 'Health Check Failure',
          description: 'Application health check is failing',
          severity:
            healthStatus.status === 'critical'
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING,
          condition: {
            metric: 'health_status',
            operator: 'eq',
            threshold: 0,
            duration: 0,
          },
          enabled: true,
          cooldown: this.config.alerts.rules.healthCheck.cooldown,
          channels: ['email', 'slack'],
        },
        0,
        1,
        `Health check status: ${healthStatus.status}`,
        currentTime,
      );
    }
  }

  private async checkMetricThreshold(
    metricName: string,
    value: number,
    threshold: number,
    message: string,
    timestamp: Date,
  ): Promise<void> {
    if (value > threshold) {
      const alertRule = STANDARD_ALERT_RULES.find((rule) =>
        rule.condition.metric.includes(metricName),
      );

      if (alertRule) {
        await this.triggerAlert(
          alertRule,
          value,
          threshold,
          message,
          timestamp,
        );
      }
    } else {
      // Check if we need to resolve an existing alert
      await this.resolveAlert(metricName, timestamp);
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    value: number,
    threshold: number,
    message: string,
    timestamp: Date,
  ): Promise<void> {
    const alertId = rule.id;

    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertId);
    if (lastAlert) {
      const cooldownEnd = new Date(
        lastAlert.getTime() + rule.cooldown * 60 * 1000,
      );
      if (timestamp < cooldownEnd) {
        return; // Still in cooldown
      }
    }

    const alert: Alert = {
      id: alertId,
      rule,
      severity: rule.severity,
      message,
      value,
      threshold,
      timestamp,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertCooldowns.set(alertId, timestamp);

    // Send alert through configured channels
    await this.sendAlert(alert);

    this.logger.warn('Alert triggered', {
      component: 'MonitoringService',
      alert: {
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
      },
    });
  }

  private async resolveAlert(
    metricName: string,
    timestamp: Date,
  ): Promise<void> {
    const alertId = STANDARD_ALERT_RULES.find((rule) =>
      rule.condition.metric.includes(metricName),
    )?.id;

    if (alertId && this.activeAlerts.has(alertId)) {
      const alert = this.activeAlerts.get(alertId)!;
      alert.resolved = true;
      alert.resolvedAt = timestamp;

      this.activeAlerts.delete(alertId);

      this.logger.log('Alert resolved', {
        component: 'MonitoringService',
        alertId,
        resolvedAt: timestamp,
      });
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of alert.rule.channels) {
      switch (channel) {
        case 'email':
          if (this.config.alerts.channels.email.enabled) {
            promises.push(this.sendEmailAlert(alert));
          }
          break;
        case 'slack':
          if (this.config.alerts.channels.slack.enabled) {
            promises.push(this.sendSlackAlert(alert));
          }
          break;
        case 'webhook':
          if (this.config.alerts.channels.webhook.enabled) {
            promises.push(this.sendWebhookAlert(alert));
          }
          break;
      }
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error(
        'Error sending alerts: ' +
          (error as Error).message +
          ', alertId: ' +
          alert.id,
      );
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.emailTransporter) {
      return;
    }

    const subject = `[${alert.severity.toUpperCase()}] ${alert.rule.name}`;
    const html = this.generateEmailTemplate(alert);

    try {
      await this.emailTransporter.sendMail({
        from: this.config.alerts.channels.email.smtp.auth.user,
        to: this.config.alerts.channels.email.recipients,
        subject,
        html,
      });

      this.logger.log('Email alert sent', {
        component: 'MonitoringService',
        alertId: alert.id,
        recipients: this.config.alerts.channels.email.recipients.length,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send email alert: ' +
          (error as Error).message +
          ', alertId: ' +
          alert.id,
      );
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    const payload = {
      channel: this.config.alerts.channels.slack.channel,
      username: this.config.alerts.channels.slack.username,
      text: `🚨 *${alert.rule.name}*`,
      attachments: [
        {
          color: this.getSlackColor(alert.severity),
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Value',
              value: MonitoringConfigUtils.formatMetricValue(alert.value),
              short: true,
            },
            {
              title: 'Threshold',
              value: MonitoringConfigUtils.formatMetricValue(alert.threshold),
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
            {
              title: 'Description',
              value: alert.message,
              short: false,
            },
          ],
          footer: 'ZenStore Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    try {
      await axios.post(this.config.alerts.channels.slack.webhookUrl, payload);

      this.logger.log('Slack alert sent', {
        component: 'MonitoringService',
        alertId: alert.id,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send Slack alert: ' +
          (error as Error).message +
          ', alertId: ' +
          alert.id,
      );
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        rule: alert.rule.name,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        timestamp: alert.timestamp.toISOString(),
      },
      service: 'zenstore-api',
      environment: process.env.NODE_ENV || 'development',
    };

    try {
      await axios.post(this.config.alerts.channels.webhook.url, payload, {
        headers: this.config.alerts.channels.webhook.headers,
        timeout: this.config.alerts.channels.webhook.timeout,
      });

      this.logger.log('Webhook alert sent', {
        component: 'MonitoringService',
        alertId: alert.id,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send webhook alert: ' +
          (error as Error).message +
          ', alertId: ' +
          alert.id,
      );
    }
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .alert { border-left: 4px solid ${this.getAlertColor(alert.severity)}; padding: 20px; margin: 20px 0; }
          .header { color: ${this.getAlertColor(alert.severity)}; font-size: 24px; margin-bottom: 10px; }
          .details { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
          .metric { margin: 10px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="alert">
          <div class="header">🚨 ${alert.rule.name}</div>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Description:</strong> ${alert.message}</p>
          
          <div class="details">
            <div class="metric"><strong>Current Value:</strong> ${MonitoringConfigUtils.formatMetricValue(alert.value)}</div>
            <div class="metric"><strong>Threshold:</strong> ${MonitoringConfigUtils.formatMetricValue(alert.threshold)}</div>
            <div class="metric"><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</div>
          </div>
          
          <div class="footer">
            <p>This alert was generated by ZenStore Monitoring System</p>
            <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'danger';
      case AlertSeverity.WARNING:
        return 'warning';
      default:
        return 'good';
    }
  }

  private getAlertColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '#dc3545';
      case AlertSeverity.WARNING:
        return '#ffc107';
      default:
        return '#28a745';
    }
  }

  // Public methods for getting monitoring data
  getMonitoringReport(): MonitoringReport {
    const appMetrics = this.metricsCollector.getMetrics();
    const healthStatus = this.metricsCollector.getHealthStatus();
    const errorMetrics = this.metricsCollector.getErrorMetrics();
    const currentSystemMetrics = this.collectSystemMetrics();

    return {
      timestamp: new Date(),
      system: currentSystemMetrics,
      application: {
        requests: {
          total: appMetrics.totalRequests,
          successful: appMetrics.successfulRequests,
          failed: appMetrics.failedRequests,
          errorRate: this.metricsCollector.getErrorRate(),
          averageResponseTime: appMetrics.averageResponseTime,
        },
        errors: {
          total: appMetrics.failedRequests,
          recent: errorMetrics.slice(0, 10),
          byType: appMetrics.errorsByType,
          bySeverity: appMetrics.errorsBySeverity,
        },
        health: {
          status: healthStatus.status,
          checks: healthStatus,
        },
      },
      alerts: {
        active: Array.from(this.activeAlerts.values()),
        recent: Array.from(this.activeAlerts.values())
          .filter(
            (alert) =>
              alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      },
    };
  }

  getSystemMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.systemMetricsHistory.filter(
      (metric) => metric.timestamp > cutoff,
    );
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  async testAlert(alertId: string): Promise<void> {
    const rule = STANDARD_ALERT_RULES.find((r) => r.id === alertId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${alertId}`);
    }

    const testAlert: Alert = {
      id: `test_${alertId}`,
      rule,
      severity: AlertSeverity.WARNING,
      message: 'This is a test alert',
      value: rule.condition.threshold + 1,
      threshold: rule.condition.threshold,
      timestamp: new Date(),
    };

    await this.sendAlert(testAlert);

    this.logger.log('Test alert sent', {
      component: 'MonitoringService',
      alertId: testAlert.id,
    });
  }

  resetMetrics(): void {
    this.metricsCollector.resetMetrics();
    this.systemMetricsHistory = [];
    this.activeAlerts.clear();
    this.alertCooldowns.clear();

    this.logger.log('Monitoring metrics reset', {
      component: 'MonitoringService',
    });
  }
}
