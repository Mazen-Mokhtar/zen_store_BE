import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import {
  MonitoringService,
  MonitoringReport,
  Alert,
  SystemMetrics,
} from '../commen/services/monitoring.service';
import {
  MetricsCollector,
  RequestMetrics,
  ErrorMetric,
} from '../commen/middleware/metrics.middleware';
import { EnhancedLoggingService } from '../commen/services/logging.service';
import { AuthGuard } from '../commen/Guards/auth.guard';
import { RolesGuard } from '../commen/Guards/role.guard';
import { Roles } from '../commen/Decorator/roles.decorator';
import { RoleTypes } from '../DB/models/User/user.schema';

export interface MetricsResponse {
  success: boolean;
  data: RequestMetrics;
  timestamp: string;
}

export interface ErrorMetricsResponse {
  success: boolean;
  data: {
    errors: ErrorMetric[];
    summary: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
    };
  };
  timestamp: string;
}

export interface SystemMetricsResponse {
  success: boolean;
  data: {
    current: SystemMetrics;
    history: SystemMetrics[];
  };
  timestamp: string;
}

export interface AlertsResponse {
  success: boolean;
  data: {
    active: Alert[];
    recent: Alert[];
    summary: {
      total: number;
      bySeverity: Record<string, number>;
    };
  };
  timestamp: string;
}

export interface MonitoringReportResponse {
  success: boolean;
  data: MonitoringReport;
  timestamp: string;
}

export interface HealthSummary {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  lastCheck: string;
}

export interface HealthSummaryResponse {
  success: boolean;
  data: HealthSummary;
  timestamp: string;
}

@ApiTags('Monitoring')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@ApiBearerAuth('JWT')
@Controller('monitoring')
@UseGuards(AuthGuard, RolesGuard)
export class MonitoringController {
  private metricsCollector: MetricsCollector;

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly logger: EnhancedLoggingService,
  ) {
    this.metricsCollector = MetricsCollector.getInstance();
  }

  @Get('metrics')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get application metrics',
    description:
      'Retrieve current application performance metrics including requests, response times, and error rates',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    type: Object,
    schema: {
      example: {
        success: true,
        data: {
          totalRequests: 10000,
          successfulRequests: 9500,
          failedRequests: 500,
          averageResponseTime: 150,
          requestsPerSecond: 25.5,
        },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Moderator role required',
  })
  getMetrics(): MetricsResponse {
    try {
      const metrics = this.metricsCollector.getMetrics();

      this.logger.log('Metrics retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/metrics',
        totalRequests: metrics.totalRequests,
      });

      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve metrics', error);
      throw error;
    }
  }

  @Get('metrics/errors')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get error metrics',
    description:
      'Retrieve detailed error metrics including error types, severity, and frequency',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of errors to return',
    type: Number,
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Hours of history to include',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Error metrics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          errors: [
            {
              timestamp: '2024-01-15T10:25:00.000Z',
              type: 'ValidationError',
              severity: 'medium',
              category: 'validation',
              message: 'Invalid input data',
              count: 3,
            },
          ],
          summary: {
            total: 150,
            byType: { ValidationError: 80, DatabaseError: 30 },
            bySeverity: { critical: 5, high: 25, medium: 70, low: 50 },
            byCategory: { validation: 80, database: 30, authentication: 40 },
          },
        },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  getErrorMetrics(
    @Query('limit') limit: string = '50',
    @Query('hours') hours: string = '24',
  ): ErrorMetricsResponse {
    try {
      const limitNum = parseInt(limit, 10) || 50;
      const hoursNum = parseInt(hours, 10) || 24;
      const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
      const endTime = new Date();

      const allErrors = this.metricsCollector.getErrorsByTimeRange(
        startTime,
        endTime,
      );
      const errors = allErrors.slice(0, limitNum);

      // Calculate summary
      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      allErrors.forEach((error) => {
        byType[error.type] = (byType[error.type] || 0) + (error.count || 1);
        bySeverity[error.severity] =
          (bySeverity[error.severity] || 0) + (error.count || 1);
        byCategory[error.category] =
          (byCategory[error.category] || 0) + (error.count || 1);
      });

      this.logger.log('Error metrics retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/metrics/errors',
        totalErrors: allErrors.length,
        timeRange: `${hoursNum} hours`,
      });

      return {
        success: true,
        data: {
          errors,
          summary: {
            total: allErrors.length,
            byType,
            bySeverity,
            byCategory,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve error metrics', error);
      throw error;
    }
  }

  @Get('metrics/system')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get system metrics',
    description:
      'Retrieve system performance metrics including CPU, memory, and disk usage',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Hours of history to include',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
  })
  getSystemMetrics(
    @Query('hours') hours: string = '24',
  ): SystemMetricsResponse {
    try {
      const hoursNum = parseInt(hours, 10) || 24;
      const history = this.monitoringService.getSystemMetricsHistory(hoursNum);
      const current = history[history.length - 1] || null;

      this.logger.log('System metrics retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/metrics/system',
        historyPoints: history.length,
        timeRange: `${hoursNum} hours`,
      });

      return {
        success: true,
        data: {
          current,
          history,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve system metrics', error);
      throw error;
    }
  }

  @Get('alerts')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get alerts',
    description: 'Retrieve active and recent alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
  })
  getAlerts(): AlertsResponse {
    try {
      const active = this.monitoringService.getActiveAlerts();
      const report = this.monitoringService.getMonitoringReport();
      const recent = report.alerts.recent;

      // Calculate summary
      const bySeverity: Record<string, number> = {};
      [...active, ...recent].forEach((alert) => {
        bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      });

      this.logger.log('Alerts retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/alerts',
        activeAlerts: active.length,
        recentAlerts: recent.length,
      });

      return {
        success: true,
        data: {
          active,
          recent,
          summary: {
            total: active.length + recent.length,
            bySeverity,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve alerts', error);
      throw error;
    }
  }

  @Get('report')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get comprehensive monitoring report',
    description:
      'Retrieve a complete monitoring report including all metrics, alerts, and system status',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoring report retrieved successfully',
  })
  getMonitoringReport(): MonitoringReportResponse {
    try {
      const report = this.monitoringService.getMonitoringReport();

      this.logger.log('Monitoring report retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/report',
        systemStatus: report.application.health.status,
        totalRequests: report.application.requests.total,
        activeAlerts: report.alerts.active.length,
      });

      return {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve monitoring report', error);
      throw error;
    }
  }

  @Get('health/summary')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get health summary',
    description:
      'Get a summarized health status with score and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary retrieved successfully',
  })
  getHealthSummary(): HealthSummaryResponse {
    try {
      const report = this.monitoringService.getMonitoringReport();
      const healthStatus = this.metricsCollector.getHealthStatus();

      // Calculate health score (0-100)
      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Deduct points for various issues
      if (report.application.requests.errorRate > 10) {
        score -= 30;
        issues.push(
          `High error rate: ${report.application.requests.errorRate.toFixed(1)}%`,
        );
        recommendations.push(
          'Investigate and fix errors causing high error rate',
        );
      } else if (report.application.requests.errorRate > 5) {
        score -= 15;
        issues.push(
          `Elevated error rate: ${report.application.requests.errorRate.toFixed(1)}%`,
        );
        recommendations.push(
          'Monitor error trends and consider preventive measures',
        );
      }

      if (report.application.requests.averageResponseTime > 5000) {
        score -= 25;
        issues.push(
          `Slow response time: ${report.application.requests.averageResponseTime}ms`,
        );
        recommendations.push('Optimize slow endpoints and database queries');
      } else if (report.application.requests.averageResponseTime > 2000) {
        score -= 10;
        issues.push(
          `Elevated response time: ${report.application.requests.averageResponseTime}ms`,
        );
        recommendations.push('Consider performance optimizations');
      }

      if (report.system.memory.percentage > 90) {
        score -= 20;
        issues.push(
          `Critical memory usage: ${report.system.memory.percentage.toFixed(1)}%`,
        );
        recommendations.push(
          'Investigate memory leaks and optimize memory usage',
        );
      } else if (report.system.memory.percentage > 80) {
        score -= 10;
        issues.push(
          `High memory usage: ${report.system.memory.percentage.toFixed(1)}%`,
        );
        recommendations.push('Monitor memory usage trends');
      }

      if (report.system.cpu.usage > 90) {
        score -= 20;
        issues.push(
          `Critical CPU usage: ${report.system.cpu.usage.toFixed(1)}%`,
        );
        recommendations.push('Investigate CPU-intensive processes');
      } else if (report.system.cpu.usage > 80) {
        score -= 10;
        issues.push(`High CPU usage: ${report.system.cpu.usage.toFixed(1)}%`);
        recommendations.push('Monitor CPU usage patterns');
      }

      if (report.alerts.active.length > 0) {
        score -= report.alerts.active.length * 5;
        issues.push(`${report.alerts.active.length} active alerts`);
        recommendations.push('Address active alerts to improve system health');
      }

      // Ensure score doesn't go below 0
      score = Math.max(0, score);

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical';
      if (score >= 80) {
        status = 'healthy';
      } else if (score >= 60) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      // Add positive recommendations if healthy
      if (issues.length === 0) {
        recommendations.push('System is performing well');
        recommendations.push('Continue monitoring for optimal performance');
      }

      const healthSummary: HealthSummary = {
        status,
        score,
        issues,
        recommendations,
        lastCheck: new Date().toISOString(),
      };

      this.logger.log('Health summary retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/health-summary',
        status,
        score,
        issuesCount: issues.length,
      });

      return {
        success: true,
        data: healthSummary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve health summary', error);
      throw error;
    }
  }

  @Post('alerts/test/:alertId')
  @Roles([RoleTypes.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test alert',
    description: 'Send a test alert to verify alert channels are working',
  })
  @ApiParam({ name: 'alertId', description: 'ID of the alert rule to test' })
  @ApiResponse({
    status: 200,
    description: 'Test alert sent successfully',
  })
  async testAlert(
    @Param('alertId') alertId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.monitoringService.testAlert(alertId);

      this.logger.log('Test alert sent', {
        component: 'MonitoringController',
        endpoint: '/monitoring/alerts/test',
        alertId,
      });

      return {
        success: true,
        message: `Test alert sent for rule: ${alertId}`,
      };
    } catch (error) {
      this.logger.error('Failed to send test alert', error, {
        alertId,
      });
      throw error;
    }
  }

  @Post('metrics/reset')
  @Roles([RoleTypes.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset metrics',
    description: 'Reset all collected metrics and alerts (use with caution)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics reset successfully',
  })
  resetMetrics(): { success: boolean; message: string } {
    try {
      this.monitoringService.resetMetrics();

      this.logger.warn('Metrics reset by admin', {
        component: 'MonitoringController',
        endpoint: '/monitoring/metrics/reset',
      });

      return {
        success: true,
        message: 'All metrics and alerts have been reset',
      };
    } catch (error) {
      this.logger.error('Failed to reset metrics', error);
      throw error;
    }
  }

  @Get('dashboard')
  @Roles([RoleTypes.ADMIN])
  @ApiOperation({
    summary: 'Get dashboard data',
    description: 'Get all data needed for monitoring dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  getDashboardData(): {
    success: boolean;
    data: {
      metrics: RequestMetrics;
      systemMetrics: SystemMetrics;
      healthSummary: HealthSummary;
      recentErrors: ErrorMetric[];
      activeAlerts: Alert[];
    };
    timestamp: string;
  } {
    try {
      const metrics = this.metricsCollector.getMetrics();
      const report = this.monitoringService.getMonitoringReport();
      const healthSummaryResponse = this.getHealthSummary();
      const recentErrors = this.metricsCollector.getErrorMetrics().slice(0, 10);
      const activeAlerts = this.monitoringService.getActiveAlerts();

      this.logger.log('Dashboard data retrieved', {
        component: 'MonitoringController',
        endpoint: '/monitoring/dashboard',
      });

      return {
        success: true,
        data: {
          metrics,
          systemMetrics: report.system,
          healthSummary: healthSummaryResponse.data,
          recentErrors,
          activeAlerts,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve dashboard data', error);
      throw error;
    }
  }
}
