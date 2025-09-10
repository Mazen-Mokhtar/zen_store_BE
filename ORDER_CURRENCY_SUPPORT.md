# دعم العملة في نظام الطلبات

## نظرة عامة
تم تحديث نظام الطلبات لدعم تحديد العملة في الطلبات، خاصة للطلبات التي تستخدم طريقة الدفع بالكارت. يتيح هذا التحديث للمستخدمين تحديد العملة المفضلة لديهم، مع استخدام الجنيه المصري (EGP) كعملة افتراضية.

## التحديثات المطبقة

### 1. تحديث Order Schema
**الملف:** `src/DB/models/Order/order.schema.ts`

```typescript
@Prop({ type: String, enum: Currency, required: true, default: Currency.EGP })
currency: Currency;
```

**التغييرات:**
- إضافة حقل `currency` من نوع `Currency` enum
- جعل الحقل مطلوب مع قيمة افتراضية `EGP`
- استيراد `Currency` من `game.schema.ts`

### 2. تحديث CreateOrderDTO
**الملف:** `src/modules/order/dto/index.ts`

```typescript
@IsEnum(Currency)
@IsOptional()
currency?: Currency;
```

**التغييرات:**
- إضافة حقل `currency` اختياري
- استخدام validation للتأكد من صحة العملة
- استيراد `Currency` enum

### 3. تحديث Order Service
**الملف:** `src/modules/order/order.service.ts`

#### في دالة `createOrder`:
```typescript
const orderData: any = {
    // ... باقي الحقول
    currency: body.currency || Currency.EGP, // استخدام العملة المرسلة أو EGP كافتراضي
    // ... باقي الحقول
};
```

#### في دالة `checkout`:
```typescript
// استخدام العملة من الطلب مع EGP كقيمة افتراضية
const currency = (order.currency || 'EGP').toLowerCase();
```

**التغييرات:**
- حفظ العملة المحددة من المستخدم أو استخدام EGP كافتراضي
- استخدام عملة الطلب في بوابة الدفع Stripe
- إزالة الاعتماد على عملة الـ package أو اللعبة في تحديد عملة الدفع

## الميزات الجديدة

### 1. مرونة في تحديد العملة
- يمكن للمستخدمين تحديد العملة المفضلة عند إنشاء الطلب
- دعم جميع العملات المتاحة في النظام (USD, EUR, EGP, إلخ)

### 2. عملة افتراضية ذكية
- استخدام EGP كعملة افتراضية إذا لم يحدد المستخدم عملة
- ضمان وجود عملة صالحة لكل طلب

### 3. تكامل مع بوابات الدفع
- استخدام عملة الطلب المحددة في Stripe
- دعم العملات المختلفة في المعاملات المالية

## أمثلة الاستخدام

### إنشاء طلب بعملة محددة
```json
{
  "gameId": "64a1b2c3d4e5f6789012345",
  "packageId": "64a1b2c3d4e5f6789012346",
  "accountInfo": [
    {"fieldName": "email", "value": "user@example.com"}
  ],
  "paymentMethod": "card",
  "currency": "USD"
}
```

### إنشاء طلب بدون تحديد عملة (سيستخدم EGP)
```json
{
  "gameId": "64a1b2c3d4e5f6789012345",
  "packageId": "64a1b2c3d4e5f6789012346",
  "accountInfo": [
    {"fieldName": "email", "value": "user@example.com"}
  ],
  "paymentMethod": "card"
}
```

## استجابة API

عند إنشاء طلب، ستتضمن الاستجابة معلومات العملة:

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012347",
    "userId": "64a1b2c3d4e5f6789012348",
    "gameId": "64a1b2c3d4e5f6789012345",
    "totalAmount": 100,
    "currency": "EGP",
    "paymentMethod": "card",
    "status": "pending"
  }
}
```

## ملاحظات التوافق

### للطلبات الموجودة
- الطلبات الموجودة ستحصل على EGP كعملة افتراضية
- لا تأثير على الطلبات المكتملة

### للتطبيقات الأمامية
- يمكن إضافة حقل العملة في نماذج إنشاء الطلبات
- الحقل اختياري، لذا لن يؤثر على التطبيقات الحالية

## الملفات المحدثة

1. **Order Schema** (`src/DB/models/Order/order.schema.ts`)
   - إضافة حقل `currency`
   - استيراد `Currency` enum

2. **Order DTO** (`src/modules/order/dto/index.ts`)
   - إضافة `currency` في `CreateOrderDTO`
   - إضافة validation مناسب

3. **Order Service** (`src/modules/order/order.service.ts`)
   - تحديث `createOrder` لحفظ العملة
   - تحديث `checkout` لاستخدام عملة الطلب
   - استيراد `Currency` enum

## الخلاصة

النظام الآن يدعم بشكل كامل تحديد العملة في الطلبات، مما يوفر:
- **مرونة أكبر** للمستخدمين في اختيار العملة
- **تجربة دفع محسنة** مع العملة المفضلة
- **دعم دولي** للأسواق المختلفة
- **توافق كامل** مع النظام الحالي

جميع التحديثات تم تطبيقها بعناية للحفاظ على استقرار النظام وضمان التوافق مع البيانات الموجودة.