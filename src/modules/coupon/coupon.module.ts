import { Module } from "@nestjs/common";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";
import { CouponRepository } from "src/DB/models/Coupon/coupon.repository";
import { couponModel } from "src/DB/models/Coupon/coupon.model";
import { SharedModule } from "src/commen/sharedModules";

@Module({
    imports: [SharedModule, couponModel],
    controllers: [CouponController],
    providers: [CouponService, CouponRepository],
    exports: [CouponService]
})
export class CouponModule {} 