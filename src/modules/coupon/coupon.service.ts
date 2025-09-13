import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponRepository } from 'src/DB/models/Coupon/coupon.repository';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateCouponDTO,
  UpdateCouponDTO,
  ValidateCouponDTO,
  ParamCouponDTO,
  QueryCouponDTO,
} from './dto';
import { CouponType, TCoupon } from 'src/DB/models/Coupon/coupon.schema';
import { FilterQuery } from 'mongoose';

@Injectable()
export class CouponService {
  constructor(public readonly couponRepository: CouponRepository) {}

  private parseDateFlexible(dateStr: string): Date {
    // يدعم MM/DD/YYYY و DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      // إذا اليوم أكبر من 12، غالباً DD/MM/YYYY
      if (a > 12) return new Date(c, b - 1, a);
      // إذا الشهر أكبر من 12، غالباً MM/DD/YYYY
      if (b > 12) return new Date(c, a - 1, b);
      // لو الاثنين <= 12، اعتبرها MM/DD/YYYY (أشهر الاستخدام)
      return new Date(c, a - 1, b);
    }
    // fallback: ISO or Date string
    return new Date(dateStr);
  }

  async createCoupon(admin: TUser, body: CreateCouponDTO) {
    // Check if coupon code already exists
    const existingCoupon = await this.couponRepository.findOne({
      code: body.code.toUpperCase(),
    });
    if (existingCoupon) {
      throw new BadRequestException('Coupon code already exists');
    }

    // Accept both ISO and DMY formats
    let validFrom: Date;
    let validTo: Date;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(body.validFrom)) {
      validFrom = this.parseDateFlexible(body.validFrom);
    } else {
      validFrom = new Date(body.validFrom);
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(body.validTo)) {
      validTo = this.parseDateFlexible(body.validTo);
    } else {
      validTo = new Date(body.validTo);
    }

    if (validFrom >= validTo) {
      throw new BadRequestException(
        'Valid from date must be before valid to date',
      );
    }

    if (validFrom < new Date()) {
      throw new BadRequestException('Valid from date cannot be in the past');
    }

    // Validate value based on type
    if (body.type === CouponType.PERCENTAGE && body.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100%');
    }

    const coupon = await this.couponRepository.create({
      ...body,
      code: body.code.toUpperCase(),
      createdBy: admin._id,
      validFrom,
      validTo,
    });

    return { success: true, data: coupon };
  }

  async updateCoupon(
    admin: TUser,
    params: ParamCouponDTO,
    body: UpdateCouponDTO,
  ) {
    const coupon = await this.couponRepository.findById(params.couponId);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // If updating code, check if it already exists
    if (body.code) {
      const existingCoupon = await this.couponRepository.findOne({
        code: body.code.toUpperCase(),
        _id: { $ne: params.couponId },
      });
      if (existingCoupon) {
        throw new BadRequestException('Coupon code already exists');
      }
      body.code = body.code.toUpperCase();
    }

    // Validate dates if provided
    if (body.validFrom || body.validTo) {
      const validFrom = body.validFrom
        ? new Date(body.validFrom)
        : coupon.validFrom;
      const validTo = body.validTo ? new Date(body.validTo) : coupon.validTo;

      if (validFrom >= validTo) {
        throw new BadRequestException(
          'Valid from date must be before valid to date',
        );
      }
    }

    // Validate value based on type
    if (body.type === CouponType.PERCENTAGE && body.value && body.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100%');
    }

    await this.couponRepository.updateOne({ _id: params.couponId }, body);

    return { success: true, message: 'Coupon updated successfully' };
  }

  async deleteCoupon(admin: TUser, params: ParamCouponDTO) {
    const coupon = await this.couponRepository.findById(params.couponId);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.couponRepository.findByIdAndDelete(
      params.couponId.toString(),
      {},
    );

    return { success: true, message: 'Coupon deleted successfully' };
  }

  async getAllCoupons(query: QueryCouponDTO) {
    const filter: FilterQuery<TCoupon> = {};

    if (query.code) {
      filter.code = { $regex: query.code.toUpperCase(), $options: 'i' };
    }

    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const data = await this.couponRepository.find(
      filter,
      { select: '' },
      { sort: query.sort || { createdAt: -1 } },
    );

    return { success: true, data };
  }

  async getCouponById(params: ParamCouponDTO) {
    const coupon = await this.couponRepository.findById(params.couponId);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return { success: true, data: coupon };
  }

  /**
   * الحصول على الكوبون بواسطة ObjectId مباشرة (للاستخدام الداخلي)
   */
  async getCouponByObjectId(couponId: any) {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  /**
   * الحصول على تفاصيل الكوبون للمستخدمين العاديين (معلومات آمنة فقط)
   */
  async getCouponDetails(couponCode: string) {
    const coupon = await this.couponRepository.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // التحقق من صلاحية التاريخ
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validTo = new Date(coupon.validTo);
    const isDateValid = now >= validFrom && now <= validTo;

    // التحقق من حد الاستخدام
    const isUsageLimitValid =
      coupon.usageLimit === -1 || coupon.usedCount < coupon.usageLimit;

    // إرجاع المعلومات الآمنة فقط
    const safeDetails = {
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      isActive: coupon.isActive && isDateValid && isUsageLimitValid,
      isUnlimited: coupon.usageLimit === -1,
      // معلومات إضافية مفيدة للمستخدم
      status: {
        isValid: isDateValid && isUsageLimitValid && coupon.isActive,
        reason: !coupon.isActive
          ? 'Coupon is inactive'
          : !isDateValid
            ? 'Coupon is expired or not yet valid'
            : !isUsageLimitValid
              ? 'Coupon usage limit exceeded'
              : 'Valid',
      },
    };

    return { success: true, data: safeDetails };
  }

  async validateCoupon(body: ValidateCouponDTO) {
    const coupon = await this.couponRepository.findOne({
      code: body.code.toUpperCase(),
      isActive: true,
    });
    console.log(body);
    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    // Check if coupon is within valid date range
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validTo = new Date(coupon.validTo);
    if (now < validFrom || now > validTo) {
      throw new BadRequestException('Coupon is not valid at this time');
    }

    // Check usage limit
    if (coupon.usageLimit !== -1 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    // Check minimum order amount
    if (body.orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount is ${coupon.minOrderAmount}`,
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (body.orderAmount * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    // Apply maximum discount limit
    if (discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    // Ensure discount doesn't exceed order amount
    if (discountAmount > body.orderAmount) {
      discountAmount = body.orderAmount;
    }

    return {
      success: true,
      data: {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
        },
        discountAmount,
        finalAmount: body.orderAmount - discountAmount,
      },
    };
  }

  async applyCoupon(couponId: string) {
    // Increment usage count
    await this.couponRepository.updateOne(
      { _id: couponId },
      { $inc: { usedCount: 1 } },
    );
  }
}
