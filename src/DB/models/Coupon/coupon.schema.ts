import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export enum CouponType {
    PERCENTAGE = "percentage",
    FIXED = "fixed"
}

@Schema({ timestamps: true })
export class Coupon {
    @Prop({ type: String, required: true, unique: true, uppercase: true })
    code: string;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, enum: CouponType, required: true })
    type: CouponType;

    @Prop({ type: Number, required: true })
    value: number; // percentage or fixed amount

    @Prop({ type: Number, required: true })
    minOrderAmount: number;

    @Prop({ type: Number, required: true })
    maxDiscount: number;

    @Prop({ type: Date, required: true })
    validFrom: Date;

    @Prop({ type: Date, required: true })
    validTo: Date;

    @Prop({ type: Number, required: true, default: 1 })
    usageLimit: number; // -1 for unlimited

    @Prop({ type: Number, default: 0 })
    usedCount: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy: Types.ObjectId;
}

export const couponSchema = SchemaFactory.createForClass(Coupon);

// Index for faster queries
couponSchema.index({ validFrom: 1, validTo: 1 });
couponSchema.index({ isActive: 1 });

export type TCoupon = HydratedDocument<Coupon>; 