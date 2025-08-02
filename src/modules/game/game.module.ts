import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { gameModel } from 'src/DB/models/Game/game.model';
import { categoryModule } from '../category/category.module';

@Module({
  imports: [gameModel, categoryModule],
  controllers: [GameController],
  providers: [GameService,GameRepository],
})
export class GameModule {}
