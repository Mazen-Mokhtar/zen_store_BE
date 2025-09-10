import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsNumber, IsMongoId, IsBoolean, IsNotEmpty, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { IAttachments } from 'src/commen/multer/cloud.service';
import { Currency } from 'src/DB/models/Game/game.schema';

/* === المرفقات الخاصة بالصورة === */
export class AttachmentDto {
    @IsOptional()
    @IsString()
    secure_url?: string;

    @IsOptional()
    @IsString()
    public_id?: string;
}

export class CreatePackageDto {
    @IsMongoId()
    @IsNotEmpty()
    gameId: Types.ObjectId;

    @IsString()
    @IsNotEmpty()
    title: string;
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    price: number;

    @Type(() => Boolean)
    @IsOptional()
    @IsBoolean()
    isOffer?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    originalPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    finalPrice?: number;

    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency;

    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => AttachmentDto)
    image?: AttachmentDto;
}
export class UpdatePackageDto extends PartialType(CreatePackageDto) { }