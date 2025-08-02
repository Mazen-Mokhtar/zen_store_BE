import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/commen/Decorator/user.decorator';
import { IAttachments } from 'src/commen/multer/cloud.service';

// Schema for Packages
@Schema({ timestamps: true })
export class Package {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId: Types.ObjectId; // Reference to the game this package belongs to

  @Prop({ type: String, required: true })
  title: string; // e.g., "100 Diamonds", "500 Coins"

  @Prop({ type: Number, required: true })
  price: number; // Price of the package

  @Prop({ type: Number }) // Optional: price before discount for offer
  originalPrice?: number;

  @Prop({ type: Number }) // Optional: price after discount for offer
  finalPrice?: number;

  @Prop({ type: Number }) // Optional: calculated discount percentage
  discountPercentage?: number;
  @Prop({ type: Boolean, default: false }) // Indicates if the package has an offer
  isOffer: boolean;

  @Prop({ type: String, required: true })
  currency: string; // e.g., "USD", "EGP"

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // Whether the package is active and available for purchase
  @Prop({ type: Boolean })
  isDeleted: boolean; // Whether the package is active and available for purchase
  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: User.name })
  updateBy: Types.ObjectId

  @Prop(raw({
    secure_url: { type: String, required: false },
    public_id: { type: String, required: false }
  }))
  image?: IAttachments;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
export type PackageDocument = HydratedDocument<Package>;


PackageSchema.pre('save', async function (next) {
  try {
    // Check if price is positive
    if (this.price <= 0) {
      return next(new Error('Price must be greater than 0'));
    }

    // If the package is an offer, validate and calculate discount percentage
    if (this.isOffer) {
      if (!this.finalPrice || this.finalPrice <= 0) {
        return next(new Error('Final price must be provided and greater than 0 for an offer'));
      }
      if (!this.originalPrice || this.originalPrice <= 0) {
        return next(new Error('Original price must be provided and greater than 0 for an offer'));
      }
      if (this.finalPrice >= this.originalPrice) {
        return next(new Error('Final price must be less than original price for an offer'));
      }

      // Calculate discount percentage
      this.discountPercentage = ((this.originalPrice - this.finalPrice) / this.originalPrice) * 100;
      this.discountPercentage = Math.round(this.discountPercentage * 100) / 100; // Round to 2 decimal places
    } else {
      // If not an offer, ensure offer-related fields are unset
      this.originalPrice = undefined;
      this.finalPrice = undefined;
      this.discountPercentage = undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
});