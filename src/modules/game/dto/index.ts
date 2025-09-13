import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';

export class ListGamesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value; // ?categories=action&categories=rpg
    if (typeof value === 'string') return value.split(','); // ?categories=action,rpg OR ?categories=action
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  categories?: string | string[];

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CategoryIdDto {
  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;
}

export class CategoryIdWithPaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number;
}

export class SteamGamesDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;
}
