import { Module } from '@nestjs/common';
import { SecurityMonitoringService } from '../service/security-monitoring.service';
import { CsrfService } from '../service/csrf.service';
import { CsrfController } from '../controllers/csrf.controller';

@Module({
  controllers: [CsrfController],
  providers: [SecurityMonitoringService, CsrfService],
  exports: [SecurityMonitoringService, CsrfService],
})
export class SecurityModule {}
