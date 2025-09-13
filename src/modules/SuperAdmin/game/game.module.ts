import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { SharedModule } from 'src/commen/sharedModules';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { gameModel } from 'src/DB/models/Game/game.model';
import { cloudService } from 'src/commen/multer/cloud.service';

@Module({
  imports: [SharedModule, gameModel],
  controllers: [GameController],
  providers: [GameService, GameRepository, cloudService],
})
export class GameModuleAdmin {}
