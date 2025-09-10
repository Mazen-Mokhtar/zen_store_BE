import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Coupon, couponSchema } from "./coupon.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: Coupon.name, schema: couponSchema }])],
    exports: [MongooseModule]
})
export class couponModel {} 