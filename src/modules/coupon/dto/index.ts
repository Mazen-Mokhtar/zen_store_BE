import { IsBoolean, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { CouponType } from "src/DB/models/Coupon/coupon.schema";
import { Types } from "mongoose";

export class CreateCouponDTO {
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    code: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsEnum(CouponType)
    type: CouponType;

    @IsNumber()
    @IsPositive()
    value: number;

    @IsNumber()
    @IsPositive()
    minOrderAmount: number;

    @IsNumber()
    @IsPositive()
    maxDiscount: number;

    @IsString()
    validFrom: string;

    @IsString()
    validTo: string;

    @IsNumber()
    @IsOptional()
    @Min(-1)
    usageLimit?: number;
}

export class UpdateCouponDTO {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @IsOptional()
    name?: string;
    
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @IsOptional()
    code?: string;


    @IsEnum(CouponType)
    @IsOptional()
    type?: CouponType;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    value?: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    minOrderAmount?: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    maxDiscount?: number;

    @IsString()
    @IsOptional()
    validFrom?: string;

    @IsString()
    @IsOptional()
    validTo?: string;

    @IsNumber()
    @IsOptional()
    @Min(-1)
    usageLimit?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class ValidateCouponDTO {
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    code: string;

    @IsNumber()
    @IsPositive()
    orderAmount: number;
}

export class ParamCouponDTO {
    @IsMongoId()
    couponId: Types.ObjectId;
}

export class QueryCouponDTO {
    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(CouponType)
    @IsOptional()
    type?: CouponType;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    page?: number;

    @IsString()
    @IsOptional()
    sort?: string;
} 