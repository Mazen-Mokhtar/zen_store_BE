import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { ApiVersion } from 'src/commen/Decorator/api-version.decorator';
import {
  HealthCheckResult,
  HealthSummary,
  HealthStatus,
} from '../config/health.config';
import { HealthCheckDto } from '../common/dto/common-response.dto';

// HealthCheckResult and HealthSummary are now imported from config

@ApiTags('Health')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@Controller('health')
@ApiVersion('v1', 'v2')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Returns simple status for load balancers
   */
  @Get()
  @ApiOperation({
    summary: 'Basic Health Check',
    description:
      'Returns basic application health status for load balancers and monitoring systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600,
        version: '1.0.0',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'error',
        timestamp: '2024-01-15T10:30:00.000Z',
        error: {
          message: 'Database connection failed',
        },
      },
    },
  })
  async getHealth(@Res() res: Response): Promise<void> {
    try {
      const health = await this.healthService.getBasicHealth();
      const statusCode =
        health.status === 'healthy'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Detailed health check with all dependencies
   */
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed Health Check',
    description:
      'Returns comprehensive health status including all system dependencies and services',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        info: {
          database: { status: 'up', responseTime: '15ms' },
          redis: { status: 'up', responseTime: '5ms' },
          memory: { status: 'ok', usage: '45%' },
          disk: { status: 'ok', usage: '60%' },
        },
        details: {
          uptime: 3600,
          version: '1.0.0',
          environment: 'production',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are unhealthy',
    type: HealthCheckDto,
  })
  async getDetailedHealth(@Res() res: Response): Promise<void> {
    try {
      const health = await this.healthService.getDetailedHealth();
      const statusCode =
        health.status === HealthStatus.HEALTHY
          ? HttpStatus.OK
          : health.status === HealthStatus.WARNING
            ? HttpStatus.OK
            : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {},
      });
    }
  }

  /**
   * Readiness probe for Kubernetes
   * Checks if the application is ready to serve traffic
   */
  @Get('ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    try {
      const readiness = await this.healthService.getReadiness();
      const statusCode = readiness.ready
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(readiness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Liveness probe for Kubernetes
   * Checks if the application is alive and should not be restarted
   */
  @Get('live')
  async getLiveness(@Res() res: Response): Promise<void> {
    try {
      const liveness = await this.healthService.getLiveness();
      const statusCode = liveness.alive
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(liveness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Database health check
   */
  @Get('database')
  async getDatabaseHealth(@Res() res: Response): Promise<void> {
    try {
      const dbHealth = await this.healthService.getDatabaseHealth();
      const statusCode =
        dbHealth.status === 'up'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(dbHealth);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Redis health check
   */
  @Get('redis')
  async getRedisHealth(@Res() res: Response): Promise<void> {
    try {
      const redisHealth = await this.healthService.getRedisHealth();
      const statusCode =
        redisHealth.status === 'up'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(redisHealth);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * System metrics endpoint
   */
  @Get('metrics')
  async getMetrics(): Promise<any> {
    return this.healthService.getSystemMetrics();
  }

  /**
   * Application info endpoint
   */
  @Get('info')
  async getInfo(): Promise<any> {
    return this.healthService.getApplicationInfo();
  }
}
