import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsBoolean,
  Length,
  IsInt,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';
import { OrderStatus } from 'src/DB/models/Order/order.schema';
import { IsSteamGameValidation } from '../validators/steam-game.validator';
import { IsValidAccountInfo } from '../validators/account-info.validator';
import { IsInstaTransferValidation } from '../validators/insta-transfer.validator';
import { PaymentMethod } from '../enums/payment-method.enum';

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
    message:
      'Steam games should not have packageId, while non-Steam games require packageId',
  })
  packageId?: Types.ObjectId;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountInfoDTO)
  @IsValidAccountInfo({
    message:
      'Account info validation failed. Please ensure all required fields are provided and email format is correct.',
  })
  accountInfo: AccountInfoDTO[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  couponCode?: string;

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

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 20;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class WalletTransferDTO {
  @IsString()
  @MinLength(3, {
    message: 'Wallet transfer number must be at least 3 digits',
  })
  @MaxLength(20, {
    message: 'Wallet transfer number must not exceed 20 digits',
  })
  @Matches(/^[0-9]+$/, {
    message: 'Wallet transfer number must contain only digits',
  })
  walletTransferNumber: string;

  @IsInstaTransferValidation({
    message: 'Insta username is required for insta-transfer payment method',
  })
  nameOfInsta?: string;
}

export class WalletTransferImageDTO {
  @IsMongoId()
  orderId: Types.ObjectId;
}

export class UserOrderQueryDTO {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 20;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
