import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { messageSystem } from 'src/commen/messages';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { GetPackagesDto } from './dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys, CacheTTL } from 'src/commen/config/redis.config';

@Injectable()
export class PackagesService {
  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly gameRepository: GameRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async getAvailablePackages(dto: GetPackagesDto) {
    if (!Types.ObjectId.isValid(dto.gameId)) {
      throw new BadRequestException(messageSystem.game.Invalid_gameId);
    }

    // Check cache first
    const cacheKey = CacheKeys.PACKAGES_BY_GAME(dto.gameId);
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const game = await this.gameRepository.findOne({
      _id: dto.gameId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      isActive: true,
    });
    if (!game) {
      throw new NotFoundException(messageSystem.game.notFound);
    }

    const packages = await this.packageRepository.find(
      {
        gameId: dto.gameId,
        isActive: true,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        select:
          'title price originalPrice finalPrice discountPercentage isOffer currency image',
      },
      { sort: { price: 1 }, lean: true },
    );

    const result = { success: true, data: packages };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }
  async getPackageById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(messageSystem.package.Invalid_package_ID);
    }

    // Check cache first
    const cacheKey = CacheKeys.PACKAGE_BY_ID(id);
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const packageDoc = await this.packageRepository.findById(id, {
      select:
        'gameId title price originalPrice finalPrice discountPercentage isOffer currency image isActive isDeleted',
    });
    if (!packageDoc || !packageDoc.isActive || packageDoc.isDeleted) {
      throw new NotFoundException(messageSystem.package.notFound);
    }

    const result = { success: true, data: packageDoc };

    // Cache the result for longer since package details don't change often
    await this.cacheManager.set(cacheKey, result, CacheTTL.LONG);
    return result;
  }
}
