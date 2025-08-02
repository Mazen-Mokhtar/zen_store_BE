import {
  BadRequestException,
  Body, Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { GameService } from './game.service';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import { User } from 'src/commen/Decorator/user.decorator';
import { CreateGameDto, ListGamesQueryDto, ToggleGameStatusDto, ToggleGamePopularDto, UpdateGameDto } from './dto';
import { Types } from 'mongoose';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('game/dashboard')
export class GameController {
  constructor(private readonly gameService: GameService) { }
  
  @UseInterceptors(FileInterceptor('image', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Post()
  async addGame(
    @User() user: TUser, 
    @Body() body: CreateGameDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return await this.gameService.addGame(user, body, file)
  }
  // تحديث لعبة موجودة
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Put(':gameId')
  async updateGame(
    @User() user: TUser,
    @Body() body: UpdateGameDto,
    @Param('gameId', MongoIdPipe) gameId: string,
  ) {
    return await this.gameService.updateGame(user, body, new Types.ObjectId(gameId));
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Delete(':gameId')
  async deleteGame(@User() user: TUser, @Param('gameId', MongoIdPipe) gameId: string) {
    return await this.gameService.deletedGame(user, new Types.ObjectId(gameId));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':gameId/status')
  async toggleGameStatus(@Body() body: ToggleGameStatusDto, @Param('gameId', MongoIdPipe) gameId: string) {
    return await this.gameService.toggleGameStatus(new Types.ObjectId(gameId), body.isActive);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':gameId/popular')
  async toggleGamePopular(@Param('gameId', MongoIdPipe) gameId: string) {
    return await this.gameService.toggleGamePopular(new Types.ObjectId(gameId));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get()
  async listGames(@Query() query: ListGamesQueryDto) {
    return await this.gameService.listGames(query);
  }
  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(":gameId/upload-image")
  async uploadGameImage(
    @User() user: TUser,
    @Param('gameId', MongoIdPipe) gameId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log(file);

    if (!file) {
      throw new BadRequestException("File missing")
    }
    return await this.gameService.uploadGameImage(user, new Types.ObjectId(gameId), file);
  }

}
