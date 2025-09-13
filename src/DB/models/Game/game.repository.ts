import { DBService } from '../db.service';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Game, GameDocument } from './game.schema';

export class GameRepository extends DBService<GameDocument> {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {
    super(gameModel);
  }
}
