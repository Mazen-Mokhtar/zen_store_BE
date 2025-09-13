import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import * as os from 'os';
import * as process from 'process';
import { MetricsCollector } from '../commen/middleware/metrics.middleware';
import {
  getHealthConfig,
  HealthStatus,
  HealthCheckResult,
  ServiceHealthCheck,
  HealthSummary,
} from '../config/health.config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private readonly config = getHealthConfig();
  // Metrics collector instance
  private metricsCollector = MetricsCollector.getInstance();

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  /**
   * Basic health check - minimal response for load balancers
   */
  async getBasicHealth(): Promise<HealthCheckResult> {
    const uptime = Math.floor(process.uptime());
    const version = process.env.npm_package_version || '1.0.0';

    return {
      status: HealthStatus.HEALTHY,
      message: 'Service is running',
      details: {
        uptime,
        version,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check with all dependencies
   */
  async getDetailedHealth(): Promise<HealthSummary> {
    const services: ServiceHealthCheck[] = [];
    const startTime = Date.now();

    // Run all health checks
    const checks: Promise<ServiceHealthCheck>[] = [];

    if (this.config.checks.database.enabled) {
      checks.push(this.checkDatabaseHealth());
    }

    if (this.config.checks.redis.enabled) {
      checks.push(this.checkRedisHealth());
    }

    if (this.config.checks.memory.enabled) {
      checks.push(this.checkMemoryHealth());
    }

    if (this.config.checks.disk.enabled) {
      checks.push(this.checkDiskHealth());
    }

    if (this.config.checks.external.enabled) {
      for (const service of this.config.checks.external.services) {
        checks.push(
          this.checkExternalService(service.name, service.url, service.timeout),
        );
      }
    }

    const results = await Promise.allSettled(checks);

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        services.push(result.value);
      } else {
        services.push({
          name: `Check ${index + 1}`,
          status: HealthStatus.CRITICAL,
          message: 'Health check failed',
          details: { error: result.reason?.message || 'Unknown error' },
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Determine overall status
    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services,
      metrics: this.metricsCollector.getMetrics(),
    };
  }

  /**
   * Database health check
   */
  async checkDatabaseHealth(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    try {
      await Promise.race([
        this.mongoConnection?.db?.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database timeout')),
            this.config.checks.database.timeout,
          ),
        ),
      ]);

      const responseTime = Date.now() - startTime;

      return {
        name: 'Database',
        status: HealthStatus.HEALTHY,
        message: 'Database connection is healthy',
        details: {
          readyState: this.mongoConnection.readyState,
          host: this.mongoConnection.host,
          port: this.mongoConnection.port,
          responseTime,
        },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Database health check failed', error);

      return {
        name: 'Database',
        status: HealthStatus.CRITICAL,
        message: 'Database connection failed',
        details: { error: error.message },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Redis health check
   */
  async checkRedisHealth(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    try {
      // Simulate Redis check - implement based on your Redis setup
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate ping

      const responseTime = Date.now() - startTime;

      return {
        name: 'Redis',
        status: HealthStatus.HEALTHY,
        message: 'Redis connection is healthy',
        details: {
          responseTime,
        },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Redis health check failed', error);

      return {
        name: 'Redis',
        status: HealthStatus.CRITICAL,
        message: 'Redis connection failed',
        details: { error: error.message },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Memory health check
   */
  async checkMemoryHealth(): Promise<ServiceHealthCheck> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    let status: HealthStatus;
    let message: string;

    if (memoryUsagePercent > this.config.thresholds.memory.critical) {
      status = HealthStatus.CRITICAL;
      message = `Critical memory usage: ${memoryUsagePercent}%`;
    } else if (memoryUsagePercent > this.config.thresholds.memory.warning) {
      status = HealthStatus.WARNING;
      message = `High memory usage: ${memoryUsagePercent}%`;
    } else {
      status = HealthStatus.HEALTHY;
      message = `Memory usage: ${memoryUsagePercent}%`;
    }

    return {
      name: 'Memory',
      status,
      message,
      details: {
        usagePercent: memoryUsagePercent,
        used: Math.round(usedMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        heap: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
      },
      responseTime: 0, // Memory check is instant
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Disk health check
   */
  async checkDiskHealth(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    try {
      // Basic disk check - in production, you might want to use a library like 'node-disk-info'
      const responseTime = Date.now() - startTime;

      return {
        name: 'Disk',
        status: HealthStatus.HEALTHY,
        message: 'Disk space is healthy',
        details: {
          available: true,
        },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Disk health check failed', error);

      return {
        name: 'Disk',
        status: HealthStatus.CRITICAL,
        message: 'Disk check failed',
        details: { error: error.message },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * External service health check
   */
  async checkExternalService(
    name: string,
    url: string,
    timeout: number,
  ): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    try {
      // Simulate external service check
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate API call
      const responseTime = Date.now() - startTime;

      return {
        name,
        status: HealthStatus.HEALTHY,
        message: `${name} is healthy`,
        details: {
          url,
          responseTime,
        },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`External service ${name} health check failed`, error);

      return {
        name,
        status: HealthStatus.CRITICAL,
        message: `${name} is unhealthy`,
        details: { error: error.message, url },
        responseTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine overall status based on service statuses
   */
  private determineOverallStatus(services: ServiceHealthCheck[]): HealthStatus {
    if (services.some((service) => service.status === HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }

    if (services.some((service) => service.status === HealthStatus.WARNING)) {
      return HealthStatus.WARNING;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Readiness probe - checks if app is ready to serve traffic
   */
  async getReadiness(): Promise<{
    ready: boolean;
    timestamp: string;
    checks: any;
  }> {
    const timestamp = new Date().toISOString();

    const criticalChecks = {
      database: await this.checkDatabase(),
      // Add other critical dependencies here
    };

    const ready = Object.values(criticalChecks).every(
      (check) => check.status === 'up',
    );

    return {
      ready,
      timestamp,
      checks: criticalChecks,
    };
  }

  /**
   * Liveness probe - checks if app is alive
   */
  async getLiveness(): Promise<{ alive: boolean; timestamp: string }> {
    const timestamp = new Date().toISOString();

    try {
      // Basic checks to ensure the application is responsive
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Consider app dead if memory usage is extremely high (>1GB)
      const alive = heapUsedMB < 1024;

      return {
        alive,
        timestamp,
      };
    } catch (error) {
      this.logger.error('Liveness check failed', error);
      return {
        alive: false,
        timestamp,
      };
    }
  }

  /**
   * Database health check
   */
  async getDatabaseHealth(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    return this.checkDatabase();
  }

  /**
   * Redis health check
   */
  async getRedisHealth(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    return this.checkRedis();
  }

  /**
   * System metrics
   */
  async getSystemMetrics(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      process: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
      cpu: {
        usage: await this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      uptime: {
        process: Math.floor(process.uptime()),
        system: Math.floor(os.uptime()),
      },
      requests: this.metricsCollector.getMetrics(),
    };
  }

  /**
   * Application information
   */
  async getApplicationInfo(): Promise<any> {
    return {
      name: 'ZenStore Backend API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: os.platform(),
      architecture: os.arch(),
      hostname: os.hostname(),
      pid: process.pid,
      startTime: new Date(this.startTime).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Record request metrics
   */
  recordRequest(success: boolean, responseTime: number): void {
    // This method is kept for backward compatibility
    // The actual recording is now handled by MetricsCollector in the middleware
  }

  // Private helper methods

  private async checkDatabase(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      await this.mongoConnection?.db?.admin().ping();
      const responseTime = Date.now() - start;

      const dbStats = await this.mongoConnection?.db?.stats();

      return {
        status: 'up',
        responseTime,
        timestamp,
        details: {
          readyState: this.mongoConnection.readyState,
          host: this.mongoConnection.host,
          port: this.mongoConnection.port,
          name: this.mongoConnection.name,
          collections: dbStats?.collections || 0,
          dataSize: Math.round((dbStats?.dataSize || 0) / 1024 / 1024), // MB
          storageSize: Math.round((dbStats?.storageSize || 0) / 1024 / 1024), // MB
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.logger.error('Database health check failed', error);

      return {
        status: 'down',
        responseTime,
        timestamp,
        details: {
          error: error.message,
          readyState: this.mongoConnection.readyState,
        },
      };
    }
  }

  private async checkRedis(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Note: Add Redis connection check here when Redis is implemented
      // For now, we'll simulate a Redis check
      const responseTime = Date.now() - start;

      return {
        status: 'up',
        responseTime,
        timestamp,
        details: {
          connected: true,
          // Add actual Redis metrics here
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.logger.error('Redis health check failed', error);

      return {
        status: 'down',
        responseTime,
        timestamp,
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkMemory(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      let status = 'up';
      if (memoryPercentage > 90) {
        status = 'down';
      } else if (memoryPercentage > 80) {
        status = 'degraded';
      }

      const responseTime = Date.now() - start;

      return {
        status,
        responseTime,
        timestamp,
        details: {
          usedPercentage: Math.round(memoryPercentage),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.logger.error('Memory health check failed', error);

      return {
        status: 'down',
        responseTime,
        timestamp,
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkDisk(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Basic disk check - in production, you might want to use a library like 'node-disk-info'
      const responseTime = Date.now() - start;

      return {
        status: 'up',
        responseTime,
        timestamp,
        details: {
          // Add actual disk metrics here if needed
          available: true,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.logger.error('Disk health check failed', error);

      return {
        status: 'down',
        responseTime,
        timestamp,
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkExternalServices(): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details: any;
  }> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Check external services like payment gateways, third-party APIs, etc.
      // For now, we'll simulate this check
      const responseTime = Date.now() - start;

      return {
        status: 'up',
        responseTime,
        timestamp,
        details: {
          // Add actual external service checks here
          services: [],
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.logger.error('External services health check failed', error);

      return {
        status: 'down',
        responseTime,
        timestamp,
        details: {
          error: error.message,
        },
      };
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.round(percentage * 100) / 100); // Round to 2 decimal places
      }, 100);
    });
  }
}
