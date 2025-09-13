import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    // MongooseModule is already imported in AppModule, so we can inject the connection
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // Export service so other modules can use it
})
export class HealthModule {}
