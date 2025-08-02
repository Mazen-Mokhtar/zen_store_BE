import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { GameDocument } from "../Game/game.schema";
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
}
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Package', required: true })
  packageId: Types.ObjectId;

  @Prop({ type: [{ fieldName: String, value: String }], required: true })
  accountInfo: { fieldName: string; value: string }[];

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: string;

  @Prop({ type: Boolean, default: false })
  isReviewed: boolean;

  @Prop({ type: String })
  adminNote: string;

  @Prop({ type: String, required: true })
  paymentMethod: string;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}


export const orderSchema = SchemaFactory.createForClass(Order)

export type OrderDocument = HydratedDocument<Order>
// Pre-save middleware to validate accountInfo against gameAccountTypes
orderSchema.pre('save', async function (next) {
  try {
    // Fetch the game document to get its accountInfoFields
    const game : GameDocument | null = await this.model('Game').findById(this.gameId) ;

    if (!game) {
      const error = new Error('Game not found');
      return next(error);
    }

    // Extract valid field names for this game
    const validFieldNames = game.accountInfoFields.map(field => field.fieldName);

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
        `Invalid account fields for this game: ${invalidFields.join(', ')}. Valid fields are: ${validFieldNames.join(', ')}`
      );
      return next(error);
    }

    // Check each required field
    const missingFields: string[] = [];
    for (const field of game.accountInfoFields) {
      if (field.isRequired) {
        const fieldExists = this.accountInfo.some(
          (info: { fieldName: string; value: string }) =>
            info.fieldName === field.fieldName && info.value && info.value.trim() !== ''
        );
        if (!fieldExists) {
          missingFields.push(field.fieldName);
        }
      }
    }

    // If there are missing required fields, throw an error
    if (missingFields.length > 0) {
      const error = new Error(
        `Missing required account fields for this game: ${missingFields.join(', ')}`
      );
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});
