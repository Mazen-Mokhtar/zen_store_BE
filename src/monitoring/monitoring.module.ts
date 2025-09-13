import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from '../commen/services/monitoring.service';
import { EnhancedLoggingService } from '../commen/services/logging.service';
import { MetricsMiddleware } from '../commen/middleware/metrics.middleware';
import { ErrorHandlingMiddleware } from '../commen/middleware/error-handling.middleware';
import { SharedModule } from '../commen/sharedModules';
import { AuthGuard } from '../commen/Guards/auth.guard';

@Module({
  imports: [SharedModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    EnhancedLoggingService,
    MetricsMiddleware,
    ErrorHandlingMiddleware,
    AuthGuard,
  ],
  exports: [MonitoringService, EnhancedLoggingService],
})
export class MonitoringModule {}
