import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { CreateGameDto, UpdateGameDto } from './dto';
import { TUser } from 'src/DB/models/User/user.schema';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { messageSystem } from 'src/commen/messages';
import { Types } from 'mongoose';
import { GameType } from 'src/DB/models/Game/game.schema';

@Injectable()
export class GameService {
    constructor(private readonly gameRepository: GameRepository, private readonly cloudService: cloudService) { }
    async addGame(user: TUser, body: CreateGameDto, file?: Express.Multer.File) {
        if (!body.categoryId) throw new BadRequestException('categoryId is required');
        
        // التحقق من السعر للعاب Steam
        if (body.type === GameType.STEAM && (!body.price || body.price <= 0)) {
            throw new BadRequestException('Price is required and must be greater than 0 for Steam games');
        }

        // التحقق من الـ offer للعاب Steam
        if (body.type === GameType.STEAM && body.isOffer) {
            if (!body.finalPrice || body.finalPrice <= 0) {
                throw new BadRequestException('Final price must be provided and greater than 0 for an offer');
            }
            if (!body.originalPrice || body.originalPrice <= 0) {
                throw new BadRequestException('Original price must be provided and greater than 0 for an offer');
            }
            if (body.finalPrice >= body.originalPrice) {
                throw new BadRequestException('Final price must be less than original price for an offer');
            }
        }
        
        const game = await this.gameRepository.findOne({ name: body.name })
        if (game)
            throw new BadRequestException(messageSystem.game.alreadyExist)
        
        let image: IAttachments | undefined = undefined;
        
        // إذا كان هناك ملف مرفوع، ارفعه إلى الخدمة السحابية
        if (file) {
            let folderId = String(Math.floor(100000 + Math.random() * 900000));
            let folder = { folder: `${process.env.APP_NAME}/games/photos/${folderId}` };
            
            const result = await this.cloudService.uploadFile(file, folder);
            if (result.secure_url) {
                image = {
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                };
            } else {
                throw new BadRequestException(messageSystem.game.failToUpload);
            }
        }
        
        // إذا كان هناك image في الـ body، استخدمه
        if (body.image) {
            image = body.image;
        }
        
        const newGame = await this.gameRepository.create({ 
            ...body, 
            image,
            categoryId: new Types.ObjectId(body.categoryId), 
            createdBy: user._id 
        })
        return { success: true, data: newGame }
    }
    async updateGame(user: TUser, body: UpdateGameDto, gameId: Types.ObjectId) {
        if (body.categoryId === undefined) throw new BadRequestException('categoryId is required');
        
        // التحقق من السعر إذا كان النوع Steam
        if (body.type === GameType.STEAM && (!body.price || body.price <= 0)) {
            throw new BadRequestException('Price is required and must be greater than 0 for Steam games');
        }

        // التحقق من الـ offer إذا كان النوع Steam
        if (body.type === GameType.STEAM && body.isOffer) {
            if (!body.finalPrice || body.finalPrice <= 0) {
                throw new BadRequestException('Final price must be provided and greater than 0 for an offer');
            }
            if (!body.originalPrice || body.originalPrice <= 0) {
                throw new BadRequestException('Original price must be provided and greater than 0 for an offer');
            }
            if (body.finalPrice >= body.originalPrice) {
                throw new BadRequestException('Final price must be less than original price for an offer');
            }
        }
        
        const game = await this.gameRepository.findById(gameId)
        if (!game)
            throw new NotFoundException(messageSystem.game.notFound)
        await this.gameRepository.updateOne({ _id: gameId }, { ...body, categoryId: new Types.ObjectId(body.categoryId), updateBy: user._id })
        return { success: true, data: messageSystem.game.updatedSuccessfully }
    }
    async uploadGameImage(user: TUser, gameId: Types.ObjectId, file: Express.Multer.File) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new NotFoundException(messageSystem.game.notFound);
        }
        let image: IAttachments | undefined = undefined;
        let folderId = String(Math.floor(100000 + Math.random() * 900000));
        let folder = {};

        // إذا كانت هناك صورة سابقة، استخدم `public_id` للتحديث
        if (game.image?.public_id) {
            folder = { public_id: game.image.public_id };
        } else {
            folder = { folder: `${process.env.APP_NAME}/games/photos/${folderId}` };
        }

        // رفع الصورة إلى الخدمة السحابية
        const result = await this.cloudService.uploadFile(file, folder);
        if (result.secure_url) {
            image = {
                secure_url: result.secure_url,
                public_id: result.public_id,
            };
        } else {
            throw new BadRequestException(messageSystem.game.failToUpload);
        }

        // تحديث اللعبة بمعلومات الصورة الجديدة
        await this.gameRepository.updateOne(
            { _id: gameId },
            { image, updatedBy: user._id }
        );

        return { success: true, data: { image, message: messageSystem.game.updatedSuccessfully } };
    }
    async deletedGame(user: TUser, gameId: Types.ObjectId) {
        const game = await this.gameRepository.findById(gameId)
        if (!game) {
            throw new NotFoundException(messageSystem.game.notFound)
        }
        if (game.isDeleted) {
            throw new BadRequestException(messageSystem.game.failToDelete)
        }
        await this.gameRepository.updateOne({ _id: gameId }, { isDeleted: true, isActive: false, updateBy: user._id })
        return { success: true, data: messageSystem.game.deletedSuccessfully }
    }
    async toggleGameStatus(gameId: Types.ObjectId, isActive: boolean) {
        const game = await this.gameRepository.findById(gameId);
        if (!game)
            throw new NotFoundException(messageSystem.game.notFound);

        await this.gameRepository.updateOne({ _id: gameId }, { isActive });
        return { success: true, data: `Game is now ${isActive ? 'active' : 'inactive'}` };
    }
    
    async toggleGamePopular(gameId: Types.ObjectId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game)
            throw new NotFoundException(messageSystem.game.notFound);

        const newPopularStatus = !game.isPopular;
        await this.gameRepository.updateOne({ _id: gameId }, { isPopular: newPopularStatus });
        return { success: true, data: `Game is now ${newPopularStatus ? 'popular' : 'not popular'}` };
    }
    async listGames(query: {
        search?: string;
        status?: 'all' | 'active' | 'deleted';
        isPopular?: boolean;
        type?: GameType;
        isOffer?: boolean;
    }) {
        const filter: Record<string, any> = {};

        if (query.search) {
            filter.name = { $regex: query.search, $options: 'i' };
        }

        if (query.status === 'active') {
            filter.isActive = true;
            filter.isDeleted = false;
        } else if (query.status === 'deleted') {
            filter.isDeleted = true;
        } else if (query.status !== 'all') {
            filter.isDeleted = false;
        }

        if (query.isPopular !== undefined) {
            filter.isPopular = query.isPopular;
        }

        if (query.type) {
            filter.type = query.type;
        }

        if (query.isOffer !== undefined) {
            filter.isOffer = query.isOffer;
        }

        const games = await this.gameRepository.find(
            filter,
            { select: "name description image type price isOffer originalPrice finalPrice discountPercentage offer categories isActive isPopular createdAt accountInfoFields" },
            {
                sort: { createdAt: -1 },
            }
        );

        return { success: true, data: games };
    }
}
