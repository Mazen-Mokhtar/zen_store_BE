import { Module } from '@nestjs/common';
import { SuperAdminPackagesService } from './packages.service';
import { SuperAdminPackagesController } from './packages.controller';
import { SharedModule } from 'src/commen/sharedModules';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { gameModel } from 'src/DB/models/Game/game.model';

@Module({
  imports: [SharedModule, packageModel, gameModel],
  controllers: [SuperAdminPackagesController],
  providers: [SuperAdminPackagesService, PackageRepository, GameRepository],
})
export class SuperAdminPackagesModule {}
