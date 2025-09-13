import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Types } from 'mongoose';
import { CategoryType } from 'src/DB/models/Category/category.schema';

export class CreatCategoryDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(90)
  name: string;

  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;
}
export class UpdateCategoryDTO extends PartialType(CreatCategoryDTO) {}
export class ParamCategoryDTO {
  @IsMongoId()
  categoryId: Types.ObjectId;
}
export class QueryCategoryDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(90)
  @IsOptional()
  name?: string;
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
  @IsString()
  @MinLength(1)
  @IsOptional()
  sort?: string;
}
