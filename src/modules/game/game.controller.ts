import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  Header,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import {
  ListGamesDto,
  CategoryIdDto,
  CategoryIdWithPaginationDto,
  SteamGamesDto,
} from './dto';
import { Types } from 'mongoose';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
import {
  ApiVersion,
  ApiDeprecated,
  VersionedEndpoint,
} from 'src/commen/Decorator/api-version.decorator';
@ApiTags('Games')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version (v1 or v2)',
  required: false,
})
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('game')
@ApiVersion('v1', 'v2')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @ApiOperation({
    summary: 'List all games',
    description:
      'Retrieve a list of all games with optional filtering and pagination. Supports v1 and v2 API versions.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for game names',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @Get()
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  @VersionedEndpoint({
    versions: ['v1', 'v2'],
    deprecated: {
      version: 'v1',
      message:
        'Please use v2 API for enhanced game listing with improved filtering',
      sunsetDate: '2024-12-31',
    },
  })
  async listGames(@Query() query: ListGamesDto) {
    return this.gameService.listGames(query);
  }
  @ApiOperation({
    summary: 'Get games by category',
    description: 'Retrieve all games belonging to a specific category.',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID to filter games' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category ID' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get('category/:categoryId')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  async getGamesByCategory(@Param() params: CategoryIdDto) {
    return this.gameService.getGamesByCategory(
      new Types.ObjectId(params.categoryId),
    );
  }
  @ApiOperation({
    summary: 'Get paid games by category',
    description:
      'Retrieve paid games from a specific category with pagination.',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID to filter paid games',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Paid games retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid category ID or pagination parameters',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get('category/:categoryId/paid')
  async getPaidGamesByCategory(
    @Param('categoryId', MongoIdPipe) categoryId: string,
    @Query() query: CategoryIdWithPaginationDto,
  ) {
    return this.gameService.getPaidGamesByCategory(
      new Types.ObjectId(categoryId),
      query.page,
      query.limit,
    );
  }
  @ApiOperation({
    summary: 'Get games with packages by category',
    description:
      'Retrieve games that have packages available from a specific category.',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID to filter games with packages',
  })
  @ApiResponse({
    status: 200,
    description: 'Games with packages retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid category ID' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get('category/:categoryId/with-packages')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  async getGamesWithPackagesByCategory(@Param() params: CategoryIdDto) {
    return await this.gameService.getGamesWithPackagesByCategory(
      new Types.ObjectId(params.categoryId),
    );
  }

  @ApiOperation({
    summary: 'Get Steam games',
    description:
      'Retrieve Steam games with pagination and optional category filtering.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Steam games retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @Get('steam')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  async getSteamGames(@Query() query: SteamGamesDto) {
    return this.gameService.getSteamGames(
      query.page || 1,
      query.limit || 10,
      query.categoryId,
    );
  }

  @ApiOperation({
    summary: 'Get Steam game by ID',
    description: 'Retrieve a specific Steam game by its ID.',
  })
  @ApiParam({ name: 'gameId', description: 'Steam game ID to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'Steam game retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid game ID' })
  @ApiResponse({ status: 404, description: 'Steam game not found' })
  @Get('steam/:gameId')
  async getSteamGameById(@Param('gameId', MongoIdPipe) gameId: string) {
    return this.gameService.getSteamGameById(new Types.ObjectId(gameId));
  }

  @ApiOperation({
    summary: 'Get game by ID',
    description: 'Retrieve a specific game by its ID.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to retrieve' })
  @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid game ID' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @Get(':gameId')
  async getGameById(@Param('gameId', MongoIdPipe) gameId: string) {
    return this.gameService.getGameById(new Types.ObjectId(gameId));
  }
}
