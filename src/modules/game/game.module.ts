import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { gameModel } from 'src/DB/models/Game/game.model';
import { categoryModule } from '../category/category.module';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { RedisConfig } from 'src/commen/config/redis.config';
import { SharedModule } from 'src/commen/sharedModules';
import { AuthGuard } from 'src/commen/Guards/auth.guard';

@Module({
  imports: [gameModel, packageModel, categoryModule, RedisConfig, SharedModule],
  controllers: [GameController],
  providers: [GameService, GameRepository, PackageRepository, AuthGuard],
})
export class GameModule {}
