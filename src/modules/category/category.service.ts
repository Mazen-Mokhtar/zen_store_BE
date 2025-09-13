import {
  BadRequestException,
  Body,
  ConflictException,
  Injectable,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreatCategoryDTO,
  ParamCategoryDTO,
  QueryCategoryDTO,
  UpdateCategoryDTO,
} from './dto/index';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { log } from 'console';
import { FilterQuery } from 'mongoose';
import { categoryRepository } from 'src/DB/models/Category/category.repository';
import { CategoryType } from 'src/DB/models/Category/category.schema';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: categoryRepository,
    private readonly cloudService: cloudService,
  ) {}
  async creat(user: TUser, body: CreatCategoryDTO, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing file');
    if (await this.categoryRepository.findOne({ name: body.name }))
      throw new ConflictException('name already exist');
    // Use crypto for secure random number generation
    const crypto = require('crypto');
    const folderId = crypto.randomInt(100000, 999999).toString();
    const { secure_url, public_id } = await this.cloudService.uploadFile(file, {
      folder: `${process.env.APP_NAME}/Category/${folderId}`,
    });
    const category = await this.categoryRepository.create({
      name: body.name,
      type: body.type || CategoryType.GAMES,
      logo: { secure_url, public_id },
      createdBy: user._id,
      folderId,
    });
    return { data: category };
  }
  async update(
    params: ParamCategoryDTO,
    body?: UpdateCategoryDTO,
    file?: Express.Multer.File,
  ) {
    const category = await this.categoryRepository.findById(params.categoryId);
    if (!category) throw new BadRequestException('In-valid-category_Id');
    if (
      body?.name &&
      (await this.categoryRepository.findOne({
        name: body.name,
        _id: { $ne: params.categoryId },
      }))
    )
      throw new ConflictException('This name already exist');
    let logo: IAttachments = category.logo;
    if (file) {
      const { secure_url, public_id } = await this.cloudService.uploadFile(
        file,
        { folder: `${process.env.APP_NAME}/Category/${category.folderId}` },
      );
      if (category.logo.public_id)
        await this.cloudService.destroyFile(category.logo.public_id);
      logo = { secure_url, public_id };
    }
    const check = await this.categoryRepository.updateOne(
      { _id: category },
      { name: body?.name, type: body?.type, logo: logo },
    );

    return { messgae: 'Category updated successffuly' };
  }
  async getCategory(params: ParamCategoryDTO) {
    const category = await this.categoryRepository.findById(params.categoryId);
    if (!category) throw new NotFoundException('Not found Category');
    await category.populate([{ path: 'createdBy', select: '-password' }]);
    return { success: true, data: category };
  }
  async getAllCategory(query: QueryCategoryDTO) {
    const filter: any = {};
    if (query.name) {
      // Sanitize regex input to prevent NoSQL injection
      const sanitizedName = query.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: sanitizedName, $options: 'i' };
    }
    if (query.type) {
      filter.type = query.type;
    }

    const options: any = { sort: query.sort };
    const data = await this.categoryRepository.find(filter, undefined, options);
    return { success: true, data };
  }

  async deleteCategory(params: ParamCategoryDTO) {
    const category = await this.categoryRepository.findById(params.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Delete logo from cloud
    if (category.logo?.public_id) {
      await this.cloudService.destroyFile(category.logo.public_id);
    }

    // Delete category from database
    await this.categoryRepository.findByIdAndDelete(
      params.categoryId.toString(),
      {},
    );

    return { success: true, message: 'Category deleted successfully' };
  }
}
