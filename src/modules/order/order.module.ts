import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { SharedModule } from 'src/commen/sharedModules';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { GameRepository } from 'src/DB/models/Game/game.repository';
import { PackageRepository } from 'src/DB/models/Packages/packages.repository';
import { orderModel } from 'src/DB/models/Order/order.model';
import { gameModel } from 'src/DB/models/Game/game.model';
import { packageModel } from 'src/DB/models/Packages/packages.model';
import { StripeService } from 'src/commen/service/stripe.service';
import { EncryptionService } from 'src/commen/service/encryption.service';
import { IsSteamGameValidationConstraint } from './validators/steam-game.validator';
import { IsValidAccountInfoConstraint } from './validators/account-info.validator';
import { IsValidEmailFormatConstraint } from './validators/email-format.validator';
import { IsInstaTransferValidationConstraint } from './validators/insta-transfer.validator';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [SharedModule, orderModel, gameModel, packageModel, CouponModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    GameRepository,
    PackageRepository,
    StripeService,
    EncryptionService,
    IsSteamGameValidationConstraint,
    IsValidAccountInfoConstraint,
    IsValidEmailFormatConstraint,
    IsInstaTransferValidationConstraint,
  ],
  exports: [OrderService],
})
export class OrderModule {}
