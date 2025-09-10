# API تفاصيل الكوبون - التحليل الأمني

## نظرة عامة
تم إنشاء API جديد لجلب تفاصيل الكوبون للمستخدمين العاديين مع مراعاة جميع الاعتبارات الأمنية.

## الـ API الجديد

### Endpoint:
```
GET /coupon/details/:couponCode
```

### المثال:
```bash
GET /coupon/details/SAVE20
```

## التحليل الأمني

### ✅ المعلومات الآمنة المعروضة:

1. **معلومات أساسية:**
   - `code`: كود الكوبون (معلوم مسبقاً للمستخدم)
   - `name`: اسم الكوبون (للعرض)
   - `type`: نوع الخصم (percentage/fixed)
   - `value`: قيمة الخصم

2. **شروط الاستخدام:**
   - `minOrderAmount`: الحد الأدنى للطلب
   - `maxDiscount`: الحد الأقصى للخصم
   - `validFrom`: تاريخ البداية
   - `validTo`: تاريخ الانتهاء

3. **معلومات الحالة:**
   - `isActive`: حالة النشاط المحسوبة
   - `isUnlimited`: هل الكوبون غير محدود
   - `status.isValid`: صالح للاستخدام أم لا
   - `status.reason`: سبب عدم الصلاحية

### 🔒 المعلومات الحساسة المخفية:

1. **`usedCount`**: عدد مرات الاستخدام
   - **لماذا مخفي:** يمكن استخدامه لمعرفة شعبية الكوبون أو التلاعب
   - **البديل:** `isUnlimited` يوضح إذا كان محدود أم لا

2. **`usageLimit`**: الحد الأقصى للاستخدام
   - **لماذا مخفي:** معلومة تجارية حساسة
   - **البديل:** `status.isValid` يوضح إذا كان متاح للاستخدام

3. **`createdBy`**: منشئ الكوبون
   - **لماذا مخفي:** معلومة إدارية داخلية
   - **الأمان:** لا يجب كشف هوية المديرين

4. **`_id`**: معرف قاعدة البيانات
   - **لماذا مخفي:** يمكن استخدامه في هجمات enumeration
   - **البديل:** استخدام `couponCode` كمعرف

## الميزات الأمنية المطبقة

### 1. التحقق من النشاط
```typescript
const coupon = await this.couponRepository.findOne({
    code: couponCode.toUpperCase(),
    isActive: true  // فقط الكوبونات النشطة
});
```

### 2. التحقق من صلاحية التاريخ
```typescript
const now = new Date();
const validFrom = new Date(coupon.validFrom);
const validTo = new Date(coupon.validTo);
const isDateValid = now >= validFrom && now <= validTo;
```

### 3. التحقق من حد الاستخدام
```typescript
const isUsageLimitValid = coupon.usageLimit === -1 || coupon.usedCount < coupon.usageLimit;
```

### 4. حساب الحالة النهائية
```typescript
const safeDetails = {
    // ... معلومات آمنة
    isActive: coupon.isActive && isDateValid && isUsageLimitValid,
    status: {
        isValid: isDateValid && isUsageLimitValid && coupon.isActive,
        reason: // سبب واضح لعدم الصلاحية
    }
};
```

## حالات الاستخدام الآمنة

### 1. عرض تفاصيل الكوبون في الواجهة الأمامية
```javascript
// Frontend يمكنه عرض:
// - نوع وقيمة الخصم
// - الحد الأدنى للطلب
// - تاريخ الانتهاء
// - حالة الصلاحية
```

### 2. التحقق قبل تطبيق الكوبون
```javascript
// قبل إرسال الطلب، يمكن التحقق من:
// - هل الكوبون صالح؟
// - هل المبلغ يحقق الحد الأدنى؟
// - ما هو الخصم المتوقع؟
```

### 3. عرض رسائل خطأ واضحة
```javascript
if (!response.data.status.isValid) {
    showError(response.data.status.reason);
}
```

## مقارنة مع الـ APIs الموجودة

### API الإداري (getCouponById)
```typescript
// يتطلب صلاحيات Admin
@Roles([RoleTypes.ADMIN])
@UseGuards(AuthGuard, RolesGuard)
// يعرض جميع المعلومات بما في ذلك الحساسة
```

### API التحقق (validateCoupon)
```typescript
// يتطلب معلومات الطلب
@Post("validate")
// يحسب الخصم الفعلي
// لا يعرض تفاصيل الكوبون
```

### API التفاصيل الجديد (getCouponDetails)
```typescript
// لا يتطلب مصادقة
@Get("details/:couponCode")
// يعرض معلومات آمنة فقط
// مفيد لعرض التفاصيل قبل الاستخدام
```

## الاستجابة النموذجية

### كوبون صالح:
```json
{
  "success": true,
  "data": {
    "code": "SAVE20",
    "name": "خصم 20%",
    "type": "percentage",
    "value": 20,
    "minOrderAmount": 100,
    "maxDiscount": 50,
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTo": "2024-12-31T23:59:59.000Z",
    "isActive": true,
    "isUnlimited": false,
    "status": {
      "isValid": true,
      "reason": "Valid"
    }
  }
}
```

### كوبون منتهي الصلاحية:
```json
{
  "success": true,
  "data": {
    "code": "EXPIRED10",
    "name": "خصم منتهي",
    "type": "percentage",
    "value": 10,
    "minOrderAmount": 50,
    "maxDiscount": 25,
    "validFrom": "2023-01-01T00:00:00.000Z",
    "validTo": "2023-12-31T23:59:59.000Z",
    "isActive": false,
    "isUnlimited": true,
    "status": {
      "isValid": false,
      "reason": "Coupon is expired or not yet valid"
    }
  }
}
```

### كوبون غير موجود:
```json
{
  "success": false,
  "message": "Coupon not found"
}
```

## التوصيات الأمنية

### 1. Rate Limiting
```typescript
// يُنصح بإضافة rate limiting لمنع الـ brute force
@Throttle(10, 60) // 10 requests per minute
```

### 2. Input Validation
```typescript
// التحقق من صحة couponCode
@Param('couponCode', new ValidationPipe({
  transform: true,
  whitelist: true
}))
```

### 3. Logging
```typescript
// تسجيل محاولات الوصول للمراقبة
this.logger.log(`Coupon details requested: ${couponCode}`);
```

## الخلاصة

### ✅ الـ API آمن للاستخدام العام لأنه:
1. **لا يكشف معلومات حساسة** (usedCount, usageLimit, createdBy)
2. **يعرض معلومات مفيدة فقط** للمستخدم النهائي
3. **يطبق جميع قواعد التحقق** من الصلاحية
4. **يوفر معلومات واضحة** عن حالة الكوبون
5. **لا يتطلب مصادقة** مما يجعله سهل الاستخدام

### 🎯 حالات الاستخدام المناسبة:
- عرض تفاصيل الكوبون في صفحة المنتج
- التحقق من صلاحية الكوبون قبل الطلب
- عرض معلومات الخصم في سلة التسوق
- إظهار رسائل خطأ واضحة للمستخدم

الـ API جاهز للاستخدام في الإنتاج بأمان تام.