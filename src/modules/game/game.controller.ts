import { Controller, Get, Param, Query, UsePipes, ValidationPipe, Header } from '@nestjs/common';
import { GameService } from './game.service';
import { ListGamesDto, CategoryIdDto, CategoryIdWithPaginationDto, SteamGamesDto } from './dto';
import { Types } from 'mongoose';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) { }
  @Get()
  async listGames(@Query() query: ListGamesDto) {
    return this.gameService.listGames(query);
  }
  @Get('category/:categoryId')
  async getGamesByCategory(@Param() params: CategoryIdDto) {
    return this.gameService.getGamesByCategory(new Types.ObjectId(params.categoryId));
  }
  @Get('category/:categoryId/paid')
  async getPaidGamesByCategory(
    @Param('categoryId', MongoIdPipe) categoryId: string,
    @Query() query: CategoryIdWithPaginationDto
  ) {
    return this.gameService.getPaidGamesByCategory(
      new Types.ObjectId(categoryId),
      query.page,
      query.limit
    );
  }
  @Get('category/:categoryId/with-packages')
  async getGamesWithPackagesByCategory(@Param() params: CategoryIdDto) {

    return await this.gameService.getGamesWithPackagesByCategory(new Types.ObjectId(params.categoryId));
  }

  @Get('steam')
  async getSteamGames(@Query() query: SteamGamesDto) {
    return this.gameService.getSteamGames(
      query.page || 1,
      query.limit || 10,
      query.categoryId
    );
  }

  @Get('steam/:gameId')
  async getSteamGameById(@Param('gameId', MongoIdPipe) gameId: string) {
    return this.gameService.getSteamGameById(new Types.ObjectId(gameId));
  }

  @Get(':gameId')
  async getGameById(@Param('gameId', MongoIdPipe) gameId: string) {
    return this.gameService.getGameById(new Types.ObjectId(gameId));
  }
}
