import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { messageSystem } from 'src/commen/messages';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { GetPackagesDto } from './dto';

@Injectable()
export class PackagesService {
    constructor(
        private readonly packageRepository: PackageRepository,
        private readonly gameRepository: GameRepository
    ) { }
    async getAvailablePackages(dto: GetPackagesDto) {
        if (!Types.ObjectId.isValid(dto.gameId)) {
            throw new BadRequestException(messageSystem.game.Invalid_gameId);
        }

        const game = await this.gameRepository.findOne(
            {
                _id: dto.gameId,
                $or: [{ isDeleted: false },
                { isDeleted: { $exists: false } }],
                isActive: true
            });
        if (!game) {
            throw new NotFoundException(messageSystem.game.notFound);
        }

        const packages = await this.packageRepository.find({
            gameId: dto.gameId,
            isActive: true,
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        });

        return { success: true, data: packages };
    }
    async getPackageById(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(messageSystem.package.Invalid_package_ID);
        }

        const packageDoc = await this.packageRepository.findById(id);
        if (!packageDoc || !packageDoc.isActive || packageDoc.isDeleted) {
            throw new NotFoundException(messageSystem.package.notFound);
        }
        return { success: true, data: packageDoc };
    }
}
