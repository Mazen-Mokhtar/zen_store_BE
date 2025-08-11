import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { messageSystem } from 'src/commen/messages';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { categoryRepository } from 'src/DB/models/Category/category.repository';
import { GameType } from 'src/DB/models/Game/game.schema';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';

@Injectable()
export class GameService {
    constructor(
        private readonly gameRepository: GameRepository,
        private readonly categoryRepository: categoryRepository,
        private readonly packageRepository: PackageRepository,
    ) { }
    async listGames(query: {
        search?: string;
        categories?: string | string[];
        categoryId: string;
        page?: number;
        limit?: number;
    }) {
        const filter: Record<string, any> = {
            isActive: true,
            $or: [{ isDeleted: false },
            { isDeleted: { $exists: false } }]
            ,
        };

        // Add search filter if provided
        if (query.search) {
            filter.name = { $regex: query.search, $options: 'i' };
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
        console.log(filter);

        const result = await this.gameRepository.paginate(
            filter,
            page,
            limit,
            { createdAt: -1 },
            { select: 'name description image offer categories isActive createdAt isPopular price accountInfoFields' }
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
                    $or: [
                        { isDeleted: false },
                        { isDeleted: { $exists: false } }
                    ]
                },
                { select: 'name description image offer categories isActive createdAt isPopular price accountInfoFields' },
                {
                    sort: { createdAt: -1 },
                    lean: true
                }
            );

            return {
                success: true,
                data: games,
                total: games.length,
                category: {
                    id: category._id,
                    name: category.name,
                    logo: category.logo
                }
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
            { select: 'name description image offer categories isActive createdAt isPopular accountInfoFields' },
            { lean: true } // Use lean for better performance
        );

        if (!game) {
            throw new NotFoundException(messageSystem.game.notFound);
        }

        if (!game.isActive || game.isDeleted) {
            throw new BadRequestException(messageSystem.game.notAvailable);
        }

        return { success: true, data: game };
    }

    // Get only paid games (e.g., Steam games with a price) within a category
    async getPaidGamesByCategory(categoryId: Types.ObjectId) {
        try {
            const category = await this.categoryRepository.findById(categoryId);
            if (!category) {
                throw new NotFoundException('Category not found');
            }

            const games = await this.gameRepository.find(
                {
                    categoryId,
                    type: GameType.STEAM,
                    isActive: true,
                    $or: [
                        { isDeleted: false },
                        { isDeleted: { $exists: false } }
                    ]
                },
                { select: 'name description image offer categories isActive createdAt isPopular price accountInfoFields' },
                { sort: { createdAt: -1 }, lean: true }
            );

            return {
                success: true,
                data: games,
                total: games.length,
                category: { id: category._id, name: category.name, logo: category.logo },
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to fetch paid games for this category');
        }
    }

    // Get games that have active packages (top-up/recharge) within a category
    async getGamesWithPackagesByCategory(categoryId: Types.ObjectId) {
        try {
            const category = await this.categoryRepository.findById(categoryId);
            if (!category) {
                throw new NotFoundException('Category not found');
            }
            console.log(categoryId);
            const games = await this.gameRepository.find(
                {
                    categoryId : categoryId,
                    type: { $ne: GameType.STEAM },
                    isActive: true,
                    $or: [
                        { isDeleted: false },
                        { isDeleted: { $exists: false } }
                    ]
                },
                { select: 'name description image isOffer categoryId isActive createdAt isPopular price accountInfoFields' },
                { sort: { createdAt: -1 }, lean: true }
            );
            console.log(games);
            return {
                success: true,
                data: games,
                total: games.length,
                category: { id: category._id, name: category.name, logo: category.logo },
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to fetch games for this category');
        }
    }

}
