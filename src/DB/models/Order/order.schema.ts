import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GameDocument, Currency } from '../Game/game.schema';
import { PaymentMethod } from 'src/modules/order/enums/payment-method.enum';
import { EncryptionService } from '../../../commen/service/encryption.service';
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
}
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Package', required: false })
  packageId?: Types.ObjectId;

  @Prop({ type: [{ fieldName: String, value: String }], required: true })
  accountInfo: { fieldName: string; value: string }[];

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: string;

  @Prop({ type: Boolean, default: false })
  isReviewed: boolean;

  @Prop({ type: String })
  adminNote: string;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({
    type: String,
    enum: Currency,
    required: false,
    default: Currency.EGP,
  })
  currency: Currency;

  // Coupon fields
  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: false })
  couponId?: Types.ObjectId;

  @Prop({ type: Number, required: false })
  originalAmount?: number; // المبلغ الأصلي قبل الخصم

  @Prop({ type: Number, required: false })
  discountAmount?: number; // مبلغ الخصم

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop({ type: Number })
  refundAmount: number;

  @Prop({ type: Date })
  refundDate: Date;

  @Prop({ type: String })
  intent: string; // Stripe payment intent ID

  // Wallet Transfer Fields
  @Prop({
    type: {
      secure_url: String,
      public_id: String,
    },
    required: false,
  })
  walletTransferImage?: {
    secure_url: string;
    public_id: string;
  };

  @Prop({ type: String, required: false })
  walletTransferNumber: string; // Wallet transfer number (encrypted) - minimum 3 digits

  @Prop({ type: Date })
  walletTransferSubmittedAt: Date;

  @Prop({ type: String, required: false })
  nameOfInsta: string; // Instagram name (encrypted) - for insta-transfer payment method

  @Prop({ type: Date })
  instaTransferSubmittedAt: Date;
}

export const orderSchema = SchemaFactory.createForClass(Order);

// Add strategic indexes for better query performance
// Compound index for user orders with status and date filtering
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Index for admin order management queries
orderSchema.index({ status: 1, createdAt: -1 });
// Index for payment method filtering
orderSchema.index({ paymentMethod: 1, status: 1 });
// Index for game-based order queries
orderSchema.index({ gameId: 1, status: 1 });
// Index for coupon usage tracking
orderSchema.index({ couponId: 1, status: 1 });

export type OrderDocument = HydratedDocument<Order>;

// Post-find hook for decryption/masking of wallet transfer data
orderSchema.post(['find', 'findOne', 'findById'] as any, function (doc) {
  const encryptionService = new EncryptionService();

  // Check if this is an admin request by looking at the query context
  // This is a simple approach - in production you might want to pass user context differently
  const isAdminRequest = (this as any).getOptions()?.isAdminRequest || false;

  const processWalletData = (singleDoc: any) => {
    if (singleDoc && singleDoc.walletTransferNumber) {
      try {
        const decryptedNumber = encryptionService.decrypt(
          singleDoc.walletTransferNumber,
        );

        if (isAdminRequest) {
          // For admin: show decrypted data
          singleDoc.walletTransferNumber = decryptedNumber;
        } else {
          // For regular users: show masked data based on new rules
          singleDoc.walletTransferNumber = encryptionService.maskData(
            decryptedNumber,
            'phone',
          );
        }
      } catch (error) {
        // If decryption fails, keep the encrypted value or set to null
        console.warn('Failed to decrypt walletTransferNumber:', error.message);
      }
    }

    if (singleDoc && singleDoc.nameOfInsta) {
      try {
        const decryptedInsta = encryptionService.decrypt(singleDoc.nameOfInsta);

        if (isAdminRequest) {
          // For admin: show decrypted data
          singleDoc.nameOfInsta = decryptedInsta;
        } else {
          // For regular users: no masking for Instagram names
          singleDoc.nameOfInsta = encryptionService.maskData(
            decryptedInsta,
            'instagram',
          );
        }
      } catch (error) {
        // If decryption fails, keep the encrypted value or set to null
        console.warn('Failed to decrypt nameOfInsta:', error.message);
      }
    }
  };

  if (Array.isArray(doc)) {
    // If it's an array of documents (e.g., from find())
    doc.forEach(processWalletData);
  } else {
    // If it's a single document (e.g., from findOne(), findById())
    processWalletData(doc);
  }
});

// Pre-save middleware to validate accountInfo against gameAccountTypes
orderSchema.pre('save', async function (next) {
  try {
    // Fetch the game document to get its accountInfoFields
    const game: GameDocument | null = await this.model('Game').findById(
      this.gameId,
    );

    if (!game) {
      const error = new Error('Game not found');
      return next(error);
    }

    // Extract valid field names for this game
    const validFieldNames = game.accountInfoFields.map(
      (field) => field.fieldName,
    );

    // Check for invalid fields in accountInfo
    const invalidFields: string[] = [];
    for (const info of this.accountInfo) {
      if (!validFieldNames.includes(info.fieldName)) {
        invalidFields.push(info.fieldName);
      }
    }

    // If there are invalid fields, throw an error
    if (invalidFields.length > 0) {
      const error = new Error(
        `Invalid account fields for this game: ${invalidFields.join(', ')}. Valid fields are: ${validFieldNames.join(', ')}`,
      );
      return next(error);
    }

    // Check each required field
    const missingFields: string[] = [];
    for (const field of game.accountInfoFields) {
      if (field.isRequired) {
        const fieldExists = this.accountInfo.some(
          (info: { fieldName: string; value: string }) =>
            info.fieldName === field.fieldName &&
            info.value &&
            info.value.trim() !== '',
        );
        if (!fieldExists) {
          missingFields.push(field.fieldName);
        }
      }
    }

    // If there are missing required fields, throw an error
    if (missingFields.length > 0) {
      const error = new Error(
        `Missing required account fields for this game: ${missingFields.join(', ')}`,
      );
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});
