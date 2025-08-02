# Steam Game Offer System

تم إضافة نظام الـ offer للعاب Steam، حيث يمكن إضافة عروض خاصة للعاب Steam فقط.

## قواعد النظام

### للعاب Steam:
- **السعر إجباري** ويجب أن يكون أكبر من 0
- **الـ offer اختياري** ولكن إذا تم تفعيله، يجب إدخال:
  - `originalPrice` - السعر الأصلي (يجب أن يكون أكبر من 0)
  - `finalPrice` - السعر النهائي بعد الخصم (يجب أن يكون أقل من السعر الأصلي)
- **نسبة الخصم** تُحسب تلقائياً

### للعاب أخرى:
- لا يمكن إضافة offer للعاب غير Steam
- إذا تم محاولة إضافة offer، سيتم تجاهله تلقائياً

## الحقول الجديدة

### في Game Schema:
```typescript
isOffer?: boolean;              // هل اللعبة لديها عرض
originalPrice?: number;         // السعر الأصلي
finalPrice?: number;            // السعر النهائي بعد الخصم
discountPercentage?: number;    // نسبة الخصم (تُحسب تلقائياً)
```

## API Examples

### إضافة لعبة Steam بدون offer

```json
POST /game/dashboard
{
  "name": "Counter-Strike 2",
  "description": "لعبة إطلاق نار تنافسية",
  "type": "steam",
  "price": 29.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "isOffer": false
}
```

### إضافة لعبة Steam مع offer

```json
POST /game/dashboard
{
  "name": "Dota 2",
  "description": "لعبة MOBA شهيرة",
  "type": "steam",
  "price": 0,
  "isOffer": true,
  "originalPrice": 29.99,
  "finalPrice": 19.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Steam Username",
      "isRequired": true
    }
  ]
}
```

### تحديث لعبة Steam لإضافة offer

```json
PUT /game/dashboard/:gameId
{
  "isOffer": true,
  "originalPrice": 39.99,
  "finalPrice": 24.99
}
```

### إزالة offer من لعبة Steam

```json
PUT /game/dashboard/:gameId
{
  "isOffer": false
}
```

### البحث في العاب Steam التي لديها offer

```json
GET /game/dashboard?type=steam&isOffer=true
```

### البحث في جميع العاب التي لديها offer

```json
GET /game/dashboard?isOffer=true
```

## حساب نسبة الخصم

النظام يحسب نسبة الخصم تلقائياً باستخدام المعادلة:

```
discountPercentage = ((originalPrice - finalPrice) / originalPrice) * 100
```

### مثال:
- السعر الأصلي: 29.99
- السعر النهائي: 19.99
- نسبة الخصم: ((29.99 - 19.99) / 29.99) * 100 = 33.34%

## Validation Rules

### للعاب Steam مع offer:
1. `isOffer` يجب أن يكون `true`
2. `originalPrice` يجب أن يكون أكبر من 0
3. `finalPrice` يجب أن يكون أكبر من 0
4. `finalPrice` يجب أن يكون أقل من `originalPrice`
5. `discountPercentage` اختياري (يُحسب تلقائياً)

### للعاب Steam بدون offer:
1. `isOffer` يجب أن يكون `false` أو غير محدد
2. حقول الـ offer ستكون `undefined`

### للعاب غير Steam:
1. لا يمكن إضافة offer
2. إذا تم محاولة إضافة offer، سيتم تجاهله تلقائياً

## رسائل الخطأ

### خطأ: السعر النهائي مطلوب للعرض
```json
{
  "statusCode": 400,
  "message": "Final price must be provided and greater than 0 for an offer"
}
```

### خطأ: السعر الأصلي مطلوب للعرض
```json
{
  "statusCode": 400,
  "message": "Original price must be provided and greater than 0 for an offer"
}
```

### خطأ: السعر النهائي يجب أن يكون أقل من السعر الأصلي
```json
{
  "statusCode": 400,
  "message": "Final price must be less than original price for an offer"
}
```

## أمثلة على الاستخدام

### لعبة Steam مع خصم 50%
```json
{
  "name": "Grand Theft Auto V",
  "description": "لعبة عالم مفتوح",
  "type": "steam",
  "price": 0,
  "isOffer": true,
  "originalPrice": 59.99,
  "finalPrice": 29.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

### لعبة Steam مع خصم 25%
```json
{
  "name": "Red Dead Redemption 2",
  "description": "لعبة مغامرات غربية",
  "type": "steam",
  "price": 0,
  "isOffer": true,
  "originalPrice": 79.99,
  "finalPrice": 59.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

## ملاحظات مهمة

1. **الـ offer للعاب Steam فقط**: لا يمكن إضافة offer للعاب غير Steam
2. **الحساب التلقائي**: نسبة الخصم تُحسب تلقائياً ولا تحتاج إدخالها
3. **التحديث التلقائي**: عند إزالة الـ offer، جميع حقول الـ offer تُمسح تلقائياً
4. **البحث**: يمكن البحث في العاب حسب وجود الـ offer
5. **التوافق**: النظام متوافق مع البيانات الموجودة
6. **الحماية**: جميع العمليات تتطلب صلاحيات SuperAdmin 