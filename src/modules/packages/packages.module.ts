import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { gameModel } from 'src/DB/models/Game/game.model';

@Module({
  imports: [packageModel, gameModel],
  controllers: [PackagesController],
  providers: [PackagesService, PackageRepository, GameRepository],
})
export class PackagesModule { }
