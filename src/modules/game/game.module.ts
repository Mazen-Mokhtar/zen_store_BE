import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { gameModel } from 'src/DB/models/Game/game.model';
import { categoryModule } from '../category/category.module';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';

@Module({
  imports: [gameModel, packageModel, categoryModule],
  controllers: [GameController],
  providers: [GameService, GameRepository, PackageRepository],
})
export class GameModule {}
