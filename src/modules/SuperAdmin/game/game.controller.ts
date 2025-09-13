import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import { User } from 'src/commen/Decorator/user.decorator';
import {
  CreateGameDto,
  ListGamesQueryDto,
  ToggleGameStatusDto,
  ToggleGamePopularDto,
  UpdateGameDto,
} from './dto';
import { Types } from 'mongoose';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
@ApiTags('SuperAdmin - Games')
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('game/dashboard')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @ApiOperation({
    summary: 'Add new game (SuperAdmin)',
    description:
      'Create a new game with images, video, and background image. Requires SuperAdmin or Admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or file format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin/Admin privileges required',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 }, // الصورة الرئيسية
        { name: 'images', maxCount: 8 }, // صور إضافية (حتى 8 صور)
        { name: 'video', maxCount: 1 }, // فيديو واحد
        { name: 'backgroundImage', maxCount: 1 }, // صورة الخلفية
      ],
      cloudMulter(),
    ),
  )
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @Post()
  async addGame(
    @User() user: TUser,
    @Body() body: CreateGameDto,
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
      backgroundImage?: Express.Multer.File[];
    },
  ) {
    return await this.gameService.addGame(user, body, files);
  }
  // تحديث لعبة موجودة
  @ApiOperation({
    summary: 'Update game (SuperAdmin)',
    description:
      'Update an existing game. Requires SuperAdmin or Admin privileges.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to update' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Game updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin/Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @Put(':gameId')
  async updateGame(
    @User() user: TUser,
    @Body() body: UpdateGameDto,
    @Param('gameId', MongoIdPipe) gameId: string,
  ) {
    return await this.gameService.updateGame(
      user,
      body,
      new Types.ObjectId(gameId),
    );
  }
  @ApiOperation({
    summary: 'Delete game (SuperAdmin)',
    description: 'Delete a game. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to delete' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Game deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Delete(':gameId')
  async deleteGame(
    @User() user: TUser,
    @Param('gameId', MongoIdPipe) gameId: string,
  ) {
    return await this.gameService.deletedGame(user, new Types.ObjectId(gameId));
  }

  @ApiOperation({
    summary: 'Toggle game status (SuperAdmin)',
    description:
      'Toggle game active/inactive status. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to toggle status' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Game status toggled successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':gameId/status')
  async toggleGameStatus(
    @Body() body: ToggleGameStatusDto,
    @Param('gameId', MongoIdPipe) gameId: string,
  ) {
    return await this.gameService.toggleGameStatus(
      new Types.ObjectId(gameId),
      body.isActive,
    );
  }

  @ApiOperation({
    summary: 'Toggle game popular status (SuperAdmin)',
    description:
      'Toggle game popular/not popular status. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to toggle popular status' })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Game popular status toggled successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':gameId/popular')
  async toggleGamePopular(@Param('gameId', MongoIdPipe) gameId: string) {
    return await this.gameService.toggleGamePopular(new Types.ObjectId(gameId));
  }

  @ApiOperation({
    summary: 'List games (SuperAdmin)',
    description:
      'Get list of all games with filtering and pagination. Requires SuperAdmin privileges.',
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
    description: 'Search term for game name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Games list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get()
  async listGames(@Query() query: ListGamesQueryDto) {
    return await this.gameService.listGames(query);
  }
  @ApiOperation({
    summary: 'Upload game image (SuperAdmin)',
    description:
      'Upload an image for a game. Requires SuperAdmin or Admin privileges.',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID to upload image for' })
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin/Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @Patch(':gameId/upload-image')
  async uploadGameImage(
    @User() user: TUser,
    @Param('gameId', MongoIdPipe) gameId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File missing');
    }
    return await this.gameService.uploadGameImage(
      user,
      new Types.ObjectId(gameId),
      file,
    );
  }
}
