import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/commen/Decorator/user.decorator';
import { IAttachments } from 'src/commen/multer/cloud.service';

export enum GameType {
  STEAM = 'steam',
  GAMES = 'games',
  SUBSCRIPTION = 'subscription',
}

export enum Currency {
  EGP = 'EGP',
  USD = 'USD',
  EUR = 'EUR',
  SAR = 'SAR',
  AED = 'AED',
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({
    type: String,
    enum: GameType,
    required: true,
    default: GameType.GAMES,
  })
  type: GameType;

  @Prop({ type: Number, required: false, min: 0 })
  price?: number;

  @Prop({ type: String, enum: Currency, required: true, default: Currency.EGP })
  currency: Currency;

  // Offer fields for Steam games
  @Prop({ type: Boolean, default: false })
  isOffer?: boolean;

  @Prop({ type: Number, min: 0 })
  originalPrice?: number;

  @Prop({ type: Number, min: 0 })
  finalPrice?: number;

  @Prop({ type: Number, min: 0, max: 100 })
  discountPercentage?: number;

  @Prop(
    raw({
      secure_url: { type: String, required: false },
      public_id: { type: String, required: false },
    }),
  )
  image?: IAttachments;

  // Multiple images for Steam games
  @Prop([
    raw({
      secure_url: { type: String, required: false },
      public_id: { type: String, required: false },
    }),
  ])
  images?: IAttachments[];

  // Video for Steam games (optional)
  @Prop(
    raw({
      secure_url: { type: String, required: false },
      public_id: { type: String, required: false },
    }),
  )
  video?: IAttachments;

  // Background image for Steam games frontend
  @Prop(
    raw({
      secure_url: { type: String, required: false },
      public_id: { type: String, required: false },
    }),
  )
  backgroundImage?: IAttachments;

  // New field to define required/optional fields for account info
  @Prop({
    type: [{ fieldName: { type: String }, isRequired: { type: Boolean } }],
    required: false,
  })
  accountInfoFields: { fieldName: string; isRequired: boolean }[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Boolean })
  isDeleted: boolean;
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isPopular: boolean;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  updateBy: Types.ObjectId;
}

export const GameSchema = SchemaFactory.createForClass(Game);

// Add strategic indexes for better query performance
// Compound index for category-based queries with active/deleted filters
GameSchema.index({ categoryId: 1, isActive: 1, isDeleted: 1 });
// Index for popular games queries
GameSchema.index({ isPopular: 1, isActive: 1, isDeleted: 1 });
// Index for game type filtering
GameSchema.index({ type: 1, isActive: 1, isDeleted: 1 });
// Index for offer-based queries
GameSchema.index({ isOffer: 1, type: 1, isActive: 1 });

// Add validation middleware to ensure price is required for Steam games
GameSchema.pre('save', function (next) {
  if (
    this.type === GameType.STEAM &&
    (this.price === undefined || this.price === null)
  ) {
    return next(new Error('Price is required for Steam games'));
  }

  // Validate offer for Steam games
  if (this.type === GameType.STEAM && this.isOffer) {
    if (!this.finalPrice || this.finalPrice <= 0) {
      return next(
        new Error(
          'Final price must be provided and greater than 0 for an offer',
        ),
      );
    }
    if (!this.originalPrice || this.originalPrice <= 0) {
      return next(
        new Error(
          'Original price must be provided and greater than 0 for an offer',
        ),
      );
    }
    if (this.finalPrice >= this.originalPrice) {
      return next(
        new Error('Final price must be less than original price for an offer'),
      );
    }

    // Calculate discount percentage
    this.discountPercentage =
      ((this.originalPrice - this.finalPrice) / this.originalPrice) * 100;
    this.discountPercentage = Math.round(this.discountPercentage * 100) / 100; // Round to 2 decimal places
  } else if (this.isOffer) {
    // If not Steam game but has offer, clear offer fields
    this.originalPrice = undefined;
    this.finalPrice = undefined;
    this.discountPercentage = undefined;
    this.isOffer = false;
  }

  next();
});

GameSchema.pre('updateOne', function (next) {
  const update = this.getUpdate() as any;
  if (
    update &&
    update.type === GameType.STEAM &&
    (update.price === undefined || update.price === null)
  ) {
    return next(new Error('Price is required for Steam games'));
  }

  // Validate offer for Steam games in updates
  if (update && update.type === GameType.STEAM && update.isOffer) {
    if (!update.finalPrice || update.finalPrice <= 0) {
      return next(
        new Error(
          'Final price must be provided and greater than 0 for an offer',
        ),
      );
    }
    if (!update.originalPrice || update.originalPrice <= 0) {
      return next(
        new Error(
          'Original price must be provided and greater than 0 for an offer',
        ),
      );
    }
    if (update.finalPrice >= update.originalPrice) {
      return next(
        new Error('Final price must be less than original price for an offer'),
      );
    }

    // Calculate discount percentage
    update.discountPercentage =
      ((update.originalPrice - update.finalPrice) / update.originalPrice) * 100;
    update.discountPercentage =
      Math.round(update.discountPercentage * 100) / 100;
  } else if (update && update.isOffer) {
    // If not Steam game but has offer, clear offer fields
    update.originalPrice = undefined;
    update.finalPrice = undefined;
    update.discountPercentage = undefined;
    update.isOffer = false;
  }

  next();
});

export type GameDocument = HydratedDocument<Game>;
