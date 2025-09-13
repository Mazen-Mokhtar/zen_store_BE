import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../../health/health.service';

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByCategory: Record<string, number>;
  responseTimes: number[];
  lastReset: Date;
}

export interface ErrorMetric {
  type: string;
  severity: string;
  category: string;
  statusCode: number;
  endpoint: string;
  timestamp: Date;
  count?: number;
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsMiddleware.name);
  private healthService: HealthService;

  // We'll inject the health service when it's available
  setHealthService(healthService: HealthService): void {
    this.healthService = healthService;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const originalSend = res.send;
    const middleware = this; // Capture middleware instance

    // Override res.send to capture response metrics
    // Override send method to capture metrics and handle error formatting
    res.send = function (body: any) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Record metrics if health service is available
      if (middleware.healthService) {
        middleware.healthService.recordRequest(success, responseTime);
      }

      // Log request details
      middleware.logger.log(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`,
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          success,
        },
      );

      return originalSend.call(res, body);
    };

    next();
  }
}

/**
 * Global metrics collector
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: RequestMetrics;
  private errorMetrics: Map<string, ErrorMetric> = new Map();
  private readonly maxResponseTimes = 1000; // Keep last 1000 response times
  private readonly maxErrorMetrics = 5000; // Keep last 5000 error metrics

  private constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByMethod: {},
      requestsByEndpoint: {},
      errorsByType: {},
      errorsBySeverity: {},
      errorsByCategory: {},
      responseTimes: [],
      lastReset: new Date(),
    };
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  recordRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    errorMessage?: string,
  ): void {
    this.metrics.totalRequests++;

    // Record by method
    this.metrics.requestsByMethod[method] =
      (this.metrics.requestsByMethod[method] || 0) + 1;

    // Record by endpoint
    this.metrics.requestsByEndpoint[endpoint] =
      (this.metrics.requestsByEndpoint[endpoint] || 0) + 1;

    // Record success/failure
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      if (errorMessage) {
        this.metrics.errorsByType[errorMessage] =
          (this.metrics.errorsByType[errorMessage] || 0) + 1;
      }
    }

    // Record response time
    this.metrics.responseTimes.push(responseTime);

    // Keep only the last N response times
    if (this.metrics.responseTimes.length > this.maxResponseTimes) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(
        -this.maxResponseTimes,
      );
    }

    // Update average response time
    this.updateAverageResponseTime();
  }

  recordError(errorMetric: ErrorMetric): void {
    const key = `${errorMetric.type}_${errorMetric.endpoint}_${errorMetric.statusCode}`;

    if (this.errorMetrics.has(key)) {
      const existing = this.errorMetrics.get(key)!;
      existing.count = (existing.count || 1) + 1;
      existing.timestamp = errorMetric.timestamp;
    } else {
      errorMetric.count = 1;
      this.errorMetrics.set(key, errorMetric);
    }

    // Update severity and category counters
    this.metrics.errorsBySeverity[errorMetric.severity] =
      (this.metrics.errorsBySeverity[errorMetric.severity] || 0) + 1;

    this.metrics.errorsByCategory[errorMetric.category] =
      (this.metrics.errorsByCategory[errorMetric.category] || 0) + 1;

    // Clean up old error metrics if we have too many
    if (this.errorMetrics.size > this.maxErrorMetrics) {
      this.cleanupOldErrorMetrics();
    }
  }

  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  getErrorMetrics(): ErrorMetric[] {
    return Array.from(this.errorMetrics.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  getTopErrors(limit: number = 10): ErrorMetric[] {
    return Array.from(this.errorMetrics.values())
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);
  }

  getErrorsByTimeRange(startTime: Date, endTime: Date): ErrorMetric[] {
    return Array.from(this.errorMetrics.values())
      .filter(
        (error) => error.timestamp >= startTime && error.timestamp <= endTime,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
  }

  getAverageResponseTime(): number {
    return this.metrics.averageResponseTime;
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByMethod: {},
      requestsByEndpoint: {},
      errorsByType: {},
      errorsBySeverity: {},
      errorsByCategory: {},
      responseTimes: [],
      lastReset: new Date(),
    };
    this.errorMetrics.clear();
  }

  private updateAverageResponseTime(): void {
    if (this.metrics.responseTimes.length === 0) {
      this.metrics.averageResponseTime = 0;
      return;
    }

    const sum = this.metrics.responseTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageResponseTime = sum / this.metrics.responseTimes.length;
  }

  private cleanupOldErrorMetrics(): void {
    // Convert to array and sort by timestamp
    const errorArray = Array.from(this.errorMetrics.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // Remove oldest 20% of errors
    const removeCount = Math.floor(errorArray.length * 0.2);
    const toRemove = errorArray.slice(0, removeCount);

    toRemove.forEach(([key]) => {
      this.errorMetrics.delete(key);
    });
  }

  // Health check methods
  isHealthy(): boolean {
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();

    // Consider unhealthy if error rate > 10% or avg response time > 5 seconds
    return errorRate <= 10 && avgResponseTime <= 5000;
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    errorRate: number;
    averageResponseTime: number;
    totalRequests: number;
    recentErrors: ErrorMetric[];
  } {
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (errorRate > 20 || avgResponseTime > 10000) {
      status = 'critical';
    } else if (errorRate > 10 || avgResponseTime > 5000) {
      status = 'warning';
    }

    // Get recent errors (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentErrors = this.getErrorsByTimeRange(fiveMinutesAgo, new Date());

    return {
      status,
      errorRate,
      averageResponseTime: avgResponseTime,
      totalRequests: this.metrics.totalRequests,
      recentErrors: recentErrors.slice(0, 10), // Last 10 recent errors
    };
  }
}
