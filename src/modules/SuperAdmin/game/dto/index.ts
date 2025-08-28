// src/games/dto/game.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    ValidateNested,
    IsBoolean,
    IsNumber,
    IsEnum,
    IsMongoId,
    ValidateIf,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { GameType } from 'src/DB/models/Game/game.schema';

/* === المرفقات الخاصة بالصورة === */
export class AttachmentDto {
    @IsOptional()
    @IsString()
    secure_url?: string;

    @IsOptional()
    @IsString()
    public_id?: string;
}

/* === عنصر واحد داخل accountInfoFields === */
export class AccountInfoFieldDto {
    @IsString()
    @IsNotEmpty()
    fieldName: string;

    @Type(() => Boolean)
    @IsBoolean()
    isRequired: boolean;
}

export class OfferDto {
    @IsOptional()
    @IsNumber()
    discountPercent?: number;

    @Type(() => Boolean)
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/* === DTO لإنشاء لعبة جديدة === */
export class CreateGameDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(GameType)
    type: GameType;

    @ValidateIf(o => o.type === GameType.STEAM)
    @Type(()=> Number)
    @IsNumber()
    @Min(0)
    price?: number;

    // Offer fields for Steam games
    @IsOptional()
    @ValidateIf(o => o.type === GameType.STEAM)
    @Type(() => Boolean)
    @IsBoolean()
    isOffer?: boolean;

    @ValidateIf(o => o.type === GameType.STEAM && o.isOffer === true)
    @Type(()=> Number)
    @IsNumber()
    @Min(0.01)
    originalPrice?: number;

    @ValidateIf(o => o.type === GameType.STEAM && o.isOffer === true)
    @Type(()=> Number)
    @IsNumber()
    @Min(0.01)
    finalPrice?: number;

    @ValidateIf(o => o.type === GameType.STEAM && o.isOffer === true)
    @Type(()=> Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercentage?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => AttachmentDto)
    image?: AttachmentDto;       // اختياري - يمكن أن تأتي الصورة من file upload

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttachmentDto)
    images?: AttachmentDto[];    // مصفوفة صور للألعاب من نوع Steam

    @IsOptional()
    @ValidateNested()
    @Type(() => AttachmentDto)
    video?: AttachmentDto;       // فيديو اختياري للألعاب من نوع Steam

    @IsOptional()
    @ValidateNested()
    @Type(() => AttachmentDto)
    backgroundImage?: AttachmentDto; // صورة خلفية للألعاب من نوع Steam

    @IsMongoId()
    @IsNotEmpty()
    categoryId: string; // ObjectId للفئة
    
    @IsOptional()
    @ValidateNested()
    @Type(() => OfferDto)
    offer?: OfferDto;
    
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => AccountInfoFieldDto)
    accountInfoFields: AccountInfoFieldDto[];
}

/* === DTO لتعديل لعبة موجودة ===
   نستخدم PartialType لتحويل كل الحقول إلى اختياريّة (optional) تلقائياً
*/
export class UpdateGameDto extends PartialType(CreateGameDto) { }
export class ToggleGameStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}

export class ToggleGamePopularDto {
  // لا نحتاج لأي حقل لأننا سنعكس القيمة الحالية
}

/* === DTO لاستعلام قائمة الألعاب === */
export class ListGamesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['all', 'active', 'deleted'])
  status?: 'all' | 'active' | 'deleted';
  
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsEnum(GameType)
  type?: GameType;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isOffer?: boolean;
}
