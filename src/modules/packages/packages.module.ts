import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { gameModel } from 'src/DB/models/Game/game.model';
import { RedisConfig } from 'src/commen/config/redis.config';
import { SharedModule } from 'src/commen/sharedModules';
import { AuthGuard } from 'src/commen/Guards/auth.guard';

@Module({
  imports: [packageModel, gameModel, RedisConfig, SharedModule],
  controllers: [PackagesController],
  providers: [PackagesService, PackageRepository, GameRepository, AuthGuard],
})
export class PackagesModule {}
