import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { messageSystem } from 'src/commen/messages';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { categoryRepository } from 'src/DB/models/Category/category.repository';
import { GameType } from 'src/DB/models/Game/game.schema';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys, CacheTTL } from 'src/commen/config/redis.config';

@Injectable()
export class GameService {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly categoryRepository: categoryRepository,
    private readonly packageRepository: PackageRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async listGames(query: {
    search?: string;
    categories?: string | string[];
    categoryId: string;
    page?: number;
    limit?: number;
  }) {
    const filter: Record<string, any> = {
      isActive: true,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    };

    // Add search filter if provided
    if (query.search) {
      // Sanitize regex input to prevent NoSQL injection
      const sanitizedSearch = query.search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      filter.name = { $regex: sanitizedSearch, $options: 'i' };
    }

    // Add categories filter if provided
    if (query.categories?.length !== 0) {
      const categories = Array.isArray(query.categories)
        ? query.categories
        : [query.categories];
      filter.categories = { $in: categories };
    }

    // Add categoryId filter (required)
    filter.categoryId = new Types.ObjectId(query.categoryId);

    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.gameRepository.paginate(
      filter,
      page,
      limit,
      { createdAt: -1 },
      {
        select:
          'name description image offer categories isActive createdAt isPopular price currency accountInfoFields type',
      },
    );

    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      },
    };
  }
  async getGamesByCategory(categoryId: Types.ObjectId) {
    try {
      // التحقق من وجود الفئة أولاً
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const games = await this.gameRepository.find(
        {
          categoryId: categoryId,
          isActive: true,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
        {
          select:
            'name description image offer categories isActive createdAt isPopular price currency accountInfoFields type',
        },
        {
          sort: { createdAt: -1 },
          lean: true,
        },
      );

      return {
        success: true,
        data: games,
        total: games.length,
        category: {
          id: category._id,
          name: category.name,
          logo: category.logo,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch games for this category');
    }
  }

  async getGameById(gameId: Types.ObjectId) {
    const game = await this.gameRepository.findById(
      gameId,
      {
        select:
          'name description image offer categories isActive createdAt isPopular accountInfoFields type price currency',
      },
      { lean: true }, // Use lean for better performance
    );

    if (!game) {
      throw new NotFoundException(messageSystem.game.notFound);
    }

    if (!game.isActive || game.isDeleted) {
      throw new BadRequestException(messageSystem.game.notAvailable);
    }

    return { success: true, data: game };
  }

  async getSteamGameById(gameId: Types.ObjectId) {
    try {
      const game = await this.gameRepository.findById(
        gameId,
        {
          select:
            'name description image images video backgroundImage isOffer categoryId isActive createdAt isPopular price currency accountInfoFields type',
        },
        { lean: true },
      );
      if (!game) {
        throw new NotFoundException(messageSystem.game.notFound);
      }
      // التحقق من أن اللعبة من نوع Steam
      if (game.type !== GameType.STEAM) {
        throw new BadRequestException('This game is not a Steam game');
      }
      return {
        success: true,
        data: game,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new BadRequestException('Failed to fetch Steam game');
    }
  }

  // Get only paid games (e.g., Steam games with a price) within a category
  async getPaidGamesByCategory(
    categoryId: Types.ObjectId,
    page?: number,
    limit?: number,
  ) {
    try {
      // Check cache first
      const cacheKey = CacheKeys.GAMES_BY_CATEGORY(
        categoryId.toString(),
        page,
        limit,
      );
      const cachedResult = await this.cacheManager.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const filter = {
        categoryId,
        type: GameType.STEAM,
        isActive: true,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      let result;
      // If pagination parameters are provided, use paginate method
      if (page !== undefined && limit !== undefined) {
        result = await this.gameRepository.paginate(
          filter,
          page,
          limit,
          { createdAt: -1 },
          {
            select:
              'name description image isOffer price currency type originalPrice finalPrice discountPercentage isPopular createdAt',
          },
        );

        result = {
          success: true,
          data: result.data,
          pagination: {
            total: result.total,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
          },
          category: {
            id: category._id,
            name: category.name,
            logo: category.logo,
          },
        };
      } else {
        // Fallback to original behavior without pagination
        const games = await this.gameRepository.find(
          filter,
          {
            select:
              'name description image isOffer price currency type originalPrice finalPrice discountPercentage isPopular createdAt',
          },
          { sort: { createdAt: -1 }, lean: true },
        );

        result = {
          success: true,
          data: games,
          total: games.length,
          category: {
            id: category._id,
            name: category.name,
            logo: category.logo,
          },
        };
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, result, CacheTTL.MEDIUM);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'Failed to fetch paid games for this category',
      );
    }
  }

  // Get games that have active packages (top-up/recharge) within a category
  async getGamesWithPackagesByCategory(categoryId: Types.ObjectId) {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const games = await this.gameRepository.find(
        {
          categoryId: categoryId,
          type: { $ne: GameType.STEAM },
          isActive: true,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
        {
          select:
            'name description image isOffer price currency type isPopular createdAt',
        },
        { sort: { createdAt: -1 }, lean: true },
      );

      return {
        success: true,
        data: games,
        total: games.length,
        category: {
          id: category._id,
          name: category.name,
          logo: category.logo,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch games for this category');
    }
  }

  // Get Steam games with pagination support
  async getSteamGames(
    page: number = 1,
    limit: number = 10,
    categoryId?: string,
  ) {
    try {
      const filter: Record<string, any> = {
        type: GameType.STEAM,
        isActive: true,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      // Add category filter if provided
      if (categoryId) {
        filter.categoryId = new Types.ObjectId(categoryId);
      }

      const result = await this.gameRepository.paginate(
        filter,
        page,
        limit,
        { createdAt: -1 },
        {
          select:
            'name description image images video backgroundImage isOffer categoryId isActive createdAt isPopular price accountInfoFields type originalPrice finalPrice discountPercentage',
        },
      );

      return {
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch Steam games');
    }
  }
}
