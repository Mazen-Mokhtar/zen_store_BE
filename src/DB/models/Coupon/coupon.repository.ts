import { InjectModel } from "@nestjs/mongoose";
import { DBService } from "../db.service";
import { Coupon, TCoupon } from "./coupon.schema";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CouponRepository extends DBService<TCoupon> {
    constructor(@InjectModel(Coupon.name) private readonly couponModel: Model<TCoupon>) {
        super(couponModel);
    }
} 