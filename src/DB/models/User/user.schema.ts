import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateHash } from 'src/commen/security/hash';
import * as CryptoJS from 'crypto-js';
import { IAttachments } from 'src/commen/multer/cloud.service';
export enum RoleTypes {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'superAdmin',
}
export enum SystemRoles {
  SYSTEM = 'system',
  GOOGLE = 'google',
}
@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  userName: string;
  @Prop({ type: String, unique: true, required: true })
  email: string;
  @Prop({
    type: String,
    required: function () {
      return this.provider !== SystemRoles.GOOGLE;
    },
  })
  password: string;
  @Prop({
    type: String,
    required: function () {
      return this.provider !== SystemRoles.GOOGLE;
    },
  })
  phone: string;
  @Prop({ type: String })
  code: string | undefined;
  @Prop({ type: String, enum: RoleTypes, default: 'user' })
  role: string;
  @Prop({ type: String, enum: SystemRoles, default: 'system' })
  provider: string;
  @Prop({ type: Boolean })
  isConfirm: boolean;
  @Prop({ type: Boolean })
  isDeleted: boolean;
  @Prop({ type: Number, default: 0 })
  points: number;
  @Prop({ type: Date })
  isDeletedAt: Date;
  @Prop({ type: Date })
  codeExpiration: Date;
  @Prop(
    raw({
      secure_url: { type: String, required: false },
      public_id: { type: String },
    }),
  )
  profileImage: { secure_url: string } | IAttachments;
}

// schema

export const userSchema = SchemaFactory.createForClass(User);
userSchema.pre('save', function (next) {
  if (this.isModified('password')) this.password = generateHash(this.password);
  if (this.isModified('phone') && this.phone) {
    if (!process.env.PHONE_ENC) {
      return next(new Error('PHONE_ENC environment variable is not defined.'));
    }
    try {
      const encrypted = CryptoJS.AES.encrypt(
        this.phone,
        process.env.PHONE_ENC,
      ).toString();
      this.phone = encrypted;
    } catch (error) {
      return next(error); // Stop save if encryption fails
    }
  }
  next();
});
// user type

// --- Post-find hook for decryption ---
userSchema.post(['find', 'findOne', 'findById'] as any, function (doc) {
  // 'doc' can be a single document or an array of documents
  const decryptSingleDoc = (singleDoc: any) => {
    if (singleDoc && singleDoc.phone) {
      if (!process.env.PHONE_ENC) {
        singleDoc.phone = null;
        return;
      }
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(
          singleDoc.phone,
          process.env.PHONE_ENC,
        );
        singleDoc.phone = decryptedBytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        // Optionally set phone to null or an empty string if decryption fails
        singleDoc.phone = null;
      }
    }
  };

  if (Array.isArray(doc)) {
    // If it's an array of documents (e.g., from find())
    doc.forEach(decryptSingleDoc);
  } else {
    // If it's a single document (e.g., from findOne(), findById())
    decryptSingleDoc(doc);
  }
});
export type TUser = HydratedDocument<User>;
