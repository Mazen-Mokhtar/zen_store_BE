import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { messageSystem } from 'src/commen/messages';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { PackageDocument } from 'src/DB/models/Packages/packages.schema';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { TUser } from 'src/DB/models/User/user.schema';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { Currency } from 'src/DB/models/Game/game.schema';

@Injectable()
export class SuperAdminPackagesService {
  private readonly cloudService = new cloudService();

  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly gameRepository: GameRepository,
  ) {}
  async createPackage(
    user: TUser,
    body: CreatePackageDto,
    file?: Express.Multer.File,
  ): Promise<PackageDocument> {
    if (!Types.ObjectId.isValid(body.gameId)) {
      throw new BadRequestException(messageSystem.game.Invalid_gameId);
    }
    const game = await this.gameRepository.findById(body.gameId);
    if (!game) {
      throw new BadRequestException(messageSystem.game.Invalid_gameId);
    }

    let image: IAttachments | undefined = undefined;

    // إذا كان هناك ملف مرفوع، ارفعه إلى الخدمة السحابية
    if (file) {
      // Use crypto for secure random number generation
      const crypto = require('crypto');
      const folderId = crypto.randomInt(100000, 999999).toString();
      const folder = {
        folder: `${process.env.APP_NAME}/packages/photos/${folderId}`,
      };

      const result = await this.cloudService.uploadFile(file, folder);
      if (result.secure_url) {
        image = {
          secure_url: result.secure_url,
          public_id: result.public_id,
        };
      } else {
        throw new BadRequestException('Failed to upload image');
      }
    }

    // إذا كان هناك image في الـ body، استخدمه
    if (body.image) {
      image = body.image;
    }

    return await this.packageRepository.create({
      ...body,
      currency: body.currency || Currency.EGP, // استخدام العملة المرسلة أو EGP كافتراضي
      image,
      createdBy: user._id,
    });
  }
  async updatePackage(id: string, user: TUser, body: UpdatePackageDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(messageSystem.package.Invalid_package_ID);
    }
    if (body.gameId && !Types.ObjectId.isValid(body.gameId)) {
      throw new BadRequestException(messageSystem.game.Invalid_gameId);
    }
    if (body.gameId) {
      const game = await this.gameRepository.findById(body.gameId);
      if (!game) {
        throw new BadRequestException(messageSystem.game.Invalid_gameId);
      }
    }
    const packageDoc = await this.packageRepository.findById(id);
    if (!packageDoc) throw new NotFoundException('Package Not Found');

    Object.assign(packageDoc, {
      ...body,
      currency: body.currency || packageDoc.currency || Currency.EGP, // استخدام العملة المرسلة أو الحالية أو EGP كافتراضي
    });
    packageDoc.updateBy = user._id;

    await packageDoc.save();
    return { success: true, data: packageDoc };
  }

  async uploadPackageImage(user: TUser, id: string, file: Express.Multer.File) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(messageSystem.package.Invalid_package_ID);
    }

    const packageDoc = await this.packageRepository.findById(id);
    if (!packageDoc) {
      throw new NotFoundException(messageSystem.package.notFound);
    }

    // Use crypto for secure random number generation
    const crypto = require('crypto');
    const folderId = crypto.randomInt(100000, 999999).toString();
    const folder = {
      folder: `${process.env.APP_NAME}/packages/photos/${folderId}`,
    };

    const result = await this.cloudService.uploadFile(file, folder);
    if (result.secure_url) {
      packageDoc.image = {
        secure_url: result.secure_url,
        public_id: result.public_id,
      };
      packageDoc.updateBy = user._id;
      await packageDoc.save();
      return { success: true, data: packageDoc };
    } else {
      throw new BadRequestException('Failed to upload image');
    }
  }
  async deletePackage(id: string, user: TUser) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(messageSystem.package.Invalid_package_ID);
    }
    const packageDoc = await this.packageRepository.findById(id);
    if (!packageDoc) {
      throw new NotFoundException(messageSystem.package.notFound);
    }
    if (packageDoc.isDeleted) {
      throw new BadRequestException(messageSystem.package.notFound);
    }
    await this.packageRepository.updateOne(
      { _id: id },
      { isDeleted: true, updateBy: user._id },
    );
    return { success: true, data: messageSystem.package.deletedSuccessfully };
  }
  async getPackageById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(messageSystem.package.Invalid_package_ID);
    }
    const packageDoc = await this.packageRepository.findById(id);
    if (!packageDoc) {
      throw new NotFoundException(messageSystem.package.notFound);
    }
    return { success: true, data: packageDoc };
  }
  async getAllPackages() {
    const packages = await this.packageRepository.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    });
    return { success: true, data: packages };
  }
}
