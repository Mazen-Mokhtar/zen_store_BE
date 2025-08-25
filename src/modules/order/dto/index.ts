import { Type } from "class-transformer";
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, MinLength, IsArray, ValidateNested } from "class-validator";
import { Types } from "mongoose";
import { OrderStatus } from "src/DB/models/Order/order.schema";
import { IsSteamGameValidation } from "../validators/steam-game.validator";

export class AccountInfoDTO {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    fieldName: string;

    @IsString()
    @MinLength(1)
    @MaxLength(500)
    value: string;
}

export class CreateOrderDTO {
    @IsMongoId()
    gameId: Types.ObjectId;

    @IsMongoId()
    @IsOptional()
    @IsSteamGameValidation({
        message: 'Steam games should not have packageId, while non-Steam games require packageId'
    })
    packageId?: Types.ObjectId;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AccountInfoDTO)
    accountInfo: AccountInfoDTO[];

    @IsString()
    @IsEnum(['card', 'cash'])
    paymentMethod: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    note?: string;
}

export class OrderIdDTO {
    @IsMongoId()
    orderId: Types.ObjectId;
}

export class UpdateOrderStatusDTO {
    @IsEnum(OrderStatus)
    status: OrderStatus;
    
    @IsString()
    @IsOptional()
    @MaxLength(1000)
    adminNote?: string;
}

export class AdminOrderQueryDTO {
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;
    
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    page?: number;
    
    @IsString()
    @IsOptional()
    sort?: string;
}
