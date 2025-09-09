import { MongooseModule } from "@nestjs/mongoose";
import { Game, GameSchema } from "./game.schema";




export const gameModel = MongooseModule.forFeature([{name : Game.name , schema : GameSchema}])