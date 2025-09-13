import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { categoryRepository } from 'src/DB/models/Category/category.repository';
import { cloudService } from 'src/commen/multer/cloud.service';
import { categoryModel } from 'src/DB/models/Category/category.model';
import { SharedModule } from 'src/commen/sharedModules';

@Module({
  imports: [SharedModule, categoryModel],
  controllers: [CategoryController],
  providers: [CategoryService, categoryRepository, cloudService],
  exports: [categoryRepository],
})
export class categoryModule {}
