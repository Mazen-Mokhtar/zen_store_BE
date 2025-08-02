# Game Type and Price System

تم إضافة نظام النوع والسعر للعاب، حيث أن العاب Steam تتطلب سعراً إجبارياً.

## الأنواع المتاحة

- `steam` - للعاب Steam (تتطلب سعراً إجبارياً)
- `games` - للألعاب العامة (لا تتطلب سعراً)
- `subscription` - للاشتراكات (لا تتطلب سعراً)

## قواعد النظام

### للعاب Steam:
- **السعر إجباري** ويجب أن يكون أكبر من 0
- إذا لم يتم إدخال السعر أو كان 0، سيتم رفض الطلب

### للعاب أخرى:
- السعر اختياري
- يمكن ترك السعر فارغاً

## API Endpoints

### إنشاء لعبة جديدة

```json
POST /game
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Counter-Strike 2",
  "description": "لعبة إطلاق نار تنافسية",
  "type": "steam",
  "price": 29.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Steam Username",
      "isRequired": true
    },
    {
      "fieldName": "Steam Password", 
      "isRequired": true
    }
  ]
}
```

### تحديث لعبة

```json
PUT /game/:gameId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Counter-Strike 2 Updated",
  "type": "steam",
  "price": 39.99
}
```

### حذف لعبة

```json
DELETE /game/:gameId
Authorization: Bearer <token>
```

### البحث في العاب

```json
GET /game?categoryId=64f8a1b2c3d4e5f6a7b8c9d0&type=steam&page=1&limit=10
```

### الحصول على لعبة واحدة

```json
GET /game/:gameId
```

## أمثلة على الاستخدام

### لعبة Steam (مع سعر)
```json
{
  "name": "Dota 2",
  "description": "لعبة MOBA شهيرة",
  "type": "steam",
  "price": 0,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

### لعبة عادية (بدون سعر)
```json
{
  "name": "Minecraft",
  "description": "لعبة بناء وإبداع",
  "type": "games",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

### اشتراك (بدون سعر)
```json
{
  "name": "Netflix Premium",
  "description": "اشتراك Netflix المميز",
  "type": "subscription",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

## رسائل الخطأ

### خطأ: السعر مطلوب للعاب Steam
```json
{
  "statusCode": 400,
  "message": "Price is required and must be greater than 0 for Steam games"
}
```

### خطأ: اللعبة غير موجودة
```json
{
  "statusCode": 404,
  "message": "Game not found"
}
```

## ملاحظات مهمة

1. **التحقق التلقائي**: النظام يتحقق تلقائياً من وجود السعر للعاب Steam
2. **التحديث**: عند تحديث نوع اللعبة إلى Steam، يجب إدخال السعر
3. **البحث**: يمكن البحث في العاب حسب النوع باستخدام `?type=steam`
4. **الحماية**: جميع عمليات الإنشاء والتحديث والحذف تتطلب صلاحيات Admin
5. **التوافق**: النظام متوافق مع البيانات الموجودة 