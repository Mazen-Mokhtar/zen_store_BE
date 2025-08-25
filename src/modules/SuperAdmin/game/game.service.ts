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
    async addGame(user: TUser, body: CreateGameDto, files?: Express.Multer.File[]) {
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

        // التحقق من أن الصور والفيديو للألعاب من نوع Steam فقط
        if (body.type !== GameType.STEAM) {
            if (body.images && body.images.length > 0) {
                throw new BadRequestException('Multiple images are only allowed for Steam games');
            }
            if (body.video) {
                throw new BadRequestException('Video is only allowed for Steam games');
            }
            if (body.backgroundImage) {
                throw new BadRequestException('Background image is only allowed for Steam games');
            }
        }
        
        const game = await this.gameRepository.findOne({ name: body.name })
        if (game)
            throw new BadRequestException(messageSystem.game.alreadyExist)
        
        let image: IAttachments | undefined = undefined;
        let images: IAttachments[] = [];
        let video: IAttachments | undefined = undefined;
        let backgroundImage: IAttachments | undefined = undefined;
        
        // التحقق من أن الملفات المتعددة للألعاب من نوع Steam فقط
        if (files && files.length > 1 && body.type !== GameType.STEAM) {
            throw new BadRequestException('Multiple files upload is only allowed for Steam games');
        }
        
        // معالجة الملفات المرفوعة
        if (files && files.length > 0) {
            // Use crypto for secure random number generation
            const crypto = require('crypto');
            let folderId = crypto.randomInt(100000, 999999).toString();
            let folder = { folder: `${process.env.APP_NAME}/games/photos/${folderId}` };
            
            for (const file of files) {
                const result = await this.cloudService.uploadFile(file, folder);
                if (result.secure_url) {
                    const attachment: IAttachments = {
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    };
                    
                    // تحديد نوع الملف بناءً على mimetype واسم الحقل في FormData
                    if (file.mimetype.startsWith('video/')) {
                        video = attachment;
                    } else if (file.mimetype.startsWith('image/')) {
                        // التحقق من اسم الحقل في FormData لتحديد نوع الصورة
                        const fieldName = file.fieldname;
                        
                        if (fieldName === 'backgroundImage') {
                            // إذا كان اسم الحقل backgroundImage، اجعلها صورة خلفية
                            backgroundImage = attachment;
                        } else if (fieldName === 'image' && !image) {
                            // إذا كان اسم الحقل image ولم يتم تعيين الصورة الرئيسية بعد
                            image = attachment;
                        } else {
                            // إضافة باقي الصور إلى مصفوفة الصور (images field أو أي حقل آخر)
                            images.push(attachment);
                        }
                    }
                } else {
                    throw new BadRequestException(messageSystem.game.failToUpload);
                }
            }
        }
        
        // إذا كان هناك attachments في الـ body، استخدمها
        if (body.image) {
            image = body.image;
        }
        if (body.images) {
            images = body.images;
        }
        if (body.video) {
            video = body.video;
        }
        if (body.backgroundImage) {
            backgroundImage = body.backgroundImage;
        }
        
        const newGame = await this.gameRepository.create({ 
            ...body, 
            image,
            images,
            video,
            backgroundImage,
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
        // Use crypto for secure random number generation
        const crypto = require('crypto');
        let folderId = crypto.randomInt(100000, 999999).toString();
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
            // Sanitize regex input to prevent NoSQL injection
            const sanitizedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.name = { $regex: sanitizedSearch, $options: 'i' };
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
