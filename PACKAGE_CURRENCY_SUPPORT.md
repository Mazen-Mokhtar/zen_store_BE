# دعم العملة في نظام الحزم

## نظرة عامة
تم تحديث نظام الحزم لدعم تحديد العملة لكل حزمة، مما يوفر مرونة أكبر في إدارة الأسعار وتحسين تجربة المستخدم مع دعم العملات المختلفة.

## التحديثات المطبقة

### 1. تحديث Package Schema
**الملف:** `src/DB/models/Packages/packages.schema.ts`

```typescript
@Prop({ type: String, enum: Currency, required: true, default: Currency.EGP })
currency: Currency;
```

**التغييرات:**
- تحديث حقل `currency` من `string` إلى `Currency` enum
- جعل الحقل مطلوب مع قيمة افتراضية `EGP`
- استيراد `Currency` من `game.schema.ts`

### 2. تحديث Package DTOs
**الملف:** `src/modules/SuperAdmin/packages/dto/index.ts`

```typescript
@IsEnum(Currency)
@IsOptional()
currency?: Currency;
```

**التغييرات:**
- تحديث حقل `currency` من `@IsString()` إلى `@IsEnum(Currency)`
- جعل الحقل اختياري في `CreatePackageDto`
- استيراد `Currency` enum و `IsEnum` validator
- دعم تحديث العملة في `UpdatePackageDto`

### 3. تحديث Package Service
**الملف:** `src/modules/SuperAdmin/packages/packages.service.ts`

#### في دالة `createPackage`:
```typescript
return await this.packageRepository.create({ 
    ...body, 
    currency: body.currency || Currency.EGP, // استخدام العملة المرسلة أو EGP كافتراضي
    image,
    createdBy: user._id 
});
```

#### في دالة `updatePackage`:
```typescript
Object.assign(packageDoc, {
    ...body,
    currency: body.currency || packageDoc.currency || Currency.EGP // استخدام العملة المرسلة أو الحالية أو EGP كافتراضي
});
```

**التغييرات:**
- إضافة منطق تعيين العملة الافتراضية `EGP`
- الحفاظ على العملة الحالية عند التحديث
- استيراد `Currency` enum

## الميزات الجديدة

### 1. مرونة في التسعير
- كل حزمة يمكن أن تحمل عملتها الخاصة
- دعم العملات الإقليمية المختلفة (EGP, USD, EUR, SAR, AED)
- سهولة إدارة الأسعار للأسواق المختلفة

### 2. تجربة مستخدم محسنة
- عرض السعر مع العملة المناسبة
- وضوح أكبر في المعلومات المالية
- دعم أفضل للمستخدمين الدوليين

### 3. إدارة متقدمة
- إمكانية تحديد العملة عند إنشاء الحزمة
- تحديث العملة للحزم الموجودة
- الحفاظ على التوافق مع البيانات الحالية

## أمثلة الاستخدام

### إنشاء حزمة بعملة محددة
```json
{
  "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "title": "حزمة الذهب",
  "price": 49.99,
  "currency": "USD",
  "isActive": true
}
```

### إنشاء حزمة بالعملة الافتراضية
```json
{
  "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "title": "حزمة الفضة",
  "price": 150,
  "isActive": true
  // سيتم تعيين currency: "EGP" تلقائياً
}
```

### تحديث عملة حزمة موجودة
```json
{
  "currency": "SAR",
  "price": 185
}
```

## استجابة API

### عرض تفاصيل الحزمة
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "حزمة الذهب",
    "price": 49.99,
    "currency": "USD",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## ملاحظات التوافق

### للحزم الموجودة
- الحزم الموجودة ستحصل على EGP كعملة افتراضية
- لا تأثير على الحزم المكتملة أو المباعة
- يمكن تحديث العملة للحزم الموجودة

### للتطبيقات الأمامية
- يمكن إضافة حقل العملة في نماذج إنشاء الحزم
- الحقل اختياري، لذا لن يؤثر على التطبيقات الحالية
- يجب عرض العملة مع السعر في واجهة المستخدم

### للطلبات والدفع
- الطلبات ستستخدم عملة الحزمة المحددة
- بوابات الدفع ستتلقى العملة الصحيحة
- دعم كامل لجميع طرق الدفع

## الملفات المحدثة

1. **Package Schema** (`src/DB/models/Packages/packages.schema.ts`)
   - تحديث حقل `currency` إلى `Currency` enum
   - تعيين EGP كعملة افتراضية

2. **Package DTOs** (`src/modules/SuperAdmin/packages/dto/index.ts`)
   - إضافة `Currency` enum validation
   - جعل الحقل اختياري في DTOs

3. **Package Service** (`src/modules/SuperAdmin/packages/packages.service.ts`)
   - منطق تعيين العملة الافتراضية
   - دعم تحديث العملة
   - استيراد `Currency` enum

## التكامل مع الأنظمة الأخرى

### مع نظام الطلبات
- الطلبات تستخدم عملة الحزمة تلقائياً
- دعم كامل في `order.service.ts`
- عرض العملة في تفاصيل الطلب

### مع نظام الألعاب
- تناسق في استخدام `Currency` enum
- دعم موحد للعملات عبر النظام
- سهولة الإدارة والصيانة

### مع بوابات الدفع
- إرسال العملة الصحيحة لبوابات الدفع
- دعم Stripe وجميع بوابات الدفع الأخرى
- تحسين دقة المعاملات المالية

## الخلاصة

النظام الآن يدعم بشكل كامل تحديد العملة لكل حزمة، مما يوفر:
- **مرونة أكبر** في إدارة الأسعار
- **تجربة مستخدم محسنة** مع عرض واضح للعملات
- **دعم دولي** للأسواق المختلفة
- **توافق كامل** مع النظام الحالي
- **تكامل سلس** مع أنظمة الطلبات والدفع

جميع التحديثات تم تطبيقها بعناية للحفاظ على استقرار النظام وضمان التوافق مع البيانات الموجودة.